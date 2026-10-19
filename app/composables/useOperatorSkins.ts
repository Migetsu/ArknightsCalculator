import type { AsyncData, NuxtError } from '#app'
import type { Ref, ComputedRef } from 'vue'
import type { Skin } from '~~/shared/schemas/skin'

let skinsByCharIdCache: Map<string, Skin[]> | null = null

/**
 * Loads skins for a specific operator by charId.
 * Asynchronously imports data/skins.json in a separate lazy chunk and caches the index map.
 */
export async function fetchOperatorSkins(charId: string): Promise<Skin[]> {
  if (!charId || typeof charId !== 'string') return []
  const cleanId = charId.trim()

  if (!skinsByCharIdCache) {
    try {
      const module = await import('~/../data/skins.json')
      const rawData = (module.default ?? module) as Skin[]
      const map = new Map<string, Skin[]>()
      for (const skin of rawData) {
        const list = map.get(skin.charId) ?? []
        list.push(skin)
        map.set(skin.charId, list)
      }
      skinsByCharIdCache = map
    } catch (_err) {
      return []
    }
  }

  return skinsByCharIdCache.get(cleanId) ?? []
}

/**
 * Reactive composable providing operator skins with SSR support and cache.
 */
export function useOperatorSkins(
  charId: Ref<string> | ComputedRef<string> | string,
): AsyncData<Skin[], NuxtError | undefined> {
  const getId = () => (typeof charId === 'string' ? charId : toValue(charId))

  return useAsyncData<Skin[]>(
    () => `operator-skins-${getId()}`,
    () => fetchOperatorSkins(getId()),
    {
      default: () => [],
      watch: typeof charId === 'string' ? [] : [() => toValue(charId)],
    },
  )
}
