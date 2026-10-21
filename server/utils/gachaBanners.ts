import { createError } from 'h3'
import type { BannersDataset } from '../../shared/schemas/banner'
import type { GachaPageData } from '../../shared/utils/gachaPageData'
import { buildGachaPageData } from '../../shared/utils/gachaPageData'

/** The projection is immutable per deployment; compute and keep it once. */
let cached: GachaPageData | null = null

export async function readGachaPageData(): Promise<GachaPageData> {
  if (cached) return cached

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

  cached = buildGachaPageData(dataset)
  return cached
}
