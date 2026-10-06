import L from 'leaflet'
import { computeGroundTrack } from '../engine/propagator.js'

let pastLine = null
let futureLine = null
let activeMap = null
let activeSat = null
let activeSimTime = null
let activeTrackPoints = null

const PAST_STYLE  = { color: '#4a90d9', weight: 1.2, opacity: 0.5 }
const FUTURE_STYLE = { color: '#4a90d9', weight: 1.2, opacity: 0.35, dashArray: '4 4' }

function splitAtAntimeridian(points) {
  const segments = []
  let current = []
  for (let i = 0; i < points.length; i++) {
    current.push(points[i])
    if (i < points.length - 1) {
      if (Math.abs(points[i + 1].lon - points[i].lon) > 180) {
        segments.push(current)
        current = []
      }
    }
  }
  if (current.length) segments.push(current)
  return segments
}

export function getVisibleWorldOffsets(map) {
  const worldBounds = map.getPixelWorldBounds?.(map.getZoom?.())
  const worldWidth = worldBounds?.getSize?.().x
  const mapSize = map.getSize?.()
  if (!Number.isFinite(worldWidth) || worldWidth <= 0 || !mapSize) return [0]

  const basePoint = map.latLngToContainerPoint?.(L.latLng(0, 0))
  if (!basePoint || !Number.isFinite(basePoint.x)) return [0]

  // A world copy occupies one full world width around its longitude-0
  // projection. Include copies whose edge, rather than center, is visible.
  const minWorld = Math.ceil((-basePoint.x - worldWidth / 2) / worldWidth)
  const maxWorld = Math.floor((mapSize.x - basePoint.x + worldWidth / 2) / worldWidth)
  const offsets = []
  for (let world = minWorld; world <= maxWorld; world++) {
    offsets.push(world * 360)
  }
  return offsets.length ? offsets : [0]
}

function repeatSegments(segments, worldOffsets) {
  return worldOffsets.flatMap(offset =>
    segments.map(segment => segment.map(([lat, lon]) => [lat, lon + offset]))
  )
}

function removeLines() {
  pastLine?.remove()
  futureLine?.remove()
  pastLine = null
  futureLine = null
}

function drawGroundTrack(map, sat, simTime, trackPoints = computeGroundTrack(sat.satrec, simTime)) {
  removeLines()

  const firstFutureIndex = trackPoints.findIndex(point => point.future)
  const past = trackPoints.filter(point => !point.future)
  // Start the future line at the current point as well, so the two paths meet.
  const current = firstFutureIndex > 0 ? trackPoints[firstFutureIndex - 1] : null
  const future = current
    ? [current, ...trackPoints.slice(firstFutureIndex)]
    : trackPoints.filter(point => point.future)

  function toLatLngArrays(points) {
    return splitAtAntimeridian(points).map(segment =>
      segment.map(point => [point.lat, point.lon])
    )
  }

  const worldOffsets = getVisibleWorldOffsets(map)
  const pastSegments = repeatSegments(toLatLngArrays(past), worldOffsets)
  const futureSegments = repeatSegments(toLatLngArrays(future), worldOffsets)

  pastLine = L.polyline(pastSegments, PAST_STYLE).addTo(map)
  futureLine = L.polyline(futureSegments, FUTURE_STYLE).addTo(map)
}

function redrawAfterMapMove() {
  if (activeMap && activeSat && activeSimTime) {
    drawGroundTrack(activeMap, activeSat, activeSimTime, activeTrackPoints)
  }
}

export function renderGroundTrack(map, sat, simTime) {
  if (activeMap !== map) {
    activeMap?.off?.('moveend', redrawAfterMapMove)
    activeMap = map
    map.on?.('moveend', redrawAfterMapMove)
  }
  activeSat = sat
  activeSimTime = simTime
  activeTrackPoints = computeGroundTrack(sat.satrec, simTime)
  drawGroundTrack(map, sat, simTime, activeTrackPoints)
}

export function clearGroundTrack(map) {
  removeLines()
  if (activeMap === map) {
    activeMap.off?.('moveend', redrawAfterMapMove)
    activeMap = null
    activeSat = null
    activeSimTime = null
    activeTrackPoints = null
  }
}
