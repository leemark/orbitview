import { describe, it, expect } from 'vitest'
import { classifySatellite, getOrbitRegime, CATEGORY_COLORS, CATEGORIES } from '../../src/data/categories.js'

describe('classifySatellite', () => {
  it('classifies ISS as stations', () => {
    expect(classifySatellite({ name: 'ISS (ZARYA)', noradId: 25544 })).toBe('stations')
  })
  it('classifies Tiangong as stations', () => {
    expect(classifySatellite({ name: 'CSS (TIANHE)', noradId: 48274 })).toBe('stations')
  })
  it('classifies Starlink as starlink', () => {
    expect(classifySatellite({ name: 'STARLINK-1234', noradId: 44235 })).toBe('starlink')
  })
  it('classifies NOAA as weather', () => {
    expect(classifySatellite({ name: 'NOAA 19', noradId: 33591 })).toBe('weather')
  })
  it('classifies GOES as weather', () => {
    expect(classifySatellite({ name: 'GOES 18', noradId: 51850 })).toBe('weather')
  })
  it('classifies GPS satellite as navigation', () => {
    expect(classifySatellite({ name: 'GPS BIIF-1  (PRN 25)', noradId: 36585 })).toBe('navigation')
  })
  it('classifies GLONASS as navigation', () => {
    expect(classifySatellite({ name: 'GLONASS-M 756', noradId: 32276 })).toBe('navigation')
  })
  it('classifies debris', () => {
    expect(classifySatellite({ name: 'FENGYUN 1C DEB', noradId: 29228 })).toBe('debris')
  })
  it('classifies rocket body as debris', () => {
    expect(classifySatellite({ name: 'CZ-3B R/B', noradId: 40938 })).toBe('debris')
  })
  it('defaults unknown to other', () => {
    expect(classifySatellite({ name: 'MYSTERY SAT 1', noradId: 99999 })).toBe('other')
  })
})

describe('getOrbitRegime', () => {
  it('LEO below 2000km', () => expect(getOrbitRegime(400)).toBe('LEO'))
  it('MEO between 2000–35000km', () => expect(getOrbitRegime(20200)).toBe('MEO'))
  it('GEO near 35786km', () => expect(getOrbitRegime(35786)).toBe('GEO'))
  it('HEO above 36000km', () => expect(getOrbitRegime(50000)).toBe('HEO'))
})

describe('CATEGORY_COLORS', () => {
  it('has a color for every category', () => {
    CATEGORIES.forEach(cat => {
      expect(CATEGORY_COLORS[cat]).toBeDefined()
    })
  })
})
