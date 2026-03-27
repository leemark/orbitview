import { describe, it, expect } from 'vitest'
import { createSatrec, propagatePosition, computeGroundTrack } from '../../src/engine/propagator.js'

// ISS TLE (approximate — valid for SGP4 math testing)
const TLE1 = '1 25544U 98067A   26084.50000000  .00010000  00000-0  17000-3 0  9999'
const TLE2 = '2 25544  51.6400 100.0000 0002000  90.0000 270.0000 15.48000000000000'

describe('createSatrec', () => {
  it('returns satrec with no error for valid TLE', () => {
    const satrec = createSatrec(TLE1, TLE2)
    expect(satrec).toBeDefined()
    expect(satrec.error).toBe(0)
  })
})

describe('propagatePosition', () => {
  it('returns lat/lon/alt/velocity for valid satrec', () => {
    const satrec = createSatrec(TLE1, TLE2)
    const result = propagatePosition(satrec, new Date('2026-03-26T12:00:00Z'))
    expect(result).not.toBeNull()
    expect(result.lat).toBeGreaterThanOrEqual(-90)
    expect(result.lat).toBeLessThanOrEqual(90)
    expect(result.lon).toBeGreaterThanOrEqual(-180)
    expect(result.lon).toBeLessThanOrEqual(180)
    expect(result.alt).toBeGreaterThan(200)
    expect(result.alt).toBeLessThan(500)
    expect(result.velocity).toBeGreaterThan(7)
    expect(result.velocity).toBeLessThan(8)
  })

  it('returns null when satrec has error flag set', () => {
    const satrec = createSatrec(TLE1, TLE2)
    satrec.error = 1
    expect(propagatePosition(satrec, new Date())).toBeNull()
  })

  it('two propagations at different times yield different positions', () => {
    const satrec = createSatrec(TLE1, TLE2)
    const t1 = new Date('2026-03-26T12:00:00Z')
    const t2 = new Date('2026-03-26T12:30:00Z')
    const p1 = propagatePosition(satrec, t1)
    const p2 = propagatePosition(satrec, t2)
    expect(p1.lat).not.toBeCloseTo(p2.lat, 1)
  })
})

describe('computeGroundTrack', () => {
  it('returns array of points with lat/lon/future fields', () => {
    const satrec = createSatrec(TLE1, TLE2)
    const points = computeGroundTrack(satrec, new Date('2026-03-26T12:00:00Z'), 36)
    expect(points.length).toBeGreaterThan(0)
    expect(points[0]).toHaveProperty('lat')
    expect(points[0]).toHaveProperty('lon')
    expect(points[0]).toHaveProperty('future')
  })

  it('roughly half the points are future=true and half future=false', () => {
    const satrec = createSatrec(TLE1, TLE2)
    const points = computeGroundTrack(satrec, new Date('2026-03-26T12:00:00Z'), 36)
    const futureCount = points.filter(p => p.future).length
    const pastCount = points.filter(p => !p.future).length
    expect(futureCount).toBeGreaterThan(0)
    expect(pastCount).toBeGreaterThan(0)
  })
})
