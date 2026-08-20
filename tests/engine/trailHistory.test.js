import { describe, expect, it, vi } from 'vitest'
import {
  buildSatelliteTrail,
  updateSatelliteTrail,
  TRAIL_DURATION_MS,
  TRAIL_POINT_COUNT,
  TRAIL_SAMPLE_INTERVAL_MS,
} from '../../src/engine/trailHistory.js'

describe('buildSatelliteTrail', () => {
  it('preloads a recent trail ending at the simulation time', () => {
    const referenceDate = new Date('2026-08-20T00:00:00Z')
    const propagate = vi.fn((_satrec, date) => ({
      lat: date.getTime() / 1000,
      lon: 10,
    }))

    const trail = buildSatelliteTrail({}, referenceDate, propagate)

    expect(trail).toHaveLength(TRAIL_POINT_COUNT)
    expect(trail[0].timestamp).toBe(referenceDate.getTime() - TRAIL_DURATION_MS)
    expect(trail.at(-1).timestamp).toBe(referenceDate.getTime())
    expect(propagate).toHaveBeenCalledTimes(TRAIL_POINT_COUNT)
  })
})
describe('updateSatelliteTrail', () => {
  it('waits for the sampling interval before adding a point', () => {
    const start = new Date('2026-08-20T00:00:00Z')
    const trail = [{ lat: 0, lon: 0, timestamp: start.getTime() }]
    const updated = updateSatelliteTrail(
      trail,
      {},
      { lat: 1, lon: 1 },
      new Date(start.getTime() + TRAIL_SAMPLE_INTERVAL_MS / 2)
    )

    expect(updated).toBe(trail)
  })

  it('adds a sampled position and bounds the history length', () => {
    const endTime = Date.parse('2026-08-20T00:00:00Z')
    const trail = Array.from({ length: TRAIL_POINT_COUNT }, (_, index) => ({
      lat: index,
      lon: index,
      timestamp: endTime - (TRAIL_POINT_COUNT - index) * TRAIL_SAMPLE_INTERVAL_MS,
    }))

    const updated = updateSatelliteTrail(
      trail,
      {},
      { lat: 50, lon: 60 },
      new Date(endTime)
    )

    expect(updated).toHaveLength(TRAIL_POINT_COUNT)
    expect(updated.at(-1)).toEqual({ lat: 50, lon: 60, timestamp: endTime })
    expect(updated[0].timestamp).toBeGreaterThanOrEqual(endTime - TRAIL_DURATION_MS)
  })

  it('rebuilds the trail after simulation time moves backwards', () => {
    const propagate = vi.fn(() => ({ lat: 1, lon: 2 }))
    const trail = [{
      lat: 0,
      lon: 0,
      timestamp: Date.parse('2026-08-20T01:00:00Z'),
    }]

    const updated = updateSatelliteTrail(
      trail,
      {},
      { lat: 1, lon: 2 },
      new Date('2026-08-20T00:00:00Z'),
      propagate
    )

    expect(updated).toHaveLength(TRAIL_POINT_COUNT)
    expect(propagate).toHaveBeenCalledTimes(TRAIL_POINT_COUNT)
  })
})
