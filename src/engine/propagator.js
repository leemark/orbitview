import * as satellite from 'satellite.js'

export function createSatrec(tleLine1, tleLine2) {
  return satellite.twoline2satrec(tleLine1, tleLine2)
}

// Returns { lat, lon, alt, velocity } or null if propagation fails.
// lat/lon in degrees, alt in km, velocity in km/s.
export function propagatePosition(satrec, date) {
  if (satrec.error !== 0) return null

  const pv = satellite.propagate(satrec, date)
  if (!pv || !pv.position || typeof pv.position !== 'object') return null

  const gmst = satellite.gstime(date)
  const geo = satellite.eciToGeodetic(pv.position, gmst)

  return {
    lat: satellite.degreesLat(geo.latitude),
    lon: satellite.degreesLong(geo.longitude),
    alt: geo.height,
    velocity: Math.sqrt(pv.velocity.x ** 2 + pv.velocity.y ** 2 + pv.velocity.z ** 2),
  }
}

// Returns array of { lat, lon, future } ground track points covering one full orbit.
// future=true for points after referenceDate, future=false for before.
export function computeGroundTrack(satrec, referenceDate, numPoints = 180) {
  const periodMin = (2 * Math.PI) / satrec.no  // satrec.no is mean motion in rad/min
  const stepMs = (periodMin * 60 * 1000) / numPoints
  const points = []

  for (let i = 0; i <= numPoints; i++) {
    const offset = (i - numPoints / 2) * stepMs
    const date = new Date(referenceDate.getTime() + offset)
    const pos = propagatePosition(satrec, date)
    if (pos) points.push({ lat: pos.lat, lon: pos.lon, future: i > numPoints / 2 })
  }

  return points
}
