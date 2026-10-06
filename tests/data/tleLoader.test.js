import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  parseTLEData,
  summarizeElementAges,
  CACHE_KEY,
  fetchTLEs,
  getFeedStatus,
} from '../../src/data/tleLoader.js'

const SAMPLE_TLE = [
  {
    OBJECT_NAME: 'ISS (ZARYA)',
    NORAD_CAT_ID: '25544',
    EPOCH: '2026-03-24T12:00:00.000000',
    TLE_LINE1: '1 25544U 98067A   26084.50000000  .00010000  00000-0  17000-3 0  9999',
    TLE_LINE2: '2 25544  51.6400 100.0000 0002000  90.0000 270.0000 15.48000000000000',
  }
]

const VALID_OMM = {
  OBJECT_NAME: 'ISS (ZARYA)',
  OBJECT_ID: '1998-067A',
  EPOCH: '2026-03-24T12:00:00.000000Z',
  MEAN_MOTION: 15.48,
  ECCENTRICITY: 0.0002,
  INCLINATION: 51.64,
  RA_OF_ASC_NODE: 100,
  ARG_OF_PERICENTER: 90,
  MEAN_ANOMALY: 270,
  EPHEMERIS_TYPE: 0,
  CLASSIFICATION_TYPE: 'U',
  NORAD_CAT_ID: 25544,
  ELEMENT_SET_NO: 999,
  REV_AT_EPOCH: 1000,
  BSTAR: 0.00017,
  MEAN_MOTION_DOT: 0.0001,
  MEAN_MOTION_DDOT: 0,
}

describe('parseTLEData', () => {
  it('converts TLE records to satellite objects', () => {
    const result = parseTLEData(SAMPLE_TLE, { source: 'TLE API' })
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('ISS (ZARYA)')
    expect(result[0].noradId).toBe(25544)
    expect(result[0].satrec).toBeDefined()
    expect(result[0].satrec.error).toBe(0)
    expect(result[0].epoch).toBeInstanceOf(Date)
    // The TLE element is authoritative even when API metadata disagrees.
    expect(result[0].epoch.toISOString()).toBe('2026-03-25T12:00:00.000Z')
    expect(result[0].category).toBe('stations')
    expect(result[0].elementFormat).toBe('TLE')
    expect(result[0].dataSource).toBe('TLE API')
  })

  it('converts CelesTrak OMM JSON records to satellite objects', () => {
    const result = parseTLEData([{
      OBJECT_NAME: 'ISS (ZARYA)',
      OBJECT_ID: '1998-067A',
      EPOCH: '2026-03-24T12:00:00.000000',
      MEAN_MOTION: 15.48,
      ECCENTRICITY: 0.0002,
      INCLINATION: 51.64,
      RA_OF_ASC_NODE: 100,
      ARG_OF_PERICENTER: 90,
      MEAN_ANOMALY: 270,
      EPHEMERIS_TYPE: 0,
      CLASSIFICATION_TYPE: 'U',
      NORAD_CAT_ID: 25544,
      ELEMENT_SET_NO: 999,
      REV_AT_EPOCH: 1000,
      BSTAR: 0.00017,
      MEAN_MOTION_DOT: 0.0001,
      MEAN_MOTION_DDOT: 0,
    }], { source: 'CelesTrak' })

    expect(result).toHaveLength(1)
    expect(result[0].satrec.error).toBe(0)
    expect(result[0].elementFormat).toBe('OMM')
    expect(result[0].dataSource).toBe('CelesTrak')
    expect(result[0].epoch.toISOString()).toBe('2026-03-24T12:00:00.000Z')
  })

  it('preserves explicit OMM timezone offsets', () => {
    const result = parseTLEData([{ ...VALID_OMM, EPOCH: '2026-03-24T12:00:00.000000-05:00' }])
    expect(result[0].epoch.toISOString()).toBe('2026-03-24T17:00:00.000Z')
  })

  it('skips records with invalid TLE lines', () => {
    const badData = [{
      OBJECT_NAME: 'BAD SAT',
      NORAD_CAT_ID: '00001',
      EPOCH: '2026-03-24T12:00:00.000000',
      TLE_LINE1: 'not a tle line 1',
      TLE_LINE2: 'not a tle line 2',
    }]
    expect(parseTLEData(badData)).toHaveLength(0)
  })

  it('skips records without valid TLE or OMM elements', () => {
    const noLines = [{
      OBJECT_NAME: 'PARTIAL SAT',
      NORAD_CAT_ID: '00002',
      EPOCH: '2026-03-24T12:00:00.000000',
    }]
    expect(parseTLEData(noLines)).toHaveLength(0)
  })

  it('skips nameless external records without throwing', () => {
    expect(parseTLEData([null, { NORAD_CAT_ID: 25544, EPOCH: '2026-03-24T12:00:00Z' }])).toHaveLength(0)
  })
})

describe('CACHE_KEY', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('is a non-empty string', () => {
    expect(typeof CACHE_KEY).toBe('string')
    expect(CACHE_KEY.length).toBeGreaterThan(0)
  })
})

describe('fetchTLEs feed handling', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('preserves available groups and discloses partial CelesTrak coverage', async () => {
    const fetchMock = vi.fn(async (url) => {
      if (url.includes('GROUP=stations')) return { ok: true, json: async () => [VALID_OMM] }
      if (url.includes('GROUP=visual')) throw new Error('visual group unavailable')
      if (url.includes('GROUP=weather')) return { ok: false, status: 503 }
      return { ok: true, json: async () => [] }
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await fetchTLEs(undefined, 'overview')
    const status = getFeedStatus()
    const cached = JSON.parse(localStorage.getItem(`${CACHE_KEY}_overview`))

    expect(result).toHaveLength(1)
    expect(status.source).toBe('CelesTrak')
    expect(status.partial).toBe(true)
    expect(status.coverage).toContain('Partial')
    expect(cached.metadata.partial).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(4)
  })

  it('falls through to the network when fresh cached data cannot be parsed', async () => {
    localStorage.setItem(`${CACHE_KEY}_overview`, JSON.stringify({
      data: [{ OBJECT_NAME: 'BROKEN', NORAD_CAT_ID: '1', EPOCH: '2026-03-24T12:00:00Z' }],
      metadata: { source: 'stale cache', catalogLabel: 'Overview', coverage: 'stale' },
      timestamp: Date.now(),
    }))

    const fetchMock = vi.fn(async (url) => {
      if (url.includes('GROUP=stations')) return { ok: true, json: async () => [VALID_OMM] }
      return { ok: true, json: async () => [] }
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await fetchTLEs(undefined, 'overview')
    const status = getFeedStatus()

    expect(result).toHaveLength(1)
    expect(fetchMock).toHaveBeenCalled()
    expect(status.source).toBe('CelesTrak')
    expect(status.coverage).toBe('Curated stations, visible, weather, and GPS satellites')
  })
})

describe('summarizeElementAges', () => {
  it('reports the median and oldest element epochs separately', () => {
    const result = summarizeElementAges([
      { epoch: new Date('2026-03-24T03:00:00Z') },
      { epoch: new Date('2026-03-24T01:00:00Z') },
      { epoch: new Date('2026-03-24T02:00:00Z') },
    ])

    expect(result.medianEpoch.toISOString()).toBe('2026-03-24T02:00:00.000Z')
    expect(result.oldestEpoch.toISOString()).toBe('2026-03-24T01:00:00.000Z')
  })

  it('returns null when no valid element epochs are available', () => {
    expect(summarizeElementAges([])).toBeNull()
  })
})
