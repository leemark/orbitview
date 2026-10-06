import { describe, expect, it, vi } from 'vitest'

const { polylineCalls, computeGroundTrackMock } = vi.hoisted(() => ({
  polylineCalls: [],
  computeGroundTrackMock: vi.fn(),
}))

vi.mock('leaflet', () => ({
  default: {
    latLng: (lat, lon) => ({ lat, lon }),
    polyline: (segments, style) => {
      const line = {
        segments,
        style,
        addTo: vi.fn(),
        remove: vi.fn(),
      }
      line.addTo.mockReturnValue(line)
      polylineCalls.push(line)
      return line
    },
  },
}))

vi.mock('../../src/engine/propagator.js', () => ({
  computeGroundTrack: computeGroundTrackMock,
}))

const { clearGroundTrack, renderGroundTrack } = await import('../../src/map/groundTrack.js')

function createMap() {
  return {
    getZoom: () => 2,
    getPixelWorldBounds: () => ({ getSize: () => ({ x: 200 }) }),
    getSize: () => ({ x: 100, y: 100 }),
    // Longitude 0 is offscreen, while the edge of its neighboring worlds is visible.
    latLngToContainerPoint: () => ({ x: 350, y: 50 }),
    on: vi.fn(),
    off: vi.fn(),
  }
}

describe('renderGroundTrack', () => {
  it('repeats partially visible worlds and joins future at the current point', () => {
    polylineCalls.length = 0
    computeGroundTrackMock.mockReturnValue([
      { lat: 0, lon: 0, future: false },
      { lat: 1, lon: 10, future: false },
      { lat: 2, lon: 20, future: true },
    ])
    const map = createMap()
    const sat = { satrec: {} }
    const simTime = new Date('2026-01-01T00:00:00Z')

    renderGroundTrack(map, sat, simTime)

    expect(polylineCalls).toHaveLength(2)
    const [pastLine, futureLine] = polylineCalls
    expect(pastLine.segments).toEqual([
      [[0, -720], [1, -710]],
      [[0, -360], [1, -350]],
    ])
    expect(futureLine.segments).toEqual([
      [[1, -710], [2, -700]],
      [[1, -350], [2, -340]],
    ])
    expect(futureLine.segments[0][0]).toEqual(pastLine.segments[0].at(-1))

    clearGroundTrack(map)
    expect(pastLine.remove).toHaveBeenCalledOnce()
    expect(futureLine.remove).toHaveBeenCalledOnce()
  })
})
