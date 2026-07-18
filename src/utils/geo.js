import * as satellite from 'satellite.js'

const EARTH_RADIUS_KM = 6371

export function toRadians(deg) {
  return (deg * Math.PI) / 180
}

export function toDegrees(rad) {
  return (rad * 180) / Math.PI
}

export function haversineDistance(lat1, lon1, lat2, lon2) {
  const dLat = toRadians(lat2 - lat1)
  const dLon = toRadians(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a))
}

// Returns WGS-84 look angles from an observer to a satellite subpoint.
// observerLat/Lon in degrees, satLat/Lon in degrees, satAlt in km.
export function calculateLookAngles(
  observerLat,
  observerLon,
  satLat,
  satLon,
  satAlt,
  observerAlt = 0
) {
  const observerGeodetic = {
    latitude: satellite.degreesToRadians(observerLat),
    longitude: satellite.degreesToRadians(observerLon),
    height: observerAlt,
  }
  const satelliteEcf = satellite.geodeticToEcf({
    latitude: satellite.degreesToRadians(satLat),
    longitude: satellite.degreesToRadians(satLon),
    height: satAlt,
  })
  const lookAngles = satellite.ecfToLookAngles(observerGeodetic, satelliteEcf)
  const azimuth = satellite.radiansToDegrees(lookAngles.azimuth)

  return {
    azimuth: (azimuth + 360) % 360,
    elevation: satellite.radiansToDegrees(lookAngles.elevation),
    range: lookAngles.rangeSat,
  }
}

export function calculateElevation(observerLat, observerLon, satLat, satLon, satAlt) {
  return calculateLookAngles(observerLat, observerLon, satLat, satLon, satAlt).elevation
}
