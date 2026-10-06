import { CATEGORIES, CATEGORY_LABELS, CATEGORY_COLORS, getOrbitRegime } from '../data/categories.js'

const REGIMES = ['LEO', 'MEO', 'GEO', 'HEO']
const REGIME_LABELS = {
  LEO: 'Low Earth altitude: below 2,000 km',
  MEO: 'Medium Earth altitude: 2,000–35,000 km',
  GEO: 'Geosynchronous altitude: 35,000–36,500 km',
  HEO: 'High Earth altitude: above 36,500 km',
}

export function createFilterPanel(container, onFilterChange) {
  const activeCategories = new Set(CATEGORIES)
  const activeRegimes    = new Set(REGIMES)

  container.innerHTML = `
    <details class="filters-disclosure">
      <summary>Filters <span data-filter-count></span></summary>
      <div class="filter-content">
        <div class="filter-group category-group">
          <div id="filter-categories-label" class="filter-label">Categories</div>
          <div class="filter-wrap" role="group" aria-labelledby="filter-categories-label">
        ${CATEGORIES.map(cat => `
          <button class="filter-btn active" type="button" data-type="cat" data-category="${cat}" data-value="${cat}"
            aria-pressed="true" title="${CATEGORY_LABELS[cat]}" style="--cat-color: ${CATEGORY_COLORS[cat]}">
            <span class="filter-dot" aria-hidden="true"></span><span>${CATEGORY_LABELS[cat]}</span>
          </button>`).join('')}
          </div>
        </div>
        <div class="filter-group regime-group">
          <div id="filter-regimes-label" class="filter-label">Altitude band</div>
          <div class="filter-wrap" role="group" aria-labelledby="filter-regimes-label">
        ${REGIMES.map(r => `
          <button class="filter-btn active regime-btn" type="button" data-type="regime" data-value="${r}"
            aria-pressed="true" title="${REGIME_LABELS[r]}" style="--cat-color: var(--color-accent)">
            <span class="filter-dot" aria-hidden="true"></span><span>${r}</span>
          </button>`).join('')}
          </div>
        </div>
        <button class="filter-reset" type="button">Show all</button>
      </div>
    </details>
  `

  const countEl = container.querySelector('[data-filter-count]')

  function hasActiveFilters() {
    return activeCategories.size !== CATEGORIES.length || activeRegimes.size !== REGIMES.length
  }

  function syncButtons() {
    container.querySelectorAll('.filter-btn').forEach(btn => {
      const { type, value } = btn.dataset
      const set = type === 'cat' ? activeCategories : activeRegimes
      const isActive = set.has(value)
      btn.classList.toggle('active', isActive)
      btn.setAttribute('aria-pressed', String(isActive))
    })

    const narrowedCount = (CATEGORIES.length - activeCategories.size) +
      (REGIMES.length - activeRegimes.size)
    countEl.textContent = narrowedCount ? `(${narrowedCount})` : ''
  }

  function emitChange() {
    syncButtons()
    onFilterChange?.({ categories: new Set(activeCategories), regimes: new Set(activeRegimes) })
  }

  container.addEventListener('click', (e) => {
    const btn = e.target.closest('.filter-btn')
    if (btn && container.contains(btn)) {
      const { type, value } = btn.dataset
      const set = type === 'cat' ? activeCategories : activeRegimes
      if (set.has(value)) set.delete(value)
      else set.add(value)
      emitChange()
      return
    }

    if (e.target.closest('.filter-reset')) {
      activeCategories.clear()
      CATEGORIES.forEach(category => activeCategories.add(category))
      activeRegimes.clear()
      REGIMES.forEach(regime => activeRegimes.add(regime))
      emitChange()
    }
  })

  syncButtons()

  return {
    getActiveCategories: () => new Set(activeCategories),
    getActiveRegimes:    () => new Set(activeRegimes),
    reset() {
      activeCategories.clear()
      CATEGORIES.forEach(category => activeCategories.add(category))
      activeRegimes.clear()
      REGIMES.forEach(regime => activeRegimes.add(regime))
      emitChange()
    },
    hasActiveFilters,
  }
}

export function applyFilters(satellites, { categories, regimes }) {
  return satellites.filter(sat => {
    if (!categories.has(sat.category)) return false
    if (sat.position) {
      const regime = getOrbitRegime(sat.position.alt)
      if (!regimes.has(regime)) return false
    }
    return true
  })
}
