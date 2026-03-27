import { initMap } from './map/mapManager.js'
import { createSatelliteLayer } from './map/satelliteLayer.js'
import { fetchTLEs, getCacheAge } from './data/tleLoader.js'
import { propagatePosition } from './engine/propagator.js'
import { Clock } from './engine/clock.js'
import { formatTLEAge, formatDate } from './utils/format.js'

const map = initMap('map')
const clock = new Clock()
let satellites = []
let satLayer = null

const satCountEl = document.getElementById('sat-count')
const simTimeEl = document.getElementById('sim-time')
const freshnessEl = document.getElementById('data-freshness')

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

    satLayer = createSatelliteLayer(map, null, null)
    updateStatus()
    clock.play()
    requestAnimationFrame(animate)
  } catch (err) {
    satCountEl.textContent = 'Failed to load TLEs'
    console.error(err)
  }
}

init()
