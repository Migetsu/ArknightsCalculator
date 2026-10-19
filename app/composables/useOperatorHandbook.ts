import type { AsyncData, NuxtError } from '#app'
import type { Ref, ComputedRef } from 'vue'
import type { OperatorHandbook } from '~~/shared/schemas/handbook'

const handbookCache = new Map<string, OperatorHandbook>()

/**
 * Loads operator handbook asynchronously by charId.
 * Asynchronously imports data/handbook/<charId>.json in an individual lazy chunk
 * and caches the loaded entry in memory.
 * Returns null if the file does not exist (e.g. Amiya patch forms).
 */
export async function fetchOperatorHandbook(charId: string): Promise<OperatorHandbook | null> {
  if (!charId || typeof charId !== 'string') return null
  const cleanId = charId.trim()

  if (handbookCache.has(cleanId)) {
    return handbookCache.get(cleanId) ?? null
  }

  try {
    const module = await import(`../../data/handbook/${cleanId}.json`)
    const data = (module.default ?? module) as OperatorHandbook
    handbookCache.set(cleanId, data)
    return data
  } catch (_err) {
    return null
  }
}

/**
 * Clears the in-memory handbook cache (useful for testing and memory resets).
 */
export function clearHandbookCache(): void {
  handbookCache.clear()
}

/**
 * Reactive composable providing operator handbook data with SSR support,
 * loading state, and in-memory caching.
 */
export function useOperatorHandbook(
  charId: Ref<string> | ComputedRef<string> | string,
): AsyncData<OperatorHandbook | null, NuxtError | undefined> {
  const getId = () => (typeof charId === 'string' ? charId : toValue(charId))

  return useAsyncData<OperatorHandbook | null>(
    () => `operator-handbook-${getId()}`,
    () => fetchOperatorHandbook(getId()),
    {
      default: () => null,
      watch: typeof charId === 'string' ? [] : [() => toValue(charId)],
    },
  )
}
