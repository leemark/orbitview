import { formatAlt, formatVelocity, formatCoord, formatTLEAge } from '../utils/format.js'
import { getOrbitRegime } from '../data/categories.js'

const panel = document.getElementById('info-panel')

export function showInfoPanel(sat, position, observerData) {
  if (!sat || !position) { hideInfoPanel(); return }

  const regime = getOrbitRegime(position.alt)
  const ageText = formatTLEAge(sat.epoch)
  const ageWarning = (Date.now() - sat.epoch.getTime()) > 3 * 24 * 3600 * 1000
    ? '<span class="age-warning">⚠ Stale TLE</span>' : ''

  let visibleRow = ''
  if (observerData !== undefined) {
    const visLabel = observerData
      ? `<span class="vis-yes">✓ Visible (${observerData.elevation.toFixed(1)}°)</span>`
      : '<span class="vis-no">Below horizon</span>'
    visibleRow = `
      <div class="info-row">
        <span class="label">From your location</span>
        <span class="value">${visLabel}</span>
      </div>`
  }

  panel.innerHTML = `
    <div class="info-header">
      <h2 class="sat-name">${sat.name}</h2>
      <button id="close-panel" aria-label="Close panel">✕</button>
    </div>
    <div class="info-section">
      <div class="info-row">
        <span class="label">NORAD ID</span>
        <span class="value mono">${sat.noradId}</span>
      </div>
      <div class="info-row">
        <span class="label">Category</span>
        <span class="value">${sat.category}</span>
      </div>
      <div class="info-row">
        <span class="label">Orbit</span>
        <span class="value">${regime}</span>
      </div>
      ${visibleRow}
    </div>
    <div class="info-section">
      <h3>Current Position</h3>
      <div class="info-row">
        <span class="label">Latitude</span>
        <span class="value mono">${formatCoord(position.lat, 'lat')}</span>
      </div>
      <div class="info-row">
        <span class="label">Longitude</span>
        <span class="value mono">${formatCoord(position.lon, 'lon')}</span>
      </div>
      <div class="info-row">
        <span class="label">Altitude</span>
        <span class="value mono">${formatAlt(position.alt)}</span>
      </div>
      <div class="info-row">
        <span class="label">Velocity</span>
        <span class="value mono">${formatVelocity(position.velocity)}</span>
      </div>
    </div>
    <div class="info-section">
      <div class="info-row">
        <span class="label">TLE Age</span>
        <span class="value mono">${ageText} ${ageWarning}</span>
      </div>
    </div>
  `

  document.getElementById('close-panel')?.addEventListener('click', () => {
    hideInfoPanel()
    window.orbitview?.onDeselect?.()
  })

  panel.classList.remove('hidden')
}

export function updateInfoPanel(sat, position, observerData) {
  if (panel.classList.contains('hidden')) return
  showInfoPanel(sat, position, observerData)
}

export function hideInfoPanel() {
  panel.classList.add('hidden')
  panel.innerHTML = ''
}
