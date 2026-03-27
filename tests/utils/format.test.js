import { describe, it, expect } from 'vitest'
import { formatAlt, formatVelocity, formatCoord, formatTLEAge } from '../../src/utils/format.js'

describe('formatAlt', () => {
  it('formats km with one decimal', () => expect(formatAlt(408.5)).toBe('408.5 km'))
  it('rounds correctly', () => expect(formatAlt(408.567)).toBe('408.6 km'))
})

describe('formatVelocity', () => {
  it('formats km/s with two decimals', () => expect(formatVelocity(7.66)).toBe('7.66 km/s'))
})

describe('formatCoord', () => {
  it('formats positive lat as N', () => expect(formatCoord(45.1, 'lat')).toBe('45.10°N'))
  it('formats negative lat as S', () => expect(formatCoord(-33.4, 'lat')).toBe('33.40°S'))
  it('formats positive lon as E', () => expect(formatCoord(90.5, 'lon')).toBe('90.50°E'))
  it('formats negative lon as W', () => expect(formatCoord(-74.0, 'lon')).toBe('74.00°W'))
})

describe('formatTLEAge', () => {
  it('shows hours when less than 48h old', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 3600 * 1000)
    expect(formatTLEAge(twoHoursAgo)).toBe('2h old')
  })
  it('shows days when 2+ days old', () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 3600 * 1000)
    expect(formatTLEAge(threeDaysAgo)).toBe('3d old')
  })
})
