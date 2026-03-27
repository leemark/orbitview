import { initMap } from './map/mapManager.js'
import { createSatelliteLayer } from './map/satelliteLayer.js'
import { renderGroundTrack, clearGroundTrack } from './map/groundTrack.js'
import { fetchTLEs, getCacheAge } from './data/tleLoader.js'
import { propagatePosition } from './engine/propagator.js'
import { Clock } from './engine/clock.js'
import { formatTLEAge, formatDate } from './utils/format.js'
import { showInfoPanel, hideInfoPanel, updateInfoPanel } from './ui/infoPanel.js'

const map = initMap('map')
const clock = new Clock()
let satellites = []
let satLayer = null
let selectedSat = null

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

function handleSelect(sat) {
  selectedSat = sat
  if (sat) {
    showInfoPanel(sat, sat.position)
    renderGroundTrack(map, sat, clock.getTime())
  } else {
    hideInfoPanel()
    clearGroundTrack(map)
  }
}

function updateStatus() {
  const visible = satellites.filter(s => s.position).length
  satCountEl.textContent = `${visible.toLocaleString()} satellites`
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
    updateInfoPanel(selectedSat, selectedSat.position)
    if (clock.getSpeed() > 1) {
      renderGroundTrack(map, selectedSat, simTime)
    }
  }
  satLayer?.update(satellites)
  requestAnimationFrame(animate)
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
    updateStatus()
    clock.play()
    requestAnimationFrame(animate)
  } catch (err) {
    satCountEl.textContent = 'Failed to load TLEs'
    console.error(err)
  }
}

init()
