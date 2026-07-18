import {
  formatAlt,
  formatVelocity,
  formatCoord,
  formatTLEAge,
  formatDate,
} from '../utils/format.js'
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
      <h3>Predicted Position</h3>
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
      <h3>Orbital Elements</h3>
      <div class="info-row">
        <span class="label">Source</span>
        <span class="value" data-field="source"></span>
      </div>
      <div class="info-row">
        <span class="label">Catalog</span>
        <span class="value" data-field="catalog"></span>
      </div>
      <div class="info-row">
        <span class="label">Format</span>
        <span class="value mono" data-field="element-format"></span>
      </div>
      <div class="info-row">
        <span class="label">Epoch</span>
        <span class="value mono" data-field="element-epoch"></span>
      </div>
      <div class="info-row">
        <span class="label">Element Age</span>
        <span class="value mono">
          <span data-field="element-age"></span>
          <span class="element-status" data-field="element-status"></span>
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
    source: panel.querySelector('[data-field="source"]'),
    catalog: panel.querySelector('[data-field="catalog"]'),
    elementFormat: panel.querySelector('[data-field="element-format"]'),
    elementEpoch: panel.querySelector('[data-field="element-epoch"]'),
    elementAge: panel.querySelector('[data-field="element-age"]'),
    elementStatus: panel.querySelector('[data-field="element-status"]'),
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
  setText(panelRefs.source, sat.dataSource ?? 'Unknown')
  setText(panelRefs.catalog, sat.catalogLabel ?? 'Unknown')
  setText(panelRefs.elementFormat, sat.elementFormat ?? 'Unknown')
  setText(panelRefs.elementEpoch, formatDate(sat.epoch))
  setText(panelRefs.elementAge, formatTLEAge(sat.epoch))
  const hasStaleElements =
    (Date.now() - sat.epoch.getTime()) > 3 * 24 * 3600 * 1000
  setText(panelRefs.elementStatus, hasStaleElements ? ' · ⚠ Stale' : ' · Current')
  panelRefs.elementStatus.className =
    `element-status ${hasStaleElements ? 'element-stale' : 'element-current'}`

  const hasObserver = observerData !== undefined
  panelRefs.visibilityRow.classList.toggle('hidden', !hasObserver)
  if (hasObserver) {
    const isVisible = Boolean(observerData)
    setText(
      panelRefs.visibility,
      isVisible
        ? `✓ El ${observerData.elevation.toFixed(1)}° · ` +
          `Az ${observerData.azimuth.toFixed(1)}° · ${observerData.range.toFixed(0)} km`
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
