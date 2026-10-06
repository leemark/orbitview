import L from 'leaflet'
import { initMap } from './map/mapManager.js'
import { createSatelliteLayer } from './map/satelliteLayer.js'
import { renderGroundTrack, clearGroundTrack } from './map/groundTrack.js'
import { fetchTLEs, getFeedStatus, summarizeElementAges } from './data/tleLoader.js'
import { propagatePosition } from './engine/propagator.js'
import { Clock } from './engine/clock.js'
import { IntervalScheduler } from './engine/updateScheduler.js'
import { formatTLEAge, formatElapsedTime, formatDate } from './utils/format.js'
import { showInfoPanel, hideInfoPanel, updateInfoPanel } from './ui/infoPanel.js'
import { createSearchBar, filterSatellites } from './ui/searchBar.js'
import { createFilterPanel, applyFilters } from './ui/filterPanel.js'
import { createTimeControls } from './ui/timeControls.js'
import { createSatelliteList } from './ui/satelliteList.js'
import { CATEGORIES } from './data/categories.js'
import { CATALOGS, DEFAULT_CATALOG_ID } from './data/catalogs.js'
import { calculateLookAngles } from './utils/geo.js'
import { createCatalogSelector } from './ui/catalogSelector.js'
import { updateSatelliteTrail } from './engine/trailHistory.js'

const map = initMap('map')
const clock = new Clock()
const positionScheduler = new IntervalScheduler(100)
const trackScheduler = new IntervalScheduler(250)
const statusScheduler = new IntervalScheduler(1000)
let satellites = []
let selectedSat = null
let lastPropagatedTime = null
let lastTrackTime = null
let searchQuery = ''
let activeFilters = { categories: new Set(CATEGORIES), regimes: new Set(['LEO', 'MEO', 'GEO', 'HEO']) }
let observer = null
let observerMarker = null
let loading = true
let loadFailed = false
let requestedCatalogId = DEFAULT_CATALOG_ID
let elementAges = null
let selectionOrigin = null

const satCountEl = document.getElementById('sat-count')
const simTimeEl = document.getElementById('sim-time')
const freshnessEl = document.getElementById('data-freshness')
const tooltip = document.getElementById('tooltip')
const explorer = document.getElementById('explorer')
const resultsToggle = document.getElementById('toggle-results')

function setText(element, text) {
  if (element.textContent !== text) element.textContent = text
}

function setResultsOpen(open) {
  explorer.classList.toggle('results-open', open)
  resultsToggle.setAttribute('aria-expanded', String(open))
  resultsToggle.textContent = open ? 'Hide list' : 'Browse list'
}

function getObserverData(sat) {
  if (!observer || !sat.position) return undefined
  const angles = calculateLookAngles(observer.lat, observer.lon, sat.position.lat, sat.position.lon, sat.position.alt)
  return angles.elevation > 0 ? angles : null
}

function deselect({ restoreFocus = false } = {}) {
  selectedSat = null
  satLayer.setSelected(null)
  satelliteList.setSelected(null)
  hideInfoPanel()
  clearGroundTrack(map)
  lastTrackTime = null
  trackScheduler.reset()
  if (restoreFocus) {
    if (selectionOrigin?.isConnected && selectionOrigin.getClientRects().length) selectionOrigin.focus()
    else document.getElementById('sat-search').focus()
  }
}

window.orbitview = { onDeselect: () => deselect({ restoreFocus: true }) }

function handleSelect(sat, fromList = false) {
  if (!sat?.position) { deselect(); return }
  selectionOrigin = document.activeElement
  selectedSat = sat
  satLayer.setSelected(sat.noradId)
  satelliteList.setSelected(sat.noradId)
  showInfoPanel(sat, sat.position, getObserverData(sat))
  renderGroundTrack(map, sat, clock.getTime())
  lastTrackTime = clock.getTime().getTime()
  trackScheduler.mark(performance.now())
  if (fromList) {
    setResultsOpen(false)
    document.querySelector('.filters-disclosure').open = false
    // Wait for the mobile result list to collapse before centering the map.
    requestAnimationFrame(() => {
      map.invalidateSize({ pan: false })
      const size = map.getSize()
      const panel = document.getElementById('info-panel')
      const center = L.latLng(sat.position.lat, sat.position.lon)
      const zoom = Math.max(map.getZoom(), 3)
      map.setView(center, zoom, { animate: false })
      if (size.x > panel.offsetWidth + 60) map.panBy([panel.offsetWidth / 2, 0], { animate: false })
      document.getElementById('close-panel').focus({ preventScroll: true })
    })
  }
}

const satLayer = createSatelliteLayer(map, sat => handleSelect(sat), (sat, clientX, clientY) => {
  if (!sat) { tooltip.classList.add('hidden'); return }
  tooltip.textContent = `${sat.name} · ${sat.position.alt.toFixed(0)} km`
  tooltip.classList.remove('hidden')
  tooltip.style.left = `${Math.max(8, Math.min(clientX + 14, window.innerWidth - tooltip.offsetWidth - 8))}px`
  tooltip.style.top = `${Math.max(8, Math.min(clientY + 16, window.innerHeight - tooltip.offsetHeight - 8))}px`
})

const satelliteList = createSatelliteList(document.getElementById('satellite-results'), sat => handleSelect(sat, true), () => {
  searchBar.clear()
  filterPanel.reset()
})
const searchBar = createSearchBar(document.getElementById('search-container'), query => {
  searchQuery = query
  if (query) setResultsOpen(true)
  refreshVisible()
}, () => setResultsOpen(true))
const filterPanel = createFilterPanel(document.getElementById('filter-container'), filters => {
  activeFilters = filters
  refreshVisible()
})
const timeControls = createTimeControls(document.getElementById('time-controls-container'), clock, () => {
  lastTrackTime = null
  positionScheduler.reset()
  refreshTime()
})
const catalogSelector = createCatalogSelector(document.getElementById('catalog-container'), loadCatalog)

function refreshVisible() {
  const positioned = satellites.filter(sat => sat.position)
  const visible = applyFilters(filterSatellites(positioned, searchQuery), activeFilters)
  if (selectedSat && !visible.some(sat => sat.noradId === selectedSat.noradId)) deselect()
  satLayer.update(visible)
  satelliteList.update(visible, loading && !satellites.length ? 'loading' : loadFailed && !satellites.length ? 'error'
    : !positioned.length && satellites.length ? 'unavailable' : 'empty')
  if (!loading) {
    setText(satCountEl, loadFailed && !satellites.length ? 'Catalog unavailable'
      : visible.length === positioned.length ? `${visible.length.toLocaleString()} satellites`
        : `${visible.length.toLocaleString()} of ${positioned.length.toLocaleString()} satellites`)
  }
}

function refreshFeedStatus() {
  const feed = getFeedStatus()
  if (!feed || !elementAges) {
    setText(freshnessEl, loadFailed ? 'Orbital data unavailable · details' : 'Connecting to orbital data…')
    return
  }
  const stale = Date.now() - elementAges.oldestEpoch.getTime() > 3 * 86400000
  setText(freshnessEl, `${feed.source} · ${feed.catalogLabel}${feed.partial ? ' · Partial' : ''} · ${stale ? 'Older elements' : `Checked ${formatElapsedTime(feed.checkedAt)}`}`)
  freshnessEl.classList.toggle('element-stale', stale || Boolean(feed.partial))
  setText(document.getElementById('feed-details'), `${feed.source} · ${feed.catalogLabel}. ${feed.coverage}. Feed checked ${formatElapsedTime(feed.checkedAt)}. Orbital elements: median ${formatTLEAge(elementAges.medianEpoch)}, oldest ${formatTLEAge(elementAges.oldestEpoch)}.`)
}

function setLoadingStatus(status) {
  setText(satCountEl, status === 'cache' ? 'Loading saved catalog…' : status === 'parsing' ? 'Preparing satellites…' : 'Loading orbital data…')
}

async function loadCatalog(catalogId) {
  requestedCatalogId = catalogId
  loading = true
  loadFailed = false
  document.getElementById('load-notice').classList.add('hidden')
  document.getElementById('satellite-results').setAttribute('aria-busy', 'true')
  setLoadingStatus('fetching')
  refreshVisible()
  try {
    const loaded = await fetchTLEs(setLoadingStatus, catalogId)
    deselect()
    satellites = loaded
    elementAges = summarizeElementAges(satellites)
    lastPropagatedTime = null
    positionScheduler.reset()
    propagateSatellites(clock.getTime())
  } catch (error) {
    loadFailed = true
    document.getElementById('load-notice-title').textContent = `Couldn’t load ${CATALOGS[catalogId].label.toLowerCase()}`
    document.getElementById('load-notice-text').textContent = satellites.length
      ? 'The feed is unavailable. Your previous catalog is still on the map.'
      : 'The satellite feed is unavailable. Try again or choose another catalog.'
    document.getElementById('load-notice').classList.remove('hidden')
    throw error
  } finally {
    loading = false
    document.getElementById('satellite-results').setAttribute('aria-busy', 'false')
    refreshVisible()
    refreshFeedStatus()
  }
}

function propagateSatellites(simTime) {
  for (const sat of satellites) {
    sat.position = propagatePosition(sat.satrec, simTime)
    sat.trail = updateSatelliteTrail(sat.trail, sat.satrec, sat.position, simTime)
  }
  lastPropagatedTime = simTime.getTime()
  refreshVisible()
  if (selectedSat) updateInfoPanel(selectedSat, selectedSat.position, getObserverData(selectedSat))
}

function refreshTime() {
  const simTime = clock.getTime()
  setText(simTimeEl, formatDate(simTime))
  simTimeEl.dateTime = simTime.toISOString()
  const mode = clock.isPaused() ? 'PAUSED' : Math.abs(simTime.getTime() - Date.now()) < 5000 && clock.getSpeed() === 1 ? 'NOW' : 'SIMULATION'
  setText(document.getElementById('time-mode'), mode)
  setText(document.getElementById('map-mode'), `EARTH / ${mode}`)
}

let lastRaf = performance.now()
function animate(now) {
  const simTime = clock.tick(now - lastRaf)
  lastRaf = now
  if (simTime.getTime() !== lastPropagatedTime && positionScheduler.shouldRun(now)) {
    propagateSatellites(simTime)
    refreshTime()
  }
  if (selectedSat && (lastTrackTime === null || Math.abs(simTime.getTime() - lastTrackTime) >= 15000) && trackScheduler.shouldRun(now)) {
    renderGroundTrack(map, selectedSat, simTime)
    lastTrackTime = simTime.getTime()
  }
  if (statusScheduler.shouldRun(now)) refreshFeedStatus()
  requestAnimationFrame(animate)
}

function setupLocation() {
  const button = document.getElementById('locate-me')
  const status = document.getElementById('location-status')
  let dismissTimer
  function showStatus(message) {
    clearTimeout(dismissTimer)
    status.textContent = message
    status.classList.remove('hidden')
    dismissTimer = setTimeout(() => status.classList.add('hidden'), 8000)
  }
  button.addEventListener('click', () => {
    if (!navigator.geolocation) { showStatus('Location is not available in this browser.'); return }
    button.disabled = true
    showStatus('Allow location access to check which satellites are above your horizon.')
    navigator.geolocation.getCurrentPosition(position => {
      observer = { lat: position.coords.latitude, lon: position.coords.longitude }
      observerMarker?.remove()
      observerMarker = L.marker([observer.lat, observer.lon], {
        icon: L.divIcon({ className: '', html: '<div class="observer-dot"></div>', iconSize: [12, 12], iconAnchor: [6, 6] }),
      }).addTo(map).bindTooltip('Your location')
      button.disabled = false
      button.setAttribute('aria-pressed', 'true')
      showStatus('Location set. Select a satellite to check its elevation above your horizon.')
      if (selectedSat) updateInfoPanel(selectedSat, selectedSat.position, getObserverData(selectedSat))
    }, error => {
      button.disabled = false
      showStatus(error.code === 1 ? 'Location access was denied. You can still explore every satellite.' : 'Couldn’t find your location. Try again when your connection improves.')
    }, { timeout: 10000, maximumAge: 300000 })
  })
}

function setupKeyboardShortcuts() {
  document.addEventListener('keydown', event => {
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || document.querySelector('dialog[open]')) return
    if (event.key === 'Escape') { deselect({ restoreFocus: Boolean(selectedSat) }); return }
    const target = event.target
    if (target.closest('input, textarea, select, button, a, summary, [contenteditable="true"]')) return
    if (event.key === '/') { event.preventDefault(); searchBar.focus(); return }
    // Leaflet keeps its own arrow/plus/minus map navigation shortcuts.
    if (target.closest('#map')) return
    if (event.key === ' ') { event.preventDefault(); timeControls.toggle(); return }
    const speeds = [1, 10, 100, 1000]
    const index = speeds.indexOf(clock.getSpeed())
    if (['+', '='].includes(event.key)) timeControls.setSpeed(speeds[Math.min(index + 1, speeds.length - 1)])
    if (event.key === '-') timeControls.setSpeed(speeds[Math.max(index - 1, 0)])
  })
}

for (const [buttonId, dialogId] of [['help-button', 'help-dialog'], ['data-details-button', 'data-dialog']]) {
  const dialog = document.getElementById(dialogId)
  document.getElementById(buttonId).addEventListener('click', () => dialog.showModal())
  dialog.addEventListener('click', event => {
    const rect = dialog.getBoundingClientRect()
    if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close()
  })
}
resultsToggle.addEventListener('click', () => setResultsOpen(!explorer.classList.contains('results-open')))
document.getElementById('retry-load').addEventListener('click', () => catalogSelector.selectCatalog(requestedCatalogId))
document.getElementById('world-view').addEventListener('click', () => {
  deselect()
  map.setView([20, 0], 2, { animate: false })
})
new ResizeObserver(() => map.invalidateSize({ pan: false })).observe(document.getElementById('map-container'))
setupLocation()
setupKeyboardShortcuts()
clock.play()
timeControls.sync()
refreshTime()
requestAnimationFrame(animate)
catalogSelector.selectCatalog(DEFAULT_CATALOG_ID)
