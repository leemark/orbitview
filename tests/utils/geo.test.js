import { describe, it, expect } from 'vitest'
import { toRadians, toDegrees, haversineDistance, calculateElevation } from '../../src/utils/geo.js'

describe('toRadians / toDegrees', () => {
  it('converts 180° to π', () => expect(toRadians(180)).toBeCloseTo(Math.PI))
  it('converts π to 180°', () => expect(toDegrees(Math.PI)).toBeCloseTo(180))
  it('round-trips', () => expect(toDegrees(toRadians(45))).toBeCloseTo(45))
})

describe('haversineDistance', () => {
  it('returns 0 for same point', () => {
    expect(haversineDistance(0, 0, 0, 0)).toBe(0)
  })
  it('New York to London ≈ 5570 km', () => {
    const d = haversineDistance(40.7128, -74.006, 51.5074, -0.1278)
    expect(d).toBeGreaterThan(5500)
    expect(d).toBeLessThan(5700)
  })
})

describe('calculateElevation', () => {
  it('returns near 90° for satellite directly overhead', () => {
    const el = calculateElevation(0, 0, 0, 0, 400)
    expect(el).toBeGreaterThan(85)
  })
  it('returns negative for satellite below horizon', () => {
    const el = calculateElevation(0, 0, 89, 0, 400)
    expect(el).toBeLessThan(0)
  })
})
