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
})
