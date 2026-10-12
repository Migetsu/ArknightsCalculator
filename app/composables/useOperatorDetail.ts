import type { AsyncData, NuxtError } from '#app'
import type { OperatorDetail } from '~/../shared/schemas/operator'

/**
 * Loads full OperatorDetail data asynchronously by operator ID.
 * Works uniformly in SSR and Client-side environments using dynamic import.
 */
export async function fetchOperatorDetail(id: string): Promise<OperatorDetail | null> {
  if (!id || typeof id !== 'string') return null
  const cleanId = id.trim()

  try {
    // Dynamic import allows Vite/Nitro to create separate lazy chunks for each operator
    const module = await import(`../../data/operators/${cleanId}.json`)
    return (module.default ?? module) as OperatorDetail
  } catch (_err) {
    // Return null when file does not exist (operator not found / 404)
    return null
  }
}

/**
 * Composable providing reactive OperatorDetail data with loading and error states.
 */
export function useOperatorDetail(
  operatorId: Ref<string> | ComputedRef<string>,
): AsyncData<OperatorDetail | null, NuxtError | undefined> {
  return useAsyncData<OperatorDetail | null>(
    () => `operator-detail-${toValue(operatorId)}`,
    () => fetchOperatorDetail(toValue(operatorId)),
    {
      default: () => null,
      watch: [() => toValue(operatorId)],
    },
  )
}
