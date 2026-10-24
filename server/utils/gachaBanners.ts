import { createError } from 'h3'
import type { BannersDataset, GachaBanner } from '../../shared/schemas/banner'
import type { OperatorSummary, ServerRegion } from '../../shared/schemas/operator'
import type { GachaPageData } from '../../shared/utils/gachaPageData'
import { buildGachaPageData } from '../../shared/utils/gachaPageData'

let cachedDataset: BannersDataset | null = null
let cachedOperatorsIndex: OperatorSummary[] | null = null
let cachedGlobal: GachaPageData | null = null
let cachedCn: GachaPageData | null = null

export async function loadBannersDataset(): Promise<BannersDataset> {
  if (cachedDataset) return cachedDataset

  const raw = await useStorage('assets:gacha').getItem('banners.json')
  const dataset = raw as BannersDataset | null
  if (
    dataset === null ||
    typeof dataset !== 'object' ||
    !Array.isArray(dataset.cnBanners) ||
    !Array.isArray(dataset.banners)
  ) {
    throw createError({ statusCode: 500, statusMessage: 'Gacha dataset is unavailable' })
  }

  cachedDataset = dataset
  return cachedDataset
}

export async function loadOperatorsIndex(): Promise<OperatorSummary[]> {
  if (cachedOperatorsIndex) return cachedOperatorsIndex

  try {
    const raw = await useStorage('assets:operatorsIndex').getItem('operators-index.json')
    if (Array.isArray(raw)) {
      cachedOperatorsIndex = raw as OperatorSummary[]
      return cachedOperatorsIndex
    }
  } catch (_e) {
    // Non-fatal if storage entry is missing
  }
  return []
}

export async function readGachaPageData(server: ServerRegion = 'global'): Promise<GachaPageData> {
  if (server === 'cn' && cachedCn) return cachedCn
  if (server === 'global' && cachedGlobal) return cachedGlobal

  const [dataset, opsIndex] = await Promise.all([loadBannersDataset(), loadOperatorsIndex()])

  const pageData = buildGachaPageData(dataset, server, opsIndex)
  if (server === 'cn') {
    cachedCn = pageData
  } else {
    cachedGlobal = pageData
  }
  return pageData
}

export async function readBannerDetail(id: string): Promise<GachaBanner> {
  const dataset = await loadBannersDataset()
  const allBanners =
    Array.isArray(dataset.banners) && dataset.banners.length > 0
      ? dataset.banners
      : (dataset.cnBanners ?? [])

  const banner = allBanners.find((b) => b.id === id) ?? dataset.cnBanners?.find((b) => b.id === id)
  if (!banner) {
    throw createError({ statusCode: 404, statusMessage: 'Banner not found' })
  }
  return banner
}

/** Reset in-memory cache (for testing) */
export function resetGachaBannersCache(): void {
  cachedDataset = null
  cachedOperatorsIndex = null
  cachedGlobal = null
  cachedCn = null
}
