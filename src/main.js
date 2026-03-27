import L from 'leaflet'
import { initMap } from './map/mapManager.js'
import { createSatelliteLayer } from './map/satelliteLayer.js'
import { renderGroundTrack, clearGroundTrack } from './map/groundTrack.js'
import { fetchTLEs, getCacheAge } from './data/tleLoader.js'
import { propagatePosition } from './engine/propagator.js'
import { Clock } from './engine/clock.js'
import { formatTLEAge, formatDate } from './utils/format.js'
import { showInfoPanel, hideInfoPanel, updateInfoPanel } from './ui/infoPanel.js'
import { createSearchBar, filterSatellites } from './ui/searchBar.js'
import { createFilterPanel, applyFilters } from './ui/filterPanel.js'
import { createTimeControls } from './ui/timeControls.js'
import { CATEGORIES } from './data/categories.js'
import { calculateElevation } from './utils/geo.js'

const map = initMap('map')
const clock = new Clock()
let satellites = []
let satLayer = null
let selectedSat = null
let searchQuery = ''
let searchBar = null
let timeControls = null
let activeFilters = { categories: new Set(CATEGORIES), regimes: new Set(['LEO', 'MEO', 'GEO', 'HEO']) }
let observer = null
let observerMarker = null

const satCountEl = document.getElementById('sat-count')
const simTimeEl = document.getElementById('sim-time')
const freshnessEl = document.getElementById('data-freshness')

window.orbitview = {
  onDeselect: () => {
    selectedSat = null
    satLayer?.setSelected(null)
    clearGroundTrack(map)
  }
}

function setObserver(lat, lon) {
  observer = { lat, lon }
  if (observerMarker) observerMarker.remove()
  const icon = L.divIcon({
    className: '',
    html: '<div class="observer-dot"></div>',
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  })
  observerMarker = L.marker([lat, lon], { icon }).addTo(map)
  observerMarker.bindTooltip('Your location', { permanent: false })
}

function getObserverData(sat) {
  if (!observer || !sat.position) return undefined
  const el = calculateElevation(
    observer.lat, observer.lon,
    sat.position.lat, sat.position.lon,
    sat.position.alt
  )
  return el > 0 ? { elevation: el } : null
}

function handleSelect(sat) {
  selectedSat = sat
  if (sat) {
    showInfoPanel(sat, sat.position, getObserverData(sat))
    renderGroundTrack(map, sat, clock.getTime())
  } else {
    hideInfoPanel()
    clearGroundTrack(map)
  }
}

function updateStatus() {
  const total = satellites.filter(s => s.position).length
  satCountEl.textContent = searchQuery
    ? `${filterSatellites(satellites, searchQuery).length} / ${total.toLocaleString()}`
    : `${total.toLocaleString()} satellites`
  const cacheAge = getCacheAge()
  freshnessEl.textContent = cacheAge ? `TLE data: ${formatTLEAge(cacheAge)}` : ''
}

let lastRaf = performance.now()
function animate(now) {
  const delta = now - lastRaf
  lastRaf = now

  const simTime = clock.tick(delta)
  simTimeEl.textContent = formatDate(simTime)

  for (const sat of satellites) {
    sat.position = propagatePosition(sat.satrec, simTime)
  }

  if (selectedSat) {
    updateInfoPanel(selectedSat, selectedSat.position, getObserverData(selectedSat))
    if (clock.getSpeed() > 1) {
      renderGroundTrack(map, selectedSat, simTime)
    }
  }
  const filtered = applyFilters(
    searchQuery ? filterSatellites(satellites, searchQuery) : satellites,
    activeFilters
  )
  satLayer?.update(filtered)
  requestAnimationFrame(animate)
}

function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return

    const speeds = [1, 10, 100, 1000]

    switch (e.key) {
      case ' ':
        e.preventDefault()
        if (clock.isPaused()) clock.play()
        else clock.pause()
        timeControls?.syncPlayPause()
        break
      case '+':
      case '=': {
        const idx = speeds.indexOf(clock.getSpeed())
        if (idx < speeds.length - 1) {
          clock.setSpeed(speeds[idx + 1])
          document.getElementById('playback-speed').textContent = `${speeds[idx + 1]}×`
        }
        break
      }
      case '-': {
        const idx = speeds.indexOf(clock.getSpeed())
        if (idx > 0) {
          clock.setSpeed(speeds[idx - 1])
          document.getElementById('playback-speed').textContent = `${speeds[idx - 1]}×`
        }
        break
      }
      case 'Escape':
        selectedSat = null
        satLayer?.setSelected(null)
        hideInfoPanel()
        clearGroundTrack(map)
        break
      case '/':
        e.preventDefault()
        searchBar?.focus()
        break
    }
  })
}

async function init() {
  satCountEl.textContent = 'Loading TLEs…'
  try {
    satellites = await fetchTLEs((status) => {
      if (status === 'fetching') satCountEl.textContent = 'Fetching TLEs…'
      if (status === 'parsing') satCountEl.textContent = 'Parsing…'
      if (status === 'cache')   satCountEl.textContent = 'Loading from cache…'
    })

    const tooltip = document.getElementById('tooltip')

    satLayer = createSatelliteLayer(map, handleSelect, (sat, clientX, clientY) => {
      if (sat) {
        const alt = sat.position ? ` · ${sat.position.alt.toFixed(0)} km` : ''
        tooltip.textContent = `${sat.name}${alt}`
        tooltip.style.left = `${clientX + 14}px`
        tooltip.style.top  = `${clientY - 8}px`
        tooltip.classList.remove('hidden')
      } else {
        tooltip.classList.add('hidden')
      }
    })

    // Request observer location (silently fails if denied)
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setObserver(pos.coords.latitude, pos.coords.longitude),
        () => {} // permission denied or unavailable — no observer dot
      )
    }

    searchBar = createSearchBar(
      document.getElementById('search-container'),
      (query) => { searchQuery = query; updateStatus() }
    )

    createFilterPanel(
      document.getElementById('filter-container'),
      (newFilters) => { activeFilters = newFilters }
    )

    timeControls = createTimeControls(
      document.getElementById('time-controls-container'),
      clock
    )

    updateStatus()
    clock.play()
    setupKeyboardShortcuts()
    requestAnimationFrame(animate)
  } catch (err) {
    satCountEl.textContent = 'Failed to load TLEs'
    console.error(err)
  }
}

init()
