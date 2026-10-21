import type { AsyncData, NuxtError } from '#app'
import type { Ref, ComputedRef } from 'vue'
import type { Skin } from '~~/shared/schemas/skin'
import { isValidOperatorDataId } from '~~/shared/utils/operatorData'
import type { OperatorDataFetcher } from '~~/shared/utils/operatorData'
import { asJsonFetcher, fetchJson } from '~/utils/fetchJson'

/**
 * Loads the skins of one operator through the Nitro data endpoint.
 *
 * The dataset itself (1.6 MB) stays a server asset, so the operator page no
 * longer downloads and parses it before hydration. `useAsyncData` still caches
 * the per-operator result on the client, and SSR uses the internal request to
 * avoid an extra network hop.
 */
export async function fetchOperatorSkins(
  charId: string,
  fetcher: OperatorDataFetcher = fetchJson,
): Promise<Skin[]> {
  if (!charId || typeof charId !== 'string') return []
  const cleanId = charId.trim()
  if (!isValidOperatorDataId(cleanId)) return []

  try {
    const data = await fetcher(`/api/skins/${cleanId}`)
    return Array.isArray(data) ? (data as Skin[]) : []
  } catch (_err) {
    return []
  }
}

/**
 * Reactive composable providing operator skins with SSR support and cache.
 */
export function useOperatorSkins(
  charId: Ref<string> | ComputedRef<string> | string,
): AsyncData<Skin[], NuxtError | undefined> {
  const getId = () => (typeof charId === 'string' ? charId : toValue(charId))
  const requestFetch = useRequestFetch()

  return useAsyncData<Skin[]>(
    () => `operator-skins-${getId()}`,
    () => fetchOperatorSkins(getId(), asJsonFetcher(requestFetch)),
    {
      default: () => [],
      watch: typeof charId === 'string' ? [] : [() => toValue(charId)],
    },
  )
}
