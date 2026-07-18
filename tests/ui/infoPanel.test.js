import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('showInfoPanel', () => {
  beforeEach(() => {
    vi.resetModules()
    document.body.innerHTML = '<aside id="info-panel" class="hidden"></aside>'
  })

  it('renders a third-party satellite name as text rather than HTML', async () => {
    const { showInfoPanel } = await import('../../src/ui/infoPanel.js')
    const maliciousName = '<img src=x onerror="window.__orbitviewXss = true">'

    showInfoPanel(
      {
        name: maliciousName,
        noradId: 12345,
        category: 'other',
        epoch: new Date(),
      },
      {
        lat: 0,
        lon: 0,
        alt: 400,
        velocity: 7.7,
      }
    )

    const panel = document.getElementById('info-panel')
    expect(panel.querySelector('.sat-name').textContent).toBe(maliciousName)
    expect(panel.querySelector('img')).toBeNull()
  })

  it('updates values without replacing the panel controls or losing focus', async () => {
    const { showInfoPanel, updateInfoPanel } = await import('../../src/ui/infoPanel.js')
    const sat = {
      name: 'ISS (ZARYA)',
      noradId: 25544,
      category: 'stations',
      epoch: new Date(),
      dataSource: 'CelesTrak',
      catalogLabel: 'Stations',
      elementFormat: 'OMM',
    }

    showInfoPanel(
      sat,
      { lat: 0, lon: 0, alt: 400, velocity: 7.7 },
      undefined
    )

    const panel = document.getElementById('info-panel')
    const closeButton = panel.querySelector('#close-panel')
    closeButton.focus()

    updateInfoPanel(
      sat,
      { lat: 12.34, lon: -45.67, alt: 410, velocity: 7.65 },
      { elevation: 25.5, azimuth: 123.4, range: 987.6 }
    )

    expect(panel.querySelector('#close-panel')).toBe(closeButton)
    expect(document.activeElement).toBe(closeButton)
    expect(panel.querySelector('[data-field="latitude"]').textContent).toBe('12.34°N')
    expect(panel.querySelector('[data-field="visibility"]').textContent)
      .toBe('✓ El 25.5° · Az 123.4° · 988 km')
    expect(panel.querySelector('[data-field="source"]').textContent).toBe('CelesTrak')
    expect(panel.querySelector('[data-field="catalog"]').textContent).toBe('Stations')
    expect(panel.querySelector('[data-field="element-format"]').textContent).toBe('OMM')
    expect(panel.querySelector('[data-field="element-status"]').textContent).toContain('Current')
  })

  it('flags orbital elements older than three days as stale', async () => {
    const { showInfoPanel } = await import('../../src/ui/infoPanel.js')
    showInfoPanel(
      {
        name: 'OLD SAT',
        noradId: 123,
        category: 'other',
        epoch: new Date(Date.now() - 4 * 24 * 3600 * 1000),
        dataSource: 'CelesTrak',
        catalogLabel: 'Overview',
        elementFormat: 'OMM',
      },
      { lat: 0, lon: 0, alt: 400, velocity: 7.7 }
    )

    const status = document.querySelector('[data-field="element-status"]')
    expect(status.textContent).toContain('Stale')
    expect(status.classList.contains('element-stale')).toBe(true)
  })

  it('binds the close action once per panel lifecycle', async () => {
    const { showInfoPanel, updateInfoPanel } = await import('../../src/ui/infoPanel.js')
    const onDeselect = vi.fn()
    window.orbitview = { onDeselect }
    const sat = {
      name: 'ISS (ZARYA)',
      noradId: 25544,
      category: 'stations',
      epoch: new Date(),
    }
    const position = { lat: 0, lon: 0, alt: 400, velocity: 7.7 }

    showInfoPanel(sat, position)
    updateInfoPanel(sat, position)
    updateInfoPanel(sat, position)
    document.getElementById('close-panel').click()

    expect(onDeselect).toHaveBeenCalledTimes(1)
  })
})
