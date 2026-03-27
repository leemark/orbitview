export function createSearchBar(container, onSearch) {
  container.innerHTML = `
    <div class="search-wrap">
      <input
        id="sat-search"
        type="search"
        placeholder="Search satellites…"
        aria-label="Search satellites by name or NORAD ID"
        autocomplete="off"
      />
    </div>
  `

  const input = container.querySelector('#sat-search')

  input.addEventListener('input', () => {
    onSearch(input.value.trim().toLowerCase())
  })

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      input.value = ''
      onSearch('')
      input.blur()
    }
  })

  return {
    focus: () => input.focus(),
    getValue: () => input.value,
  }
}

// Substring match on name (case-insensitive) or NORAD ID string.
export function filterSatellites(satellites, query) {
  if (!query) return satellites
  return satellites.filter(sat =>
    sat.name.toLowerCase().includes(query) ||
    sat.noradId.toString().includes(query)
  )
}
