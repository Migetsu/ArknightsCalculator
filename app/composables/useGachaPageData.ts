import type { AsyncData, NuxtError } from '#app'
import type { GachaPageData } from '~~/shared/utils/gachaPageData'
import { emptyGachaPageData, isGachaPageData } from '~~/shared/utils/gachaPageData'
import { asJsonFetcher, fetchJson, type JsonFetcher } from '~/utils/fetchJson'

/**
 * Loads the compact /gacha payload (current Global banner + upcoming CN window)
 * from Nitro. The full banners dataset stays a server asset.
 */
export async function fetchGachaPageData(fetcher: JsonFetcher = fetchJson): Promise<GachaPageData> {
  const data = await fetcher('/api/gacha/banners')
  if (!isGachaPageData(data)) {
    throw new Error('Unexpected gacha page payload')
  }
  return data
}

export function useGachaPageData(): AsyncData<GachaPageData, NuxtError | undefined> {
  const requestFetch = useRequestFetch()

  return useAsyncData<GachaPageData>(
    'gacha-page-data',
    () => fetchGachaPageData(asJsonFetcher(requestFetch)),
    {
      default: (): GachaPageData => emptyGachaPageData(),
    },
  )
}
