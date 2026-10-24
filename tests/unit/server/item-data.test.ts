import { describe, it, expect, beforeEach, vi } from 'vitest'
import { readItem, readAllItems } from '../../../server/utils/itemData'
import { isValidItemId } from '../../../shared/utils/itemData'
import rawItems from '../../../data/items.json'

describe('server: itemData', () => {
  beforeEach(() => {
    vi.stubGlobal('useStorage', (namespace: string) => ({
      getItem: async (key: string) => {
        if (namespace === 'assets:items' && key === 'items.json') {
          return rawItems
        }
        return null
      },
    }))
  })

  it('validates item ids properly', () => {
    expect(isValidItemId('30012')).toBe(true)
    expect(isValidItemId('mod_unlock_token')).toBe(true)
    expect(isValidItemId('AP_GAMEPLAY')).toBe(true)
    expect(isValidItemId('act11d0_token_warrant')).toBe(true)
    expect(isValidItemId('')).toBe(false)
    expect(isValidItemId('../secret')).toBe(false)
    expect(isValidItemId('item; rm -rf')).toBe(false)
  })

  it('reads item by id from storage', async () => {
    const item = await readItem('30012')
    expect(item).not.toBeNull()
    expect(item?.id).toBe('30012')
    expect(item?.name.en).toBe('Orirock Cube')
    expect(item?.iconId).toBe('MTL_SL_G2')
    expect(item?.rarity).toBe(2)
  })

  it('returns null for unknown item id', async () => {
    const item = await readItem('non_existent_item_id_xyz')
    expect(item).toBeNull()
  })

  it('returns all items map', async () => {
    const map = await readAllItems()
    expect(map.size).toBeGreaterThan(0)
    expect(map.has('30012')).toBe(true)
    expect(map.has('4001')).toBe(true)
  })
})
