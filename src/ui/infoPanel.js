import { formatAlt, formatVelocity, formatCoord, formatTLEAge } from '../utils/format.js'
import { getOrbitRegime } from '../data/categories.js'

const panel = document.getElementById('info-panel')
let panelRefs = null
let panelSatId = null

function buildPanel(sat) {
  panel.innerHTML = `
    <div class="info-header">
      <h2 class="sat-name"></h2>
      <button id="close-panel" aria-label="Close panel">✕</button>
    </div>
    <div class="info-section">
      <div class="info-row">
        <span class="label">NORAD ID</span>
        <span class="value mono" data-field="norad-id"></span>
      </div>
      <div class="info-row">
        <span class="label">Category</span>
        <span class="value" data-field="category"></span>
      </div>
      <div class="info-row">
        <span class="label">Orbit</span>
        <span class="value" data-field="regime"></span>
      </div>
      <div class="info-row hidden" data-row="visibility">
        <span class="label">From your location</span>
        <span class="value" data-field="visibility"></span>
      </div>
    </div>
    <div class="info-section">
      <h3>Current Position</h3>
      <div class="info-row">
        <span class="label">Latitude</span>
        <span class="value mono" data-field="latitude"></span>
      </div>
      <div class="info-row">
        <span class="label">Longitude</span>
        <span class="value mono" data-field="longitude"></span>
      </div>
      <div class="info-row">
        <span class="label">Altitude</span>
        <span class="value mono" data-field="altitude"></span>
      </div>
      <div class="info-row">
        <span class="label">Velocity</span>
        <span class="value mono" data-field="velocity"></span>
      </div>
    </div>
    <div class="info-section">
      <div class="info-row">
        <span class="label">TLE Age</span>
        <span class="value mono">
          <span data-field="tle-age"></span>
          <span class="age-warning hidden" data-field="tle-warning">⚠ Stale TLE</span>
        </span>
      </div>
    </div>
  `

  panelRefs = {
    name: panel.querySelector('.sat-name'),
    close: panel.querySelector('#close-panel'),
    noradId: panel.querySelector('[data-field="norad-id"]'),
    category: panel.querySelector('[data-field="category"]'),
    regime: panel.querySelector('[data-field="regime"]'),
    visibilityRow: panel.querySelector('[data-row="visibility"]'),
    visibility: panel.querySelector('[data-field="visibility"]'),
    latitude: panel.querySelector('[data-field="latitude"]'),
    longitude: panel.querySelector('[data-field="longitude"]'),
    altitude: panel.querySelector('[data-field="altitude"]'),
    velocity: panel.querySelector('[data-field="velocity"]'),
    tleAge: panel.querySelector('[data-field="tle-age"]'),
    tleWarning: panel.querySelector('[data-field="tle-warning"]'),
  }
  panelSatId = sat.noradId

  panelRefs.close.addEventListener('click', () => {
    hideInfoPanel()
    window.orbitview?.onDeselect?.()
  })
}

function setText(element, value) {
  if (element.textContent !== value) element.textContent = value
}

function updatePanel(sat, position, observerData) {
  if (!panelRefs || panelSatId !== sat.noradId) buildPanel(sat)

  setText(panelRefs.name, sat.name)
  setText(panelRefs.noradId, String(sat.noradId))
  setText(panelRefs.category, sat.category)
  setText(panelRefs.regime, getOrbitRegime(position.alt))
  setText(panelRefs.latitude, formatCoord(position.lat, 'lat'))
  setText(panelRefs.longitude, formatCoord(position.lon, 'lon'))
  setText(panelRefs.altitude, formatAlt(position.alt))
  setText(panelRefs.velocity, formatVelocity(position.velocity))
  setText(panelRefs.tleAge, formatTLEAge(sat.epoch))
  panelRefs.tleWarning.classList.toggle(
    'hidden',
    (Date.now() - sat.epoch.getTime()) <= 3 * 24 * 3600 * 1000
  )

  const hasObserver = observerData !== undefined
  panelRefs.visibilityRow.classList.toggle('hidden', !hasObserver)
  if (hasObserver) {
    const isVisible = Boolean(observerData)
    setText(
      panelRefs.visibility,
      isVisible
        ? `✓ Visible (${observerData.elevation.toFixed(1)}°)`
        : 'Below horizon'
    )
    panelRefs.visibility.className = `value ${isVisible ? 'vis-yes' : 'vis-no'}`
  }
}

export function showInfoPanel(sat, position, observerData) {
  if (!sat || !position) { hideInfoPanel(); return }

  updatePanel(sat, position, observerData)
  panel.classList.remove('hidden')
}

export function updateInfoPanel(sat, position, observerData) {
  if (panel.classList.contains('hidden')) return
  if (!sat || !position) { hideInfoPanel(); return }
  updatePanel(sat, position, observerData)
}

export function hideInfoPanel() {
  panel.classList.add('hidden')
  panel.innerHTML = ''
  panelRefs = null
  panelSatId = null
}
