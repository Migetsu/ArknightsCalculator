import type { GameItem } from '~/../shared/schemas/item'
import { isValidItemId } from '~/../shared/utils/itemData'
import { fetchJson } from '~/utils/fetchJson'
import type { JsonFetcher } from '~/utils/fetchJson'

/** In-memory cache for resolved items on the client. */
const itemCache = new Map<string, GameItem | null>()
const inFlightRequests = new Map<string, Promise<GameItem | null>>()

export function getCachedItem(id: string): GameItem | null | undefined {
  return itemCache.get(id)
}

export function setCachedItem(id: string, item: GameItem | null): void {
  itemCache.set(id, item)
}

export async function fetchItemMeta(
  id: string,
  fetcher: JsonFetcher = fetchJson,
): Promise<GameItem | null> {
  if (!id || typeof id !== 'string') return null
  const cleanId = id.trim()
  if (!isValidItemId(cleanId)) return null

  if (itemCache.has(cleanId)) {
    return itemCache.get(cleanId) ?? null
  }

  const inFlight = inFlightRequests.get(cleanId)
  if (inFlight) return inFlight

  const promise = (async () => {
    try {
      const data = await fetcher(`/api/items/${encodeURIComponent(cleanId)}`)
      if (data && typeof data === 'object' && 'id' in data) {
        const item = data as GameItem
        itemCache.set(cleanId, item)
        return item
      }
      itemCache.set(cleanId, null)
      return null
    } catch (_err) {
      itemCache.set(cleanId, null)
      return null
    } finally {
      inFlightRequests.delete(cleanId)
    }
  })()

  inFlightRequests.set(cleanId, promise)
  return promise
}
