import { createSatrec, createSatrecFromOmm } from '../engine/propagator.js'
import { classifySatellite } from './categories.js'
import { DEFAULT_CATALOG_ID, getCatalog } from './catalogs.js'

export const CACHE_KEY = 'orbitview_orbital_data_v2'
const CACHE_TTL_MS = 2 * 60 * 60 * 1000 // 2 hours
const FETCH_TIMEOUT_MS = 10_000
let currentFeedStatus = null

// CelesTrak: use smaller group queries instead of GROUP=active (avoids bandwidth limits).
// In dev, route through Vite proxy to avoid CORS on localhost.
const CELESTRAK_BASE = import.meta.env.DEV
  ? '/celestrak/NORAD/elements/gp.php'
  : 'https://celestrak.org/NORAD/elements/gp.php'

const OMM_REQUIRED_NUMERIC_FIELDS = [
  'NORAD_CAT_ID',
  'MEAN_MOTION',
  'ECCENTRICITY',
  'INCLINATION',
  'RA_OF_ASC_NODE',
  'ARG_OF_PERICENTER',
  'MEAN_ANOMALY',
  'BSTAR',
]

function isUsableOmmRecord(rec) {
  return Boolean(rec.EPOCH) && OMM_REQUIRED_NUMERIC_FIELDS.every(
    field => Number.isFinite(Number(rec[field]))
  )
}

// Normalize TLE API record shape → CelesTrak OMM shape (so parseTLEData handles both)
function normalizeTLEApiRecord(rec) {
  return {
    OBJECT_NAME: rec.name,
    NORAD_CAT_ID: String(rec.satelliteId),
    EPOCH: rec.date,
    TLE_LINE1: rec.line1,
    TLE_LINE2: rec.line2,
  }
}

function parseEpoch(value) {
  if (value instanceof Date) return new Date(value.getTime())
  if (typeof value !== 'string') return new Date(value)

  const text = value.trim()
  if (!text) return new Date(NaN)

  // CelesTrak OMM EPOCH values are UTC when no offset is supplied. Appending
  // Z avoids interpreting them in the browser's local timezone.
  return new Date(/(?:[zZ]|[+-]\d{2}:?\d{2})$/.test(text) ? text : `${text}Z`)
}

function epochFromTleSatrec(satrec, fallback) {
  const jd = Number(satrec?.jdsatepoch)
  const jdFraction = Number(satrec?.jdsatepochF)
  if (Number.isFinite(jd)) {
    const fullJd = jd + (Number.isFinite(jdFraction) ? jdFraction : 0)
    return new Date((fullJd - 2440587.5) * 86400000)
  }
  return parseEpoch(fallback)
}

async function fetchJsonWithTimeout(url) {
  const controller = new AbortController()
  let timer
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      controller.abort()
      reject(new Error(`Request timed out after ${FETCH_TIMEOUT_MS / 1000} seconds`))
    }, FETCH_TIMEOUT_MS)
  })
  try {
    const response = await Promise.race([
      fetch(url, { signal: controller.signal }),
      timeout,
    ])
    if (!response.ok) return { response, data: null }
    const data = await Promise.race([response.json(), timeout])
    return { response, data }
  } catch (err) {
    if (err?.name === 'AbortError' || controller.signal.aborted) {
      throw new Error(`Request timed out after ${FETCH_TIMEOUT_MS / 1000} seconds`)
    }
    throw err
  } finally {
    clearTimeout(timer)
  }
}

export function parseTLEData(rawRecords, metadata = {}) {
  if (!Array.isArray(rawRecords)) return []
  const results = []
  for (const rec of rawRecords) {
    if (!rec || typeof rec !== 'object' || typeof rec.OBJECT_NAME !== 'string' || !rec.OBJECT_NAME.trim()) continue
    const line1 = rec.TLE_LINE1
    const line2 = rec.TLE_LINE2
    const format = line1 && line2 ? 'TLE' : 'OMM'
    if (format === 'OMM' && !isUsableOmmRecord(rec)) continue
    let satrec
    try {
      satrec = format === 'TLE'
        ? createSatrec(line1.trim(), line2.trim())
        : createSatrecFromOmm(rec)
    } catch {
      continue
    }
    if (satrec.error !== 0) continue

    const satnum = typeof satrec.satnum === 'number' ? satrec.satnum : parseInt(satrec.satnum, 10)
    if (!Number.isFinite(satnum)) continue

    const noradId = parseInt(rec.NORAD_CAT_ID, 10)
    const epoch = format === 'TLE'
      ? epochFromTleSatrec(satrec, rec.EPOCH)
      : parseEpoch(rec.EPOCH)
    if (!Number.isFinite(noradId) || Number.isNaN(epoch.getTime())) continue

    results.push({
      name: rec.OBJECT_NAME,
      noradId,
      satrec,
      epoch,
      category: classifySatellite({ name: rec.OBJECT_NAME, noradId }),
      elementFormat: format,
      dataSource: metadata.source ?? 'Unknown',
      catalogLabel: metadata.catalogLabel ?? 'Unknown',
    })
  }
  return results
}

function parseOrThrow(rawRecords, metadata) {
  const parsed = parseTLEData(rawRecords, metadata)
  if (parsed.length === 0) {
    throw new Error(`${metadata.source} returned records, but none contained usable orbital elements`)
  }
  return parsed
}

// TLE API — CORS-friendly, no auth. Paginated at 100/page.
// Fetches numPages pages for an initial load of ~500 satellites.
async function fetchTLEApi(numPages = 5) {
  const allRaw = []
  for (let page = 1; page <= numPages; page++) {
    const { response: res, data: json } = await fetchJsonWithTimeout(
      `https://tle.ivanstanojevic.me/api/tle/?page=${page}&page-size=100`
    )
    if (!res.ok) throw new Error(`TLE API HTTP ${res.status}`)
    const members = json.member ?? []
    allRaw.push(...members.filter(rec => rec && typeof rec === 'object').map(normalizeTLEApiRecord))
    if (members.length < 100) break // reached last page
  }
  if (allRaw.length === 0) throw new Error('TLE API returned no records')
  return allRaw
}

// CelesTrak — fetch multiple small groups instead of GROUP=active.
// Deduplicates by NORAD ID across groups.
async function fetchCelesTrakGroups(groups, limit = Infinity) {
  const allRaw = []
  const seen = new Set()
  const failedGroups = []
  for (const group of groups) {
    try {
      const { response: res, data } = await fetchJsonWithTimeout(`${CELESTRAK_BASE}?GROUP=${group}&FORMAT=json`)
      if (!res.ok) {
        failedGroups.push(group)
        continue
      }
      if (!Array.isArray(data)) {
        failedGroups.push(group)
        continue
      }
      for (const rec of data) {
        if (!rec || typeof rec !== 'object' || typeof rec.OBJECT_NAME !== 'string' || !rec.OBJECT_NAME.trim()) continue
        if (!seen.has(rec.NORAD_CAT_ID)) {
          seen.add(rec.NORAD_CAT_ID)
          allRaw.push(rec)
          if (allRaw.length >= limit) return { records: allRaw, failedGroups }
        }
      }
    } catch {
      failedGroups.push(group)
    }
  }
  if (allRaw.length === 0) throw new Error('All CelesTrak groups failed')
  return { records: allRaw, failedGroups }
}

function getCatalogCacheKey(catalogId) {
  return `${CACHE_KEY}_${catalogId}`
}

function loadFromCache(catalogId) {
  try {
    const raw = localStorage.getItem(getCatalogCacheKey(catalogId))
    if (!raw) return null
    const { data, timestamp, metadata = {} } = JSON.parse(raw)
    if (Date.now() - timestamp > CACHE_TTL_MS) return null
    return { data, metadata, timestamp }
  } catch {
    return null
  }
}

function saveToCache(catalogId, rawRecords, metadata) {
  try {
    localStorage.setItem(getCatalogCacheKey(catalogId), JSON.stringify({
      data: rawRecords,
      metadata,
      timestamp: Date.now(),
    }))
  } catch {
    // localStorage quota exceeded — skip caching
  }
}

// Returns parsed satellite array. Throws only if all sources fail.
export async function fetchTLEs(onProgress, catalogId = DEFAULT_CATALOG_ID) {
  const catalog = getCatalog(catalogId)
  if (!catalog) throw new Error(`Unknown satellite catalog: ${catalogId}`)

  const cached = loadFromCache(catalogId)
  if (cached) {
    try {
      const parsed = parseOrThrow(cached.data, cached.metadata)
      currentFeedStatus = {
        checkedAt: new Date(cached.timestamp),
        source: cached.metadata.source ?? 'Unknown',
        catalogLabel: cached.metadata.catalogLabel ?? catalog.label,
        coverage: cached.metadata.coverage ?? catalog.description,
        partial: Boolean(cached.metadata.partial),
      }
      onProgress?.('cache')
      return parsed
    } catch (err) {
      console.warn('Cached orbital data is unusable, fetching a fresh feed:', err.message)
    }
  }

  onProgress?.('fetching')

  // Primary: the explicitly selected CelesTrak OMM catalog.
  try {
    const fetched = await fetchCelesTrakGroups(catalog.groups, catalog.limit)
    const raw = fetched.records
    const partial = fetched.failedGroups.length > 0
    const coverage = partial
      ? `${catalog.description} (Partial: unavailable groups ${fetched.failedGroups.join(', ')})`
      : catalog.description
    const metadata = {
      source: 'CelesTrak',
      catalogId,
      catalogLabel: catalog.label,
      coverage,
      partial,
    }
    const parsed = parseOrThrow(raw, metadata)
    saveToCache(catalogId, raw, metadata)
    currentFeedStatus = { checkedAt: new Date(), ...metadata }
    onProgress?.('parsing')
    return parsed
  } catch (err) {
    if (catalogId !== DEFAULT_CATALOG_ID) {
      throw new Error(`${catalog.label} catalog failed: ${err.message}`)
    }
    console.warn('CelesTrak overview failed, trying the TLE API sample:', err.message)
  }

  // Overview fallback: a bounded sample from the CORS-friendly TLE API.
  try {
    const raw = await fetchTLEApi()
    const metadata = {
      source: 'TLE API',
      catalogId,
      catalogLabel: 'Overview fallback sample',
      coverage: 'Up to 500 records from the TLE API',
      partial: false,
    }
    const parsed = parseOrThrow(raw, metadata)
    saveToCache(catalogId, raw, metadata)
    currentFeedStatus = { checkedAt: new Date(), ...metadata }
    onProgress?.('parsing')
    return parsed
  } catch (err) {
    throw new Error(`All TLE sources failed: ${err.message}`)
  }
}

export function getFeedStatus() {
  if (currentFeedStatus) return currentFeedStatus
  try {
    const catalogKey = getCatalogCacheKey(DEFAULT_CATALOG_ID)
    const raw = localStorage.getItem(catalogKey)
    if (!raw) return null
    const { timestamp, metadata = {} } = JSON.parse(raw)
    return {
      checkedAt: new Date(timestamp),
      source: metadata.source ?? 'Unknown',
      catalogLabel: metadata.catalogLabel ?? 'Overview',
      coverage: metadata.coverage ?? '',
      partial: Boolean(metadata.partial),
    }
  } catch {
    return null
  }
}

export function summarizeElementAges(satellites) {
  const epochs = satellites
    .map(sat => sat.epoch?.getTime())
    .filter(Number.isFinite)
    .sort((a, b) => a - b)

  if (epochs.length === 0) return null
  const middle = Math.floor(epochs.length / 2)
  const medianTimestamp = epochs.length % 2
    ? epochs[middle]
    : (epochs[middle - 1] + epochs[middle]) / 2

  return {
    medianEpoch: new Date(medianTimestamp),
    oldestEpoch: new Date(epochs[0]),
  }
}
