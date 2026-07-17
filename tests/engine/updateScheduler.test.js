import { describe, expect, it } from 'vitest'
import { IntervalScheduler } from '../../src/engine/updateScheduler.js'

describe('IntervalScheduler', () => {
  it('runs immediately and then waits for its interval', () => {
    const scheduler = new IntervalScheduler(100)

    expect(scheduler.shouldRun(0)).toBe(true)
    expect(scheduler.shouldRun(99)).toBe(false)
    expect(scheduler.shouldRun(100)).toBe(true)
  })

  it('can mark an update performed outside the scheduler', () => {
    const scheduler = new IntervalScheduler(250)

    scheduler.mark(50)
    expect(scheduler.shouldRun(299)).toBe(false)
    expect(scheduler.shouldRun(300)).toBe(true)
  })

  it('runs immediately after reset', () => {
    const scheduler = new IntervalScheduler(100)

    scheduler.shouldRun(0)
    scheduler.reset()
    expect(scheduler.shouldRun(1)).toBe(true)
  })

  it('substantially reduces work compared with a 60 FPS frame loop', () => {
    const positionScheduler = new IntervalScheduler(100)
    const groundTrackScheduler = new IntervalScheduler(250)
    let frames = 0
    let positionUpdates = 0
    let groundTrackUpdates = 0

    for (let now = 0; now < 1000; now += 16) {
      frames++
      if (positionScheduler.shouldRun(now)) positionUpdates++
      if (groundTrackScheduler.shouldRun(now)) groundTrackUpdates++
    }

    expect(frames).toBeGreaterThan(60)
    expect(positionUpdates).toBeLessThanOrEqual(10)
    expect(groundTrackUpdates).toBeLessThanOrEqual(4)
  })
})
