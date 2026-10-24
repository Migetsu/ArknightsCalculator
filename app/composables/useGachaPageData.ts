import type { AsyncData, NuxtError } from '#app'
import type { MaybeRefOrGetter } from 'vue'
import { toRef, toValue } from 'vue'
import type { GachaBanner } from '~~/shared/schemas/banner'
import type { ServerRegion } from '~~/shared/schemas/operator'
import type { GachaPageData } from '~~/shared/utils/gachaPageData'
import { emptyGachaPageData, isGachaPageData } from '~~/shared/utils/gachaPageData'
import { asJsonFetcher, fetchJson, type JsonFetcher } from '~/utils/fetchJson'

/**
 * Loads the compact /gacha payload (current Global/CN banner + upcoming CN window)
 * from Nitro. The full banners dataset stays a server asset.
 */
export async function fetchGachaPageData(
  serverOrFetcher?: ServerRegion | JsonFetcher,
  maybeFetcher?: JsonFetcher,
): Promise<GachaPageData> {
  let server: ServerRegion = 'global'
  let fetcher: JsonFetcher = fetchJson

  if (typeof serverOrFetcher === 'function') {
    fetcher = serverOrFetcher
  } else if (typeof serverOrFetcher === 'string') {
    server = serverOrFetcher
    if (maybeFetcher) fetcher = maybeFetcher
  } else if (maybeFetcher) {
    fetcher = maybeFetcher
  }

  const query = server === 'cn' ? '?server=cn' : ''
  const data = await fetcher(`/api/gacha/banners${query}`)
  if (!isGachaPageData(data)) {
    throw new Error('Unexpected gacha page payload')
  }
  return data
}

export function useGachaPageData(
  server: MaybeRefOrGetter<ServerRegion> = 'global',
): AsyncData<GachaPageData, NuxtError | undefined> {
  const requestFetch = useRequestFetch()
  const serverRef = toRef(server)

  return useAsyncData<GachaPageData>(
    () => `gacha-page-data-${toValue(server)}`,
    () => fetchGachaPageData(toValue(server), asJsonFetcher(requestFetch)),
    {
      default: (): GachaPageData => emptyGachaPageData(),
      watch: [serverRef],
    },
  )
}

/** Client-side in-memory cache for on-demand loaded full banner details. */
const bannerDetailCache = new Map<string, GachaBanner>()

export async function fetchBannerDetail(
  id: string,
  fetcher: JsonFetcher = fetchJson,
): Promise<GachaBanner> {
  const cached = bannerDetailCache.get(id)
  if (cached) return cached

  const data = (await fetcher(`/api/gacha/banners/${encodeURIComponent(id)}`)) as GachaBanner
  if (!data || typeof data !== 'object' || !data.id) {
    throw new Error(`Failed to load banner details for ${id}`)
  }
  bannerDetailCache.set(id, data)
  return data
}
