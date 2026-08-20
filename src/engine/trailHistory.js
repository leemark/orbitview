import { propagatePosition } from './propagator.js'

export const TRAIL_DURATION_MS = 10 * 60 * 1000
export const TRAIL_POINT_COUNT = 12
export const TRAIL_SAMPLE_INTERVAL_MS = TRAIL_DURATION_MS / (TRAIL_POINT_COUNT - 1)

function isValidPosition(position) {
  return position &&
    Number.isFinite(position.lat) &&
    Number.isFinite(position.lon)
}

export function buildSatelliteTrail(
  satrec,
  referenceDate,
  propagate = propagatePosition
) {
  const endTime = referenceDate.getTime()
  if (!Number.isFinite(endTime)) return []

  const points = []
  for (let index = TRAIL_POINT_COUNT - 1; index >= 0; index--) {
    const timestamp = endTime - index * TRAIL_SAMPLE_INTERVAL_MS
    const position = propagate(satrec, new Date(timestamp))
    if (isValidPosition(position)) {
      points.push({
        lat: position.lat,
        lon: position.lon,
        timestamp,
      })
    }
  }
  return points
}

export function updateSatelliteTrail(
  trail,
  satrec,
  currentPosition,
  simTime,
  propagate = propagatePosition
) {
  const timestamp = simTime.getTime()
  if (!Number.isFinite(timestamp) || !isValidPosition(currentPosition)) {
    return trail ?? []
  }

  const lastPoint = trail?.at(-1)
  if (
    !lastPoint ||
    timestamp < lastPoint.timestamp ||
    timestamp - lastPoint.timestamp > TRAIL_DURATION_MS
  ) {
    return buildSatelliteTrail(satrec, simTime, propagate)
  }

  if (timestamp - lastPoint.timestamp < TRAIL_SAMPLE_INTERVAL_MS) {
    return trail
  }

  return [
    ...trail,
    { lat: currentPosition.lat, lon: currentPosition.lon, timestamp },
  ]
    .filter(point => timestamp - point.timestamp <= TRAIL_DURATION_MS)
    .slice(-TRAIL_POINT_COUNT)
}
