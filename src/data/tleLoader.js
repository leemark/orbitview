import { createSatrec } from '../engine/propagator.js'
import { classifySatellite } from './categories.js'

export const CACHE_KEY = 'orbitview_tle_v1'
const CACHE_TTL_MS = 2 * 60 * 60 * 1000 // 2 hours

const SOURCES = [
  'https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=json',
  'https://api.keeptrack.space/v2/sats',
]

export function parseTLEData(rawRecords) {
  const results = []
  for (const rec of rawRecords) {
    const line1 = rec.TLE_LINE1
    const line2 = rec.TLE_LINE2
    if (!line1 || !line2) continue

    const satrec = createSatrec(line1.trim(), line2.trim())
    if (satrec.error !== 0) continue

    // Validate that satnum is a valid number (malformed TLEs parse satnum as string)
    const satnum = typeof satrec.satnum === 'number' ? satrec.satnum : parseInt(satrec.satnum, 10)
    if (!Number.isFinite(satnum)) continue

    const noradId = parseInt(rec.NORAD_CAT_ID, 10)
    results.push({
      name: rec.OBJECT_NAME,
      noradId,
      satrec,
      epoch: new Date(rec.EPOCH),
      category: classifySatellite({ name: rec.OBJECT_NAME, noradId }),
    })
  }
  return results
}

function loadFromCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const { data, timestamp } = JSON.parse(raw)
    if (Date.now() - timestamp > CACHE_TTL_MS) return null
    return data
  } catch {
    return null
  }
}

function saveToCache(rawRecords) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data: rawRecords, timestamp: Date.now() }))
  } catch {
    // localStorage quota exceeded — skip caching
  }
}

async function fetchFromSource(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

// Returns parsed satellite array. Throws if all sources fail.
// onProgress: optional callback called with 'cache' | 'fetching' | 'parsing'
export async function fetchTLEs(onProgress) {
  const cached = loadFromCache()
  if (cached) {
    onProgress?.('cache')
    return parseTLEData(cached)
  }

  let lastError
  for (const url of SOURCES) {
    try {
      onProgress?.('fetching')
      const raw = await fetchFromSource(url)
      saveToCache(raw)
      onProgress?.('parsing')
      return parseTLEData(raw)
    } catch (err) {
      lastError = err
    }
  }
  throw new Error(`All TLE sources failed: ${lastError?.message}`)
}

export function getCacheAge() {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const { timestamp } = JSON.parse(raw)
    return new Date(timestamp)
  } catch {
    return null
  }
}
