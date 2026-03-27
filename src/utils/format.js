export function formatAlt(km) {
  return `${km.toFixed(1)} km`
}

export function formatVelocity(kms) {
  return `${kms.toFixed(2)} km/s`
}

export function formatCoord(value, type) {
  const abs = Math.abs(value).toFixed(2)
  if (type === 'lat') return `${abs}°${value >= 0 ? 'N' : 'S'}`
  return `${abs}°${value >= 0 ? 'E' : 'W'}`
}

export function formatTLEAge(epoch) {
  const ageMs = Date.now() - epoch.getTime()
  const hours = Math.floor(ageMs / (3600 * 1000))
  if (hours < 48) return `${hours}h old`
  const days = Math.floor(hours / 24)
  return `${days}d old`
}

export function formatDate(date) {
  return date.toISOString().replace('T', ' ').substring(0, 19) + ' UTC'
}
