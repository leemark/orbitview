import L from 'leaflet'

const TILE_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'

export function initMap(containerId) {
  const map = L.map(containerId, {
    center: [20, 0],
    zoom: 2,
    zoomControl: true,
    attributionControl: true,
    preferCanvas: true,
  })

  L.tileLayer(TILE_URL, {
    attribution: TILE_ATTRIBUTION,
    subdomains: 'abcd',
    maxZoom: 18,
    minZoom: 1,
  }).addTo(map)

  return map
}
