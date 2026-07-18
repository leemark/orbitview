import { createSatrec, createSatrecFromOmm } from '../engine/propagator.js'
import { classifySatellite } from './categories.js'

export const CACHE_KEY = 'orbitview_orbital_data_v2'
const CACHE_TTL_MS = 2 * 60 * 60 * 1000 // 2 hours
let currentFeedStatus = null

// CelesTrak: use smaller group queries instead of GROUP=active (avoids bandwidth limits).
// In dev, route through Vite proxy to avoid CORS on localhost.
const CELESTRAK_BASE = import.meta.env.DEV
  ? '/celestrak/NORAD/elements/gp.php'
  : 'https://celestrak.org/NORAD/elements/gp.php'

const CELESTRAK_GROUPS = ['stations', 'visual', 'weather', 'gps-ops', 'starlink']
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

export function parseTLEData(rawRecords, metadata = {}) {
  const results = []
  for (const rec of rawRecords) {
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
    const epoch = new Date(rec.EPOCH)
    if (!Number.isFinite(noradId) || Number.isNaN(epoch.getTime())) continue

    results.push({
      name: rec.OBJECT_NAME,
      noradId,
      satrec,
      epoch,
      category: classifySatellite({ name: rec.OBJECT_NAME, noradId }),
      elementFormat: format,
      dataSource: metadata.source ?? 'Unknown',
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
    const res = await fetch(
      `https://tle.ivanstanojevic.me/api/tle/?page=${page}&page-size=100`
    )
    if (!res.ok) throw new Error(`TLE API HTTP ${res.status}`)
    const json = await res.json()
    const members = json.member ?? []
    allRaw.push(...members.map(normalizeTLEApiRecord))
    if (members.length < 100) break // reached last page
  }
  if (allRaw.length === 0) throw new Error('TLE API returned no records')
  return allRaw
}

// CelesTrak — fetch multiple small groups instead of GROUP=active.
// Deduplicates by NORAD ID across groups.
async function fetchCelesTrakGroups() {
  const allRaw = []
  const seen = new Set()
  for (const group of CELESTRAK_GROUPS) {
    try {
      const res = await fetch(`${CELESTRAK_BASE}?GROUP=${group}&FORMAT=json`)
      if (!res.ok) continue
      const data = await res.json()
      for (const rec of data) {
        if (!seen.has(rec.NORAD_CAT_ID)) {
          seen.add(rec.NORAD_CAT_ID)
          allRaw.push(rec)
        }
      }
    } catch {
      // skip failed group, try next
    }
  }
  if (allRaw.length === 0) throw new Error('All CelesTrak groups failed')
  return allRaw
}

function loadFromCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const { data, timestamp, metadata = {} } = JSON.parse(raw)
    if (Date.now() - timestamp > CACHE_TTL_MS) return null
    return { data, metadata, timestamp }
  } catch {
    return null
  }
}

function saveToCache(rawRecords, metadata) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      data: rawRecords,
      metadata,
      timestamp: Date.now(),
    }))
  } catch {
    // localStorage quota exceeded — skip caching
  }
}

// Returns parsed satellite array. Throws only if all sources fail.
export async function fetchTLEs(onProgress) {
  const cached = loadFromCache()
  if (cached) {
    currentFeedStatus = {
      checkedAt: new Date(cached.timestamp),
      source: cached.metadata.source ?? 'Unknown',
    }
    onProgress?.('cache')
    return parseOrThrow(cached.data, cached.metadata)
  }

  onProgress?.('fetching')

  // Primary: TLE API (CORS-friendly from any origin)
  try {
    const raw = await fetchTLEApi()
    const metadata = { source: 'TLE API' }
    const parsed = parseOrThrow(raw, metadata)
    saveToCache(raw, metadata)
    currentFeedStatus = { checkedAt: new Date(), source: metadata.source }
    onProgress?.('parsing')
    return parsed
  } catch (err) {
    console.warn('TLE API failed, trying CelesTrak groups:', err.message)
  }

  // Fallback: CelesTrak small-group queries
  try {
    const raw = await fetchCelesTrakGroups()
    const metadata = { source: 'CelesTrak' }
    const parsed = parseOrThrow(raw, metadata)
    saveToCache(raw, metadata)
    currentFeedStatus = { checkedAt: new Date(), source: metadata.source }
    onProgress?.('parsing')
    return parsed
  } catch (err) {
    throw new Error(`All TLE sources failed: ${err.message}`)
  }
}

export function getFeedStatus() {
  if (currentFeedStatus) return currentFeedStatus
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const { timestamp, metadata = {} } = JSON.parse(raw)
    return {
      checkedAt: new Date(timestamp),
      source: metadata.source ?? 'Unknown',
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
