import { applyFilters } from './filterPanel.js'
import { filterSatellites } from './searchBar.js'

export function getSatelliteStatus(satellites, searchQuery, activeFilters) {
  const positioned = satellites.filter(sat => sat.position)
  const searched = searchQuery
    ? filterSatellites(positioned, searchQuery)
    : positioned
  const visible = applyFilters(searched, activeFilters)
  const total = positioned.length
  const isNarrowed = Boolean(searchQuery) || visible.length !== total

  return {
    total,
    visible: visible.length,
    label: isNarrowed
      ? `${visible.length.toLocaleString()} / ${total.toLocaleString()}`
      : `${total.toLocaleString()} satellites`,
  }
}
