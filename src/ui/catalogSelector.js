import { CATALOGS, DEFAULT_CATALOG_ID } from '../data/catalogs.js'

export function createCatalogSelector(container, onCatalogChange) {
  const label = document.createElement('label')
  label.className = 'catalog-selector'
  label.title = CATALOGS[DEFAULT_CATALOG_ID].description

  const labelText = document.createElement('span')
  labelText.textContent = 'Catalog'

  const select = document.createElement('select')
  select.id = 'catalog-select'
  select.setAttribute('aria-label', 'Satellite catalog')

  for (const [id, catalog] of Object.entries(CATALOGS)) {
    const option = document.createElement('option')
    option.value = id
    option.textContent = catalog.label
    option.title = catalog.description
    select.appendChild(option)
  }
  select.value = DEFAULT_CATALOG_ID

  label.append(labelText, select)
  container.replaceChildren(label)

  let activeCatalogId = DEFAULT_CATALOG_ID
  select.addEventListener('change', async () => {
    const requestedCatalogId = select.value
    select.disabled = true
    try {
      await onCatalogChange(requestedCatalogId)
      activeCatalogId = requestedCatalogId
      label.title = CATALOGS[activeCatalogId].description
    } catch {
      select.value = activeCatalogId
    } finally {
      select.disabled = false
    }
  })

  return {
    getCatalogId: () => activeCatalogId,
    setDisabled: disabled => { select.disabled = disabled },
  }
}

