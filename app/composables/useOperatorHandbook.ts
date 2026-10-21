import type { AsyncData, NuxtError } from '#app'
import type { Ref, ComputedRef } from 'vue'
import type { OperatorHandbook } from '~~/shared/schemas/handbook'
import { isValidOperatorDataId } from '~~/shared/utils/operatorData'
import type { OperatorDataFetcher } from '~~/shared/utils/operatorData'

const handbookCache = new Map<string, OperatorHandbook>()

/**
 * Loads an operator dossier from the Nitro handbook endpoint and caches the
 * parsed entry in memory.
 * Returns null if the dossier does not exist (e.g. Amiya patch forms).
 */
export async function fetchOperatorHandbook(
  charId: string,
  fetcher: OperatorDataFetcher = (url) => $fetch(url),
): Promise<OperatorHandbook | null> {
  if (!charId || typeof charId !== 'string') return null
  const cleanId = charId.trim()
  if (!isValidOperatorDataId(cleanId)) return null

  const cached = handbookCache.get(cleanId)
  if (cached) {
    return cached
  }

  try {
    const data = await fetcher(`/api/handbook/${cleanId}`)
    if (data === null || typeof data !== 'object' || Array.isArray(data)) return null
    const handbook = data as OperatorHandbook
    handbookCache.set(cleanId, handbook)
    return handbook
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
  const requestFetch = useRequestFetch()

  return useAsyncData<OperatorHandbook | null>(
    () => `operator-handbook-${getId()}`,
    () => fetchOperatorHandbook(getId(), requestFetch),
    {
      default: () => null,
      watch: typeof charId === 'string' ? [] : [() => toValue(charId)],
    },
  )
}
