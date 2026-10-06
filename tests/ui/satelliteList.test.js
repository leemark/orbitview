import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createSatelliteList } from '../../src/ui/satelliteList.js'
import { createSearchBar } from '../../src/ui/searchBar.js'

describe('satellite browsing', () => {
  let container
  beforeEach(() => {
    document.body.innerHTML = '<div id="search"></div><div id="satellite-results"></div>'
    container = document.getElementById('satellite-results')
  })

  it('offers keyboard selection without replacing focused results as positions update', () => {
    const select = vi.fn()
    const list = createSatelliteList(container, select, vi.fn())
    const sat = { name: 'ISS (ZARYA)', noradId: 25544, category: 'stations', position: { alt: 400 } }
    list.update([sat])
    const button = container.querySelector('button')
    button.focus()
    sat.position.alt = 401
    list.update([sat])
    expect(document.activeElement).toBe(button)
    button.click()
    expect(select).toHaveBeenCalledWith(sat)
    list.setSelected(25544)
    expect(button.getAttribute('aria-pressed')).toBe('true')
    const refreshed = { ...sat, position: { alt: 410 } }
    list.update([refreshed])
    button.click()
    expect(select).toHaveBeenLastCalledWith(refreshed)
    expect(select.mock.lastCall[0]).toBe(refreshed)
  })

  it('renders untrusted names as text', () => {
    const name = '<img src=x onerror=alert(1)>'
    createSatelliteList(container, vi.fn(), vi.fn()).update([{ name, noradId: 1, category: 'other' }])
    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector('.result-name').textContent).toBe(name)
  })

  it('moves from search into results with ArrowDown and clears with Escape', () => {
    const search = vi.fn()
    createSatelliteList(container, vi.fn(), vi.fn()).update([{ name: 'ISS', noradId: 25544, category: 'stations' }])
    createSearchBar(document.getElementById('search'), search)
    const input = document.getElementById('sat-search')
    input.value = ' ISS '
    input.dispatchEvent(new Event('input'))
    expect(search).toHaveBeenLastCalledWith('iss')
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    expect(document.activeElement).toBe(container.querySelector('.satellite-result'))
    input.focus()
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(input.value).toBe('')
    expect(search).toHaveBeenLastCalledWith('')
  })

  it('makes the next page reachable by keyboard and shows explicit empty recovery', () => {
    const reset = vi.fn()
    const list = createSatelliteList(container, vi.fn(), reset)
    list.update(Array.from({ length: 45 }, (_, i) => ({ name: `SAT ${i}`, noradId: i + 1, category: 'other' })))
    expect(container.querySelectorAll('.satellite-result')).toHaveLength(40)
    container.querySelector('.show-more').click()
    expect(container.querySelectorAll('.satellite-result')).toHaveLength(45)
    expect(document.activeElement.dataset.satelliteId).toBe('41')
    list.update([])
    expect(container.textContent).toContain('No satellites match')
    container.querySelector('button').click()
    expect(reset).toHaveBeenCalledOnce()
  })
})
