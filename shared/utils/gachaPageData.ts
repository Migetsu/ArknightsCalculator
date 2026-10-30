import type { BannersDataset, GachaBanner } from '../schemas/banner'
import type { I18nString, OperatorSummary, ServerRegion } from '../schemas/operator'
import { getBannerLifecycleStatus, getGlobalLagDays, getUpcomingBanners } from './gacha'

export interface CompactOperatorInfo {
  id: string
  name: I18nString
  rarity: 1 | 2 | 3 | 4 | 5 | 6
}

/**
 * Compact projection of the /gacha payload:
 * - Active banner for the selected server
 * - Upcoming CN window
 * - Minimal operator dictionary for rate-up operators
 * - No heavy descriptions or unneeded raw banner records in SSR
 */
export interface GachaPageData {
  currentBanner: GachaBanner | null
  currentEnBannerId: string | null
  currentEnFullBanner: GachaBanner | null
  upcomingBanners: GachaBanner[]
  globalLagDays: number | null
  operators?: Record<string, CompactOperatorInfo>
}

export function toCompactBanner(banner: GachaBanner): GachaBanner {
  return {
    id: banner.id,
    server: banner.server,
    ruleType: banner.ruleType,
    type: banner.type,
    tag: banner.tag,
    name: banner.name,
    title: banner.title,
    openTime: banner.openTime,
    endTime: banner.endTime,
    openIso: banner.openIso,
    endIso: banner.endIso,
    durationDays: banner.durationDays,
    isActive: banner.isActive,
    pairedBannerId: banner.pairedBannerId,
    isNextEnBanner: banner.isNextEnBanner,
    cnStartDate: banner.cnStartDate,
    cnEndDate: banner.cnEndDate,
    globalStartDate: banner.globalStartDate,
    globalEndDate: banner.globalEndDate,
    hasArt: banner.hasArt,
    artId: banner.artId,
    rateUp6: banner.rateUp6 ?? [],
    rateUp5: banner.rateUp5 ?? [],
    primaryRateUp6: banner.primaryRateUp6,
    secondaryRateUp6: banner.secondaryRateUp6 ?? [],
    rateUpShareMode: banner.rateUpShareMode,
    rateUpShare: banner.rateUpShare,
    lmtgsid: banner.lmtgsid,
  }
}

export function emptyGachaPageData(): GachaPageData {
  return {
    currentBanner: null,
    currentEnBannerId: null,
    currentEnFullBanner: null,
    upcomingBanners: [],
    globalLagDays: null,
    operators: {},
  }
}

export function buildGachaPageData(
  dataset: BannersDataset,
  server: ServerRegion = 'global',
  operatorsIndex?: readonly OperatorSummary[],
  nowSec = Math.floor(Date.now() / 1000),
): GachaPageData {
  const cnBanners = Array.isArray(dataset.cnBanners) ? dataset.cnBanners : []
  const allBanners =
    Array.isArray(dataset.banners) && dataset.banners.length > 0 ? dataset.banners : cnBanners
  const enBanners =
    Array.isArray(dataset.enBanners) && dataset.enBanners.length > 0
      ? dataset.enBanners
      : allBanners.filter((b) => b.server === 'en')

  const metaCurrentEn = dataset.meta?.currentEnBanner
    ? (enBanners.find((banner) => banner.id === dataset.meta?.currentEnBanner?.id) ?? null)
    : null

  const activeEn = enBanners.filter((b) => getBannerLifecycleStatus(b, nowSec) === 'active')
  const enBanner: GachaBanner | null =
    metaCurrentEn && getBannerLifecycleStatus(metaCurrentEn, nowSec) === 'active'
      ? metaCurrentEn
      : (activeEn.find((b) => b.ruleType === 'LIMITED' || b.type === 'limited') ??
        activeEn.sort((a, b) => (b.openTime ?? 0) - (a.openTime ?? 0))[0] ??
        metaCurrentEn ??
        null)
  const compactEnBanner = enBanner ? toCompactBanner(enBanner) : null

  let currentBanner: GachaBanner | null = compactEnBanner
  if (server === 'cn') {
    const activeCnId = dataset.meta?.activeCnBanners?.[0]?.id
    let cnBanner: GachaBanner | null = null
    if (activeCnId) {
      cnBanner = cnBanners.find((b) => b.id === activeCnId) ?? null
    }
    if (!cnBanner || getBannerLifecycleStatus(cnBanner, nowSec) !== 'active') {
      const activeCn = cnBanners.filter((b) => getBannerLifecycleStatus(b, nowSec) === 'active')
      cnBanner = activeCn[0] ?? cnBanners.find((b) => b.isActive) ?? null
    }
    if (cnBanner) {
      currentBanner = toCompactBanner(cnBanner)
    }
  }

  const upcomingBanners = getUpcomingBanners(cnBanners)
  const globalLagDays = getGlobalLagDays(cnBanners)

  const compactCurrentBanner = currentBanner
  const compactUpcomingBanners = upcomingBanners.map(toCompactBanner)

  const neededOpIds = new Set<string>()
  const bannersToScan = [compactCurrentBanner, compactEnBanner, ...compactUpcomingBanners].filter(
    (b): b is GachaBanner => b !== null,
  )
  for (const b of bannersToScan) {
    for (const opId of b.rateUp6 || []) neededOpIds.add(opId)
    for (const opId of b.rateUp5 || []) neededOpIds.add(opId)
    for (const opId of b.secondaryRateUp6 || []) neededOpIds.add(opId)
    if (b.primaryRateUp6) neededOpIds.add(b.primaryRateUp6)
  }

  const operators: Record<string, CompactOperatorInfo> = {}
  if (operatorsIndex && Array.isArray(operatorsIndex)) {
    for (const op of operatorsIndex) {
      if (neededOpIds.has(op.id)) {
        operators[op.id] = {
          id: op.id,
          name: op.name,
          rarity: op.rarity,
        }
      }
    }
  }

  return {
    currentBanner: compactCurrentBanner,
    currentEnBannerId: compactEnBanner?.id ?? null,
    currentEnFullBanner: compactEnBanner,
    upcomingBanners: compactUpcomingBanners,
    globalLagDays,
    operators,
  }
}

/**
 * Runtime guard for the API response: a malformed payload must surface as the
 * page error state instead of an empty schedule.
 */
export function isGachaPageData(value: unknown): value is GachaPageData {
  if (value === null || typeof value !== 'object') return false
  const candidate = value as Record<string, unknown>
  const banner = candidate.currentEnFullBanner ?? candidate.currentBanner
  return (
    Array.isArray(candidate.upcomingBanners) &&
    (banner === null || (typeof banner === 'object' && !Array.isArray(banner))) &&
    (candidate.globalLagDays === null || typeof candidate.globalLagDays === 'number') &&
    (candidate.currentEnBannerId === null || typeof candidate.currentEnBannerId === 'string')
  )
}
