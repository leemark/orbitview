export const DEFAULT_CATALOG_ID = 'overview'

export const CATALOGS = Object.freeze({
  overview: {
    label: 'Overview',
    description: 'Curated stations, visible, weather, and GPS satellites',
    groups: ['stations', 'visual', 'weather', 'gps-ops'],
  },
  stations: {
    label: 'Stations',
    description: 'Crewed spacecraft and related station objects',
    groups: ['stations'],
  },
  visible: {
    label: 'Visible',
    description: 'Satellites selected by CelesTrak for visual observing',
    groups: ['visual'],
  },
  weather: {
    label: 'Weather',
    description: 'Weather and Earth-observation satellites',
    groups: ['weather'],
  },
  navigation: {
    label: 'Navigation',
    description: 'Operational GPS, GLONASS, Galileo, and BeiDou satellites',
    groups: ['gps-ops', 'glo-ops', 'galileo', 'beidou'],
  },
  activeSample: {
    label: 'Active sample',
    description: 'First 1,000 records from the active-satellite catalog',
    groups: ['active'],
    limit: 1000,
  },
  starlinkSample: {
    label: 'Starlink sample',
    description: 'First 1,000 records from the Starlink catalog',
    groups: ['starlink'],
    limit: 1000,
  },
})

export function getCatalog(catalogId) {
  return CATALOGS[catalogId] ?? null
}

