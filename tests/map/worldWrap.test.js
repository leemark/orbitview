import { describe, expect, it } from 'vitest'
import {
  getWrappedXPositions,
  unwrapWorldXPositions,
} from '../../src/map/worldWrap.js'

describe('getWrappedXPositions', () => {
  it('fills every visible world copy in a wide viewport', () => {
    expect(getWrappedXPositions(768, 512, 1920, 10)).toEqual([
      256,
      768,
      1280,
      1792,
    ])
  })

  it('brings an offscreen canonical point into each visible wrapped world', () => {
    expect(getWrappedXPositions(-200, 512, 1920, 10)).toEqual([
      312,
      824,
      1336,
      1848,
    ])
  })

  it('returns fewer copies as the projected world gets wider', () => {
    expect(getWrappedXPositions(500, 1024, 1920, 10)).toEqual([
      500,
      1524,
    ])
  })

  it('falls back to the canonical point when wrapping is unavailable', () => {
    expect(getWrappedXPositions(100, 0, 1920, 10)).toEqual([100])
    expect(getWrappedXPositions(-100, 0, 1920, 10)).toEqual([])
  })
})

describe('unwrapWorldXPositions', () => {
  it('keeps eastbound trails continuous across the antimeridian', () => {
    expect(unwrapWorldXPositions([500, 10, 20], 512)).toEqual([-12, 10, 20])
  })

  it('keeps westbound trails continuous across the antimeridian', () => {
    expect(unwrapWorldXPositions([10, 500, 490], 512)).toEqual([522, 500, 490])
  })

  it('leaves paths unchanged when wrapping is unavailable', () => {
    expect(unwrapWorldXPositions([500, 10], 0)).toEqual([500, 10])
  })
})
