import { describe, it, expect, beforeEach } from 'vitest'
import { Clock } from '../../src/engine/clock.js'

describe('Clock', () => {
  let clock

  beforeEach(() => {
    clock = new Clock()
  })

  it('initializes paused', () => {
    expect(clock.isPaused()).toBe(true)
  })

  it('initializes near current real time', () => {
    const delta = Math.abs(clock.getTime().getTime() - Date.now())
    expect(delta).toBeLessThan(500)
  })

  it('defaults to speed 1', () => {
    expect(clock.getSpeed()).toBe(1)
  })

  it('play/pause toggles paused state', () => {
    clock.play()
    expect(clock.isPaused()).toBe(false)
    clock.pause()
    expect(clock.isPaused()).toBe(true)
  })

  it('setSpeed updates speed', () => {
    clock.setSpeed(100)
    expect(clock.getSpeed()).toBe(100)
  })

  it('resetToNow sets time close to real time', () => {
    clock.setTime(new Date('2020-01-01'))
    clock.resetToNow()
    const delta = Math.abs(clock.getTime().getTime() - Date.now())
    expect(delta).toBeLessThan(500)
  })

  it('setTime overrides current time', () => {
    const t = new Date('2025-06-15T00:00:00Z')
    clock.setTime(t)
    expect(clock.getTime().toISOString()).toBe(t.toISOString())
  })

  it('tick advances sim time by speed * realDeltaMs', () => {
    clock.setSpeed(10)
    clock.play()
    const t0 = clock.getTime().getTime()
    clock.tick(1000) // simulate 1000ms real time elapsed
    const t1 = clock.getTime().getTime()
    expect(t1 - t0).toBeCloseTo(10000, -1) // 10x speed → 10000ms sim time
  })

  it('tick does nothing when paused', () => {
    const t0 = clock.getTime().getTime()
    clock.tick(1000)
    expect(clock.getTime().getTime()).toBe(t0)
  })
})
