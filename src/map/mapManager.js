import L from 'leaflet'

const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

export function initMap(containerId) {
  const map = L.map(containerId, {
    center: [20, 0],
    zoom: 2,
    zoomControl: false,
    minZoom: 1,
    maxZoom: 18,
    attributionControl: true,
    preferCanvas: true,
  })

  L.tileLayer(TILE_URL, {
    attribution: TILE_ATTRIBUTION,
    className: 'basemap-tiles',
    maxZoom: 18,
    minZoom: 1,
  }).addTo(map)

  L.control.zoom({ position: 'bottomright' }).addTo(map)

  return map
}
