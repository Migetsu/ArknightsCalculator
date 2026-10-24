import type { FarmingDataResponse } from '~/../shared/utils/farming/farmingData'
import { fetchJson } from '~/utils/fetchJson'
import type { JsonFetcher } from '~/utils/fetchJson'

export async function fetchFarmingData(
  server: 'global' | 'cn' = 'global',
  fetcher: JsonFetcher = fetchJson,
): Promise<FarmingDataResponse> {
  const url = `/api/farming/data?server=${encodeURIComponent(server)}`
  const data = await fetcher(url)
  return data as FarmingDataResponse
}
