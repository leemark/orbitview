import L from 'leaflet'
import { computeGroundTrack } from '../engine/propagator.js'

let pastLine = null
let futureLine = null

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

export function renderGroundTrack(map, sat, simTime) {
  clearGroundTrack(map)
  const trackPoints = computeGroundTrack(sat.satrec, simTime)

  const past   = trackPoints.filter(p => !p.future)
  const future = trackPoints.filter(p =>  p.future)

  function toLatLngArrays(points) {
    return splitAtAntimeridian(points).map(seg => seg.map(p => [p.lat, p.lon]))
  }

  pastLine   = L.polyline(toLatLngArrays(past),   PAST_STYLE).addTo(map)
  futureLine = L.polyline(toLatLngArrays(future), FUTURE_STYLE).addTo(map)
}

export function clearGroundTrack(map) {
  pastLine?.remove()
  futureLine?.remove()
  pastLine = null
  futureLine = null
}
