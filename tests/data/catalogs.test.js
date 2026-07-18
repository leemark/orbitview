import { describe, expect, it } from 'vitest'
import { CATALOGS, DEFAULT_CATALOG_ID, getCatalog } from '../../src/data/catalogs.js'

describe('satellite catalogs', () => {
  it('uses a curated, bounded overview by default', () => {
    const catalog = getCatalog(DEFAULT_CATALOG_ID)
    expect(catalog.groups).toEqual(['stations', 'visual', 'weather', 'gps-ops'])
    expect(catalog.groups).not.toContain('active')
    expect(catalog.groups).not.toContain('starlink')
  })

  it('caps large catalog choices for browser propagation performance', () => {
    expect(CATALOGS.activeSample.limit).toBe(1000)
    expect(CATALOGS.starlinkSample.limit).toBe(1000)
  })

  it('returns null for an unknown catalog', () => {
    expect(getCatalog('not-a-catalog')).toBeNull()
  })
})

