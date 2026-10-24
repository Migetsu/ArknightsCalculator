import type { GameItem } from '../../shared/schemas/item'
import { isValidItemId } from '../../shared/utils/itemData'

let itemsById: Map<string, GameItem> | null = null

async function loadItems(): Promise<Map<string, GameItem>> {
  if (itemsById) return itemsById

  try {
    const raw = await useStorage('assets:items').getItem('items.json')
    if (!Array.isArray(raw)) {
      itemsById = new Map()
      return itemsById
    }
    itemsById = new Map((raw as GameItem[]).map((it) => [it.id, it]))
    return itemsById
  } catch (_err) {
    return new Map()
  }
}

export async function readItem(id: string): Promise<GameItem | null> {
  if (!isValidItemId(id)) return null
  const items = await loadItems()
  return items.get(id) ?? null
}

export async function readAllItems(): Promise<Map<string, GameItem>> {
  return loadItems()
}
