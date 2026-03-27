import { describe, it, expect, beforeEach, vi } from 'vitest'
import { parseTLEData, CACHE_KEY } from '../../src/data/tleLoader.js'

const SAMPLE_OMM = [
  {
    OBJECT_NAME: 'ISS (ZARYA)',
    NORAD_CAT_ID: '25544',
    EPOCH: '2026-03-24T12:00:00.000000',
    TLE_LINE1: '1 25544U 98067A   26084.50000000  .00010000  00000-0  17000-3 0  9999',
    TLE_LINE2: '2 25544  51.6400 100.0000 0002000  90.0000 270.0000 15.48000000000000',
  }
]

describe('parseTLEData', () => {
  it('converts OMM records to satellite objects', () => {
    const result = parseTLEData(SAMPLE_OMM)
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('ISS (ZARYA)')
    expect(result[0].noradId).toBe(25544)
    expect(result[0].satrec).toBeDefined()
    expect(result[0].satrec.error).toBe(0)
    expect(result[0].epoch).toBeInstanceOf(Date)
    expect(result[0].category).toBe('stations')
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

  it('skips records missing TLE lines', () => {
    const noLines = [{
      OBJECT_NAME: 'PARTIAL SAT',
      NORAD_CAT_ID: '00002',
      EPOCH: '2026-03-24T12:00:00.000000',
    }]
    expect(parseTLEData(noLines)).toHaveLength(0)
  })
})

describe('CACHE_KEY', () => {
  it('is a non-empty string', () => {
    expect(typeof CACHE_KEY).toBe('string')
    expect(CACHE_KEY.length).toBeGreaterThan(0)
  })
})
