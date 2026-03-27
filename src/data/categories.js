export const CATEGORIES = ['stations', 'weather', 'navigation', 'starlink', 'communications', 'science', 'debris', 'other']

export const CATEGORY_COLORS = {
  stations:       '#ffffff',
  weather:        '#4caf50',
  navigation:     '#4a90d9',
  starlink:       '#9c27b0',
  communications: '#ff9800',
  science:        '#00bcd4',
  debris:         '#555e6e',
  other:          '#4a90d9',
}

export const CATEGORY_LABELS = {
  stations:       'Stations',
  weather:        'Weather',
  navigation:     'Navigation',
  starlink:       'Starlink',
  communications: 'Comms',
  science:        'Science',
  debris:         'Debris',
  other:          'Other',
}

export function classifySatellite({ name, noradId }) {
  const n = name.toUpperCase()

  if (noradId === 25544 || noradId === 48274 || n.includes('ISS') || n.includes('TIANHE') || n.includes('CSS (')) {
    return 'stations'
  }
  if (n.includes('STARLINK')) return 'starlink'
  if (n.includes('DEB') || n.includes('DEBRIS') || n.includes('R/B') || n.includes('ROCKET BODY')) {
    return 'debris'
  }
  if (
    n.includes('NOAA') || n.includes('GOES') || n.includes('METEOSAT') ||
    n.includes('METEOR-') || n.includes('FENGYUN') || n.includes('HIMAWARI') ||
    n.includes('DMSP') || n.includes('ELECTRO-')
  ) return 'weather'
  if (
    n.includes('GPS') || n.includes('NAVSTAR') || n.includes('GLONASS') ||
    n.includes('GALILEO') || n.includes('BEIDOU') || n.includes('IRNSS') ||
    n.includes('QZSS')
  ) return 'navigation'
  if (
    n.includes('INTELSAT') || n.includes('SES-') || n.includes('EUTELSAT') ||
    n.includes('IRIDIUM') || n.includes('GLOBALSTAR') || n.includes('INMARSAT') ||
    n.includes('VIASAT') || n.includes('HUGHES')
  ) return 'communications'
  if (
    n.includes('TERRA') || n.includes('AQUA') || n.includes('AURA') ||
    n.includes('HUBBLE') || n.includes('CHANDRA') || n.includes('SWIFT') ||
    n.includes('SENTINEL') || n.includes('LANDSAT') || n.includes('ICESAT')
  ) return 'science'

  return 'other'
}

// altKm: current altitude in km
export function getOrbitRegime(altKm) {
  if (altKm < 2000) return 'LEO'
  if (altKm < 35000) return 'MEO'
  if (altKm < 36500) return 'GEO'
  return 'HEO'
}
