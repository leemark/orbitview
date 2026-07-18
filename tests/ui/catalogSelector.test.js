import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createCatalogSelector } from '../../src/ui/catalogSelector.js'

describe('createCatalogSelector', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="catalog"></div>'
  })

  it('loads a selected catalog and exposes the active choice', async () => {
    const onChange = vi.fn().mockResolvedValue(undefined)
    const selector = createCatalogSelector(
      document.getElementById('catalog'),
      onChange
    )
    const select = document.getElementById('catalog-select')

    select.value = 'stations'
    select.dispatchEvent(new Event('change'))
    await vi.waitFor(() => expect(onChange).toHaveBeenCalledWith('stations'))
    await vi.waitFor(() => expect(select.disabled).toBe(false))

    expect(selector.getCatalogId()).toBe('stations')
  })

  it('restores the previous choice when loading fails', async () => {
    const selector = createCatalogSelector(
      document.getElementById('catalog'),
      vi.fn().mockRejectedValue(new Error('network failed'))
    )
    const select = document.getElementById('catalog-select')

    select.value = 'weather'
    select.dispatchEvent(new Event('change'))
    await vi.waitFor(() => expect(select.disabled).toBe(false))

    expect(select.value).toBe('overview')
    expect(selector.getCatalogId()).toBe('overview')
  })
})

