import type { AsyncData, NuxtError } from '#app'
import type { OperatorDetail } from '~/../shared/schemas/operator'
import { isValidOperatorDataId } from '~/../shared/utils/operatorData'
import type { OperatorDataFetcher } from '~/../shared/utils/operatorData'
import { asJsonFetcher, fetchJson } from '~/utils/fetchJson'

/**
 * Loads full OperatorDetail data through the Nitro data endpoint.
 * Works uniformly in SSR (via `useRequestFetch`) and on the client (`$fetch`),
 * and returns null for unknown ids or failed requests.
 */
export async function fetchOperatorDetail(
  id: string,
  fetcher: OperatorDataFetcher = fetchJson,
): Promise<OperatorDetail | null> {
  if (!id || typeof id !== 'string') return null
  const cleanId = id.trim()
  if (!isValidOperatorDataId(cleanId)) return null

  try {
    const data = await fetcher(`/api/operators/${cleanId}`)
    if (data === null || typeof data !== 'object' || Array.isArray(data)) return null
    return data as OperatorDetail
  } catch (_err) {
    // Unknown operator or malformed dataset: the page renders its 404 state.
    return null
  }
}

/**
 * Composable providing reactive OperatorDetail data with loading and error states.
 */
export function useOperatorDetail(
  operatorId: Ref<string> | ComputedRef<string>,
): AsyncData<OperatorDetail | null, NuxtError | undefined> {
  const requestFetch = useRequestFetch()

  return useAsyncData<OperatorDetail | null>(
    () => `operator-detail-${toValue(operatorId)}`,
    () => fetchOperatorDetail(toValue(operatorId), asJsonFetcher(requestFetch)),
    {
      default: () => null,
      watch: [() => toValue(operatorId)],
    },
  )
}
