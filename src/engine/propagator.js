import * as satellite from 'satellite.js'

export function createSatrec(tleLine1, tleLine2) {
  return satellite.twoline2satrec(tleLine1, tleLine2)
}

export function createSatrecFromOmm(ommRecord) {
  return satellite.json2satrec(ommRecord)
}

// Returns { lat, lon, alt, velocity } or null if propagation fails.
// lat/lon in degrees, alt in km, velocity in km/s.
export function propagatePosition(satrec, date) {
  if (!satrec || !(date instanceof Date) || !Number.isFinite(date.getTime())) return null

  try {
    // satellite.js clears satrec.error during each propagation. Calling it lets
    // a later valid date recover after a previous date produced an error.
    const pv = satellite.propagate(satrec, date)
    if (!pv || !pv.position || !pv.velocity || typeof pv.position !== 'object' || typeof pv.velocity !== 'object') return null
    if (
      satrec.error !== 0 ||
      !Number.isFinite(pv.position.x) ||
      !Number.isFinite(pv.position.y) ||
      !Number.isFinite(pv.position.z) ||
      !Number.isFinite(pv.velocity.x) ||
      !Number.isFinite(pv.velocity.y) ||
      !Number.isFinite(pv.velocity.z)
    ) return null

    const gmst = satellite.gstime(date)
    const geo = satellite.eciToGeodetic(pv.position, gmst)
    const lat = satellite.degreesLat(geo.latitude)
    const lon = satellite.degreesLong(geo.longitude)
    const alt = geo.height
    const velocity = Math.sqrt(pv.velocity.x ** 2 + pv.velocity.y ** 2 + pv.velocity.z ** 2)
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || !Number.isFinite(alt) || !Number.isFinite(velocity)) return null

    return {
      lat,
      lon,
      alt,
      velocity,
    }
  } catch {
    return null
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
