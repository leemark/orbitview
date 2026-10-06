export function createSearchBar(container, onSearch, onOpenResults = () => {}) {
  container.innerHTML = `
    <div class="search-wrap">
      <span class="search-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="10" cy="10" r="6.5"/><path d="m15 15 5 5"/></svg></span>
      <input
        id="sat-search"
        type="search"
        placeholder="Search name or NORAD ID"
        aria-label="Search satellites by name or NORAD ID"
        autocomplete="off"
        spellcheck="false"
        aria-controls="satellite-results"
      />
      <button id="clear-search" class="hidden" aria-label="Clear search">×</button>
    </div>
  `

  const input = container.querySelector('#sat-search')
  const clearButton = container.querySelector('#clear-search')

  function search() {
    clearButton.classList.toggle('hidden', !input.value)
    onSearch(input.value.trim().toLowerCase())
  }

  function clear() {
    input.value = ''
    search()
  }

  input.addEventListener('input', () => {
    search()
  })

  clearButton.addEventListener('click', () => { clear(); input.focus() })

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation()
      clear()
    }
    if (e.key === 'ArrowDown' || e.key === 'Enter') {
      e.preventDefault()
      onOpenResults()
      document.querySelector('.satellite-result')?.focus()
    }
  })

  return {
    focus: () => input.focus(),
    getValue: () => input.value,
    clear,
  }
}

// Substring match on name (case-insensitive) or NORAD ID string.
export function filterSatellites(satellites, query) {
  query = query.trim().toLowerCase()
  if (!query) return satellites
  return satellites.filter(sat =>
    sat.name.toLowerCase().includes(query) ||
    sat.noradId.toString().includes(query)
  )
}
