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

// Returns elevation angle in degrees from observer to satellite.
// observerLat/Lon in degrees, satLat/Lon in degrees, satAlt in km.
export function calculateElevation(observerLat, observerLon, satLat, satLon, satAlt) {
  const d = haversineDistance(observerLat, observerLon, satLat, satLon)
  const earthAngle = d / EARTH_RADIUS_KM
  const slant = Math.sqrt(
    EARTH_RADIUS_KM ** 2 + (EARTH_RADIUS_KM + satAlt) ** 2 -
    2 * EARTH_RADIUS_KM * (EARTH_RADIUS_KM + satAlt) * Math.cos(earthAngle)
  )
  return toDegrees(Math.asin(
    ((EARTH_RADIUS_KM + satAlt) * Math.cos(earthAngle) - EARTH_RADIUS_KM) / slant
  ))
}
