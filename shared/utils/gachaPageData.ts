import type { BannersDataset, GachaBanner } from '../schemas/banner'
import { getGlobalLagDays, getUpcomingBanners } from './gacha'

/**
 * The /gacha page only renders the active Global banner and the upcoming CN
 * window. Serving that projection from Nitro keeps the 1.5 MB banners dataset
 * out of the route chunk while every field the page uses stays identical.
 */
export interface GachaPageData {
  currentEnBannerId: string | null
  currentEnFullBanner: GachaBanner | null
  upcomingBanners: GachaBanner[]
  globalLagDays: number | null
}

export function emptyGachaPageData(): GachaPageData {
  return {
    currentEnBannerId: null,
    currentEnFullBanner: null,
    upcomingBanners: [],
    globalLagDays: null,
  }
}

export function buildGachaPageData(dataset: BannersDataset): GachaPageData {
  const cnBanners = Array.isArray(dataset.cnBanners) ? dataset.cnBanners : []
  const allBanners =
    Array.isArray(dataset.banners) && dataset.banners.length > 0 ? dataset.banners : cnBanners
  const currentEnBanner = dataset.meta?.currentEnBanner ?? null
  const currentEnFullBanner: GachaBanner | null = currentEnBanner
    ? (allBanners.find((banner) => banner.id === currentEnBanner.id) ?? null)
    : null

  return {
    currentEnBannerId: currentEnBanner?.id ?? null,
    currentEnFullBanner,
    upcomingBanners: getUpcomingBanners(cnBanners),
    globalLagDays: getGlobalLagDays(cnBanners),
  }
}

/**
 * Runtime guard for the API response: a malformed payload must surface as the
 * page error state instead of an empty schedule.
 */
export function isGachaPageData(value: unknown): value is GachaPageData {
  if (value === null || typeof value !== 'object') return false
  const candidate = value as Record<string, unknown>
  const banner = candidate.currentEnFullBanner
  return (
    Array.isArray(candidate.upcomingBanners) &&
    (banner === null || (typeof banner === 'object' && !Array.isArray(banner))) &&
    (candidate.globalLagDays === null || typeof candidate.globalLagDays === 'number') &&
    (candidate.currentEnBannerId === null || typeof candidate.currentEnBannerId === 'string')
  )
}
