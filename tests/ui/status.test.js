import { describe, expect, it } from 'vitest'
import { CATEGORIES } from '../../src/data/categories.js'
import { getSatelliteStatus } from '../../src/ui/status.js'

const allFilters = {
  categories: new Set(CATEGORIES),
  regimes: new Set(['LEO', 'MEO', 'GEO', 'HEO']),
}

const satellites = [
  {
    name: 'ISS (ZARYA)',
    noradId: 25544,
    category: 'stations',
    position: { alt: 420 },
  },
  {
    name: 'GPS BIIF-1',
    noradId: 36585,
    category: 'navigation',
    position: { alt: 20200 },
  },
  {
    name: 'FAILED SAT',
    noradId: 99999,
    category: 'other',
    position: null,
  },
]

describe('getSatelliteStatus', () => {
  it('counts successfully positioned satellites', () => {
    expect(getSatelliteStatus(satellites, '', allFilters)).toEqual({
      total: 2,
      visible: 2,
      label: '2 satellites',
    })
  })

  it('reports search results against the positioned total', () => {
    expect(getSatelliteStatus(satellites, 'iss', allFilters)).toEqual({
      total: 2,
      visible: 1,
      label: '1 / 2',
    })
  })

  it('reports active filter results against the positioned total', () => {
    const stationOnly = {
      categories: new Set(['stations']),
      regimes: new Set(['LEO', 'MEO', 'GEO', 'HEO']),
    }

    expect(getSatelliteStatus(satellites, '', stationOnly)).toEqual({
      total: 2,
      visible: 1,
      label: '1 / 2',
    })
  })
})
