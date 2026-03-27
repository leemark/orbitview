import { CATEGORIES, CATEGORY_LABELS, CATEGORY_COLORS, getOrbitRegime } from '../data/categories.js'

const REGIMES = ['LEO', 'MEO', 'GEO', 'HEO']

export function createFilterPanel(container, onFilterChange) {
  const activeCategories = new Set(CATEGORIES)
  const activeRegimes    = new Set(REGIMES)

  container.innerHTML = `
    <div class="filter-group">
      <div class="filter-wrap">
        ${CATEGORIES.map(cat => `
          <button class="filter-btn active" data-type="cat" data-value="${cat}"
            title="${CATEGORY_LABELS[cat]}" style="--cat-color: ${CATEGORY_COLORS[cat]}">
            ${CATEGORY_LABELS[cat]}
          </button>`).join('')}
      </div>
      <div class="filter-wrap">
        ${REGIMES.map(r => `
          <button class="filter-btn active regime-btn" data-type="regime" data-value="${r}"
            style="--cat-color: var(--color-accent)">${r}
          </button>`).join('')}
      </div>
    </div>
  `

  container.addEventListener('click', (e) => {
    const btn = e.target.closest('.filter-btn')
    if (!btn) return
    const { type, value } = btn.dataset
    const set = type === 'cat' ? activeCategories : activeRegimes
    if (set.has(value)) {
      set.delete(value)
      btn.classList.remove('active')
    } else {
      set.add(value)
      btn.classList.add('active')
    }
    onFilterChange({ categories: new Set(activeCategories), regimes: new Set(activeRegimes) })
  })

  return {
    getActiveCategories: () => new Set(activeCategories),
    getActiveRegimes:    () => new Set(activeRegimes),
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
