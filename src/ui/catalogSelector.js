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
  select.setAttribute('aria-describedby', 'catalog-description')

  for (const [id, catalog] of Object.entries(CATALOGS)) {
    const option = document.createElement('option')
    option.value = id
    option.textContent = catalog.label
    option.title = catalog.description
    select.appendChild(option)
  }
  select.value = DEFAULT_CATALOG_ID

  label.append(labelText, select)
  const description = document.createElement('p')
  description.id = 'catalog-description'
  description.textContent = CATALOGS[DEFAULT_CATALOG_ID].description
  container.replaceChildren(label, description)

  let activeCatalogId = DEFAULT_CATALOG_ID
  async function selectCatalog(requestedCatalogId) {
    if (select.disabled || !CATALOGS[requestedCatalogId]) return
    select.value = requestedCatalogId
    select.disabled = true
    try {
      await onCatalogChange(requestedCatalogId)
      activeCatalogId = requestedCatalogId
      label.title = CATALOGS[activeCatalogId].description
      description.textContent = CATALOGS[activeCatalogId].description
    } catch {
      select.value = activeCatalogId
    } finally {
      select.disabled = false
    }
  }
  select.addEventListener('change', () => selectCatalog(select.value))

  return {
    getCatalogId: () => activeCatalogId,
    setDisabled: disabled => { select.disabled = disabled },
    selectCatalog,
  }
}

