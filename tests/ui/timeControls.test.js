import { describe, expect, it, vi } from 'vitest'
import { Clock } from '../../src/engine/clock.js'
import { createTimeControls } from '../../src/ui/timeControls.js'

describe('createTimeControls', () => {
  it('keeps the returned actions and accessible state in sync', () => {
    document.body.innerHTML = '<div id="controls"></div><span id="playback-speed"></span>'
    const clock = new Clock()
    const onChange = vi.fn()
    const controls = createTimeControls(
      document.getElementById('controls'),
      clock,
      onChange
    )

    expect(Object.keys(controls)).toEqual([
      'sync', 'syncPlayPause', 'toggle', 'setSpeed', 'reset',
    ])
    expect(document.querySelector('.play-btn').textContent).toBe('Play')
    expect(document.querySelector('.play-btn').getAttribute('aria-pressed')).toBe('false')

    controls.toggle()
    expect(clock.isPaused()).toBe(false)
    expect(document.querySelector('.play-btn').textContent).toBe('Pause')
    expect(document.querySelector('.play-btn').getAttribute('aria-pressed')).toBe('true')

    controls.setSpeed(100)
    expect(clock.getSpeed()).toBe(100)
    expect(document.querySelector('[data-speed="100"]').getAttribute('aria-pressed')).toBe('true')
    expect(document.getElementById('playback-speed').textContent).toBe('100×')
    expect(onChange).toHaveBeenCalledTimes(2)
  })

  it('reset returns to now, speed one, and playing state', () => {
    document.body.innerHTML = '<div id="controls"></div>'
    const clock = new Clock()
    const controls = createTimeControls(document.getElementById('controls'), clock)

    clock.setTime(new Date('2000-01-01T00:00:00Z'))
    clock.setSpeed(1000)
    clock.play()
    controls.reset()

    expect(clock.getSpeed()).toBe(1)
    expect(clock.isPaused()).toBe(false)
    expect(clock.getTime().getTime()).toBeGreaterThan(new Date('2020-01-01T00:00:00Z').getTime())
    expect(document.querySelector('.reset-btn').textContent).toBe('Now')
    expect(document.querySelector('[data-speed="1"]').getAttribute('aria-pressed')).toBe('true')
  })
})
