import { CATEGORY_COLORS, CATEGORY_LABELS } from '../data/categories.js'

const PAGE_SIZE = 40

// Real buttons make every mapped satellite available to keyboard and touch users.
export function createSatelliteList(container, onSelect, onReset) {
  let satellites = []
  let currentById = new Map()
  let selectedId = null
  let limit = PAGE_SIZE
  let signature = ''
  let emptyState = 'loading'

  function render() {
    const focusedId = container.contains(document.activeElement)
      ? document.activeElement.dataset.satelliteId : null
    container.replaceChildren()
    if (!satellites.length) {
      const empty = document.createElement('div')
      empty.className = 'list-empty'
      const heading = document.createElement('strong')
      const copy = document.createElement('p')
      if (emptyState === 'loading') {
        heading.textContent = 'A world of satellites, on its way.'
        copy.textContent = 'Getting orbital data. The map is ready to explore.'
      } else if (emptyState === 'error') {
        heading.textContent = 'The catalog is taking a break.'
        copy.textContent = 'Try again, or choose another catalog above.'
      } else if (emptyState === 'unavailable') {
        heading.textContent = 'No positions at this time'
        copy.textContent = 'Return to Now or try another catalog.'
      } else {
        heading.textContent = 'No satellites match'
        copy.textContent = 'Try another name or NORAD ID, or clear your filters.'
      }
      empty.append(heading, copy)
      if (emptyState === 'empty') {
        const reset = document.createElement('button')
        reset.className = 'quiet-button'
        reset.textContent = 'Clear search & filters'
        reset.addEventListener('click', onReset)
        empty.append(reset)
      }
      container.append(empty)
      return
    }

    const list = document.createElement('ul')
    list.className = 'satellite-list'
    for (const sat of satellites.slice(0, limit)) {
      const item = document.createElement('li')
      const button = document.createElement('button')
      button.className = 'satellite-result'
      button.dataset.satelliteId = sat.noradId
      button.setAttribute('aria-pressed', String(sat.noradId === selectedId))
      button.style.setProperty('--cat-color', CATEGORY_COLORS[sat.category] ?? CATEGORY_COLORS.other)
      button.innerHTML = '<span class="result-dot" aria-hidden="true"></span><span class="result-copy"><span class="result-name"></span><span class="result-meta"></span></span><span class="result-arrow" aria-hidden="true">↗</span>'
      button.querySelector('.result-name').textContent = sat.name
      button.querySelector('.result-meta').textContent = `${CATEGORY_LABELS[sat.category] ?? sat.category} · ${sat.noradId}`
      button.addEventListener('click', () => {
        const current = currentById.get(sat.noradId)
        if (current) onSelect(current)
      })
      item.append(button)
      list.append(item)
    }
    container.append(list)
    if (satellites.length > limit) {
      const more = document.createElement('button')
      more.className = 'show-more text-button'
      more.textContent = `Show ${Math.min(PAGE_SIZE, satellites.length - limit)} more · ${satellites.length} total`
      more.addEventListener('click', () => {
        const previousLimit = limit
        limit += PAGE_SIZE
        render()
        container.querySelectorAll('.satellite-result')[previousLimit]?.focus()
      })
      container.append(more)
    }
    if (focusedId) container.querySelector(`[data-satellite-id="${focusedId}"]`)?.focus({ preventScroll: true })
  }

  container.addEventListener('keydown', event => {
    const current = event.target.closest('.satellite-result')
    if (!current || !['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const buttons = [...container.querySelectorAll('.satellite-result')]
    const index = buttons.indexOf(current)
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1
      : Math.max(0, Math.min(buttons.length - 1, index + (event.key === 'ArrowDown' ? 1 : -1)))
    buttons[next]?.focus()
  })

  return {
    update(nextSatellites, state = 'empty') {
      currentById = new Map(nextSatellites.map(sat => [sat.noradId, sat]))
      const nextSignature = `${state}:${nextSatellites.map(sat => `${sat.noradId}:${sat.name}:${sat.category}`).join(',')}`
      if (signature === nextSignature) return
      signature = nextSignature
      satellites = [...nextSatellites].sort((a, b) =>
        Number(b.noradId === 25544) - Number(a.noradId === 25544) ||
        Number(b.category === 'stations') - Number(a.category === 'stations') ||
        a.name.localeCompare(b.name, undefined, { numeric: true }))
      emptyState = state
      limit = PAGE_SIZE
      render()
    },
    setSelected(id) {
      selectedId = id
      for (const button of container.querySelectorAll('.satellite-result')) {
        button.setAttribute('aria-pressed', String(Number(button.dataset.satelliteId) === id))
      }
    },
  }
}
