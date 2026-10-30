import type { BannerType, GachaBanner } from '../../schemas/banner'

export interface TreasuryResources {
  orundum: number
  originitePrime: number
  permitsSingle: number
  permitsTen: number
}

export interface SparkProgress {
  current: number
  max: number
  percentage: number
  remaining: number
  isReady: boolean
}

export interface BannerDateStatus {
  status: 'upcoming' | 'active' | 'ended'
  daysRemaining: number
}

export interface ProbabilityMilestone {
  pulls: number
  probability: number
  isSpark?: boolean
}

/**
 * Calculates days remaining from reference time (now) to a target date string.
 */
export function calculateDaysRemaining(targetDateStr: string, now = new Date()): number {
  if (!targetDateStr) return 0
  const normalized = targetDateStr.replace(/\//g, '-')
  const target = new Date(`${normalized}T00:00:00Z`)
  if (Number.isNaN(target.getTime())) return 0

  const diffMs = target.getTime() - now.getTime()
  return Math.ceil(diffMs / (24 * 60 * 60 * 1000))
}

/**
 * Computes banner lifecycle status ('upcoming', 'active', 'ended') and days remaining to start.
 */
export function getBannerStatus(
  startDateStr: string,
  endDateStr: string,
  now = new Date(),
): BannerDateStatus {
  const normStart = startDateStr.replace(/\//g, '-')
  const normEnd = endDateStr.replace(/\//g, '-')
  const start = new Date(`${normStart}T00:00:00Z`)
  const end = new Date(`${normEnd}T23:59:59Z`)

  const nowMs = now.getTime()

  if (nowMs < start.getTime()) {
    const days = Math.max(1, Math.ceil((start.getTime() - nowMs) / (24 * 60 * 60 * 1000)))
    return { status: 'upcoming', daysRemaining: days }
  }

  if (nowMs <= end.getTime()) {
    return { status: 'active', daysRemaining: 0 }
  }

  return { status: 'ended', daysRemaining: 0 }
}

/**
 * Formats a Unix timestamp or ISO string into a human-readable date.
 * Example: 'Oct 28, 2026'
 */
export function formatHumanDate(dateInput: number | string, locale = 'en-US'): string {
  if (!dateInput) return ''
  let date: Date
  if (typeof dateInput === 'number') {
    date = new Date(dateInput * 1000)
  } else {
    const parsed = parseBannerDate(String(dateInput))
    date = parsed === null ? new Date(dateInput) : new Date(parsed)
  }
  if (Number.isNaN(date.getTime())) return String(dateInput)

  return date.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

/**
 * Formats banner start and end dates as a human-readable range.
 * Example: 'Oct 14, 2026 – Oct 28, 2026'
 */
export function formatBannerDateRange(
  startInput: number | string,
  endInput: number | string,
  locale = 'en-US',
): string {
  const start = formatHumanDate(startInput, locale)
  const end = formatHumanDate(endInput, locale)
  if (start && end) return `${start} – ${end}`
  return start || end || ''
}

/**
 * A banner is proven not to have arrived on Global yet iff:
 * - It is on the Chinese server (server === 'cn')
 * - It is a LIMITED banner (ruleType === 'LIMITED')
 * - It has no proven paired Global banner (!pairedBannerId)
 * In the official dataset, exactly LIMITED_76_0_1 meets this condition.
 */
export function isProvenNotOnGlobal(banner: GachaBanner): boolean {
  return banner.server === 'cn' && banner.ruleType === 'LIMITED' && !banner.pairedBannerId
}

const MS_PER_DAY = 24 * 60 * 60 * 1000

/** China Standard Time is UTC+8 all year round (no daylight saving). */
const CN_UTC_OFFSET_MS = 8 * 60 * 60 * 1000

/** Number of most recent CN→Global pairs used for the lag median. */
export const UPCOMING_LAG_SAMPLE_SIZE = 12

/**
 * Parses a wiki banner date in `YYYY/MM/DD` or `YYYY/MM/DD HH:mm:ss` form
 * (dashes are accepted too) as UTC milliseconds. Returns null for invalid input.
 * Parsing never depends on the host time zone.
 */
export function parseBannerDate(dateInput?: string | null): number | null {
  if (!dateInput) return null
  const match = /^(\d{4})[/-](\d{1,2})[/-](\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/.exec(
    dateInput.trim(),
  )
  if (!match) return null

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const hours = Number(match[4] ?? 0)
  const minutes = Number(match[5] ?? 0)
  const seconds = Number(match[6] ?? 0)

  const ms = Date.UTC(year, month - 1, day, hours, minutes, seconds)
  const date = new Date(ms)
  if (
    Number.isNaN(ms) ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day ||
    date.getUTCHours() !== hours ||
    date.getUTCMinutes() !== minutes ||
    date.getUTCSeconds() !== seconds
  ) {
    return null
  }
  return ms
}

/**
 * Latest CN banner start time that already has a real Global release date.
 * Everything after this point is the unreleased window. Data-driven, never uses the clock.
 */
export function getUpcomingCutoff(banners: readonly GachaBanner[]): number | null {
  let cutoff: number | null = null
  for (const banner of banners) {
    if (banner.server !== 'cn' || banner.openTime <= 0) continue
    if (parseBannerDate(banner.globalStartDate) === null) continue
    if (cutoff === null || banner.openTime > cutoff) cutoff = banner.openTime
  }
  return cutoff
}

/**
 * CN banners that have not been released on Global yet and have a known rate-up roster,
 * sorted from the oldest (closest to Global) to the newest. Returns [] when the dataset
 * has no confirmed Global dates to derive the cutoff from.
 */
export function getUpcomingBanners(banners: readonly GachaBanner[]): GachaBanner[] {
  const cutoff = getUpcomingCutoff(banners)
  if (cutoff === null) return []

  return banners
    .filter(
      (banner) =>
        banner.server === 'cn' &&
        banner.openTime > cutoff &&
        parseBannerDate(banner.globalStartDate) === null &&
        ((banner.rateUp6?.length ?? 0) > 0 || (banner.rateUp5?.length ?? 0) > 0),
    )
    .sort((a, b) => a.openTime - b.openTime)
}

export interface GlobalLagPair {
  id: string
  cnOpenTime: number
  lagDays: number
}

/**
 * Confirmed CN→Global pairs ordered by CN start date, limited to the most recent `sampleSize`.
 */
export function getGlobalLagPairs(
  banners: readonly GachaBanner[],
  sampleSize = UPCOMING_LAG_SAMPLE_SIZE,
): GlobalLagPair[] {
  const pairs = banners
    .filter((banner) => banner.server === 'cn' && banner.openTime > 0)
    .map((banner) => {
      const globalStart = parseBannerDate(banner.globalStartDate)
      if (globalStart === null) return null
      return {
        id: banner.id,
        cnOpenTime: banner.openTime,
        lagDays: (globalStart - banner.openTime * 1000) / MS_PER_DAY,
      }
    })
    .filter((pair): pair is GlobalLagPair => pair !== null)
    .sort((a, b) => a.cnOpenTime - b.cnOpenTime)

  if (sampleSize <= 0) return pairs
  return pairs.slice(-sampleSize)
}

/**
 * Median CN→Global lag in days over the most recent `sampleSize` confirmed pairs.
 * Returns null when no confirmed pair exists.
 */
export function getGlobalLagDays(
  banners: readonly GachaBanner[],
  sampleSize = UPCOMING_LAG_SAMPLE_SIZE,
): number | null {
  const lags = getGlobalLagPairs(banners, sampleSize)
    .map((pair) => pair.lagDays)
    .sort((a, b) => a - b)
  if (lags.length === 0) return null

  const middle = Math.floor(lags.length / 2)
  if (lags.length % 2 === 1) return lags[middle] ?? null
  const lower = lags[middle - 1]
  const upper = lags[middle]
  if (lower === undefined || upper === undefined) return null
  return (lower + upper) / 2
}

/**
 * CN-local banner start as UTC milliseconds: the explicit `cnStartDate`
 * (already a UTC+8 calendar date) or the UTC+8 date derived from `openTime`.
 * Returns null when neither source is usable.
 */
function getCnLocalStartMs(banner: GachaBanner): number | null {
  const fromDate = parseBannerDate(banner.cnStartDate)
  if (fromDate !== null) return fromDate
  if (banner.openTime > 0) return banner.openTime * 1000 + CN_UTC_OFFSET_MS
  return null
}

/**
 * Estimated Global start date (`YYYY-MM-DD`) for a CN banner: the CN-local start date
 * plus the rounded lag. Global pools open at the daily reset, so the UTC date of
 * `openTime` is often one day behind the CN in-game date and must not be used directly.
 * Returns null without a valid lag or start time.
 */
export function getEstimatedGlobalDate(banner: GachaBanner, lagDays: number | null): string | null {
  if (lagDays === null || !Number.isFinite(lagDays)) return null
  const cnStartMs = getCnLocalStartMs(banner)
  if (cnStartMs === null) return null
  const estimated = new Date(cnStartMs + Math.round(lagDays) * MS_PER_DAY)
  if (Number.isNaN(estimated.getTime())) return null
  return estimated.toISOString().slice(0, 10)
}

/**
 * Computes banner lifecycle status ('active', 'upcoming', 'ended') from Unix timestamps.
 */
export function getBannerLifecycleStatus(
  banner: GachaBanner,
  nowSec = Math.floor(Date.now() / 1000),
): 'active' | 'upcoming' | 'ended' {
  if (banner.globalStartDate) {
    const globalStart = parseBannerDate(banner.globalStartDate)
    const globalEnd = parseBannerDate(banner.globalEndDate)
    if (globalStart !== null) {
      const nowMs = nowSec * 1000
      if (nowMs < globalStart) return 'upcoming'

      const effectiveEndMs = banner.endTime
        ? banner.endTime * 1000
        : banner.endIso
          ? new Date(banner.endIso).getTime()
          : globalEnd !== null
            ? globalEnd + MS_PER_DAY - 1
            : null

      if (effectiveEndMs !== null && nowMs <= effectiveEndMs) return 'active'
      if (effectiveEndMs !== null && nowMs > effectiveEndMs) return 'ended'
    }
  }

  if (banner.server === 'cn' && !banner.pairedBannerId) {
    if (banner.isActive) return 'active'
    if (banner.openTime && banner.endTime) {
      if (nowSec >= banner.openTime && nowSec <= banner.endTime) return 'active'
    }
    return 'upcoming'
  }

  if (banner.openTime && banner.endTime) {
    if (nowSec < banner.openTime) return 'upcoming'
    if (nowSec <= banner.endTime) return 'active'
    return 'ended'
  }
  if (banner.cnStartDate && banner.cnEndDate) {
    return getBannerStatus(banner.cnStartDate, banner.cnEndDate, new Date(nowSec * 1000)).status
  }
  return 'ended'
}

/**
 * Calculates total available headhunting pulls from currency treasury resources.
 *
 * Conversion rules:
 * - 1 pull = 600 Orundum.
 * - 1 Originite Prime (OP) = 180 Orundum (converted jointly with Orundum).
 * - 1 single Headhunting Permit = 1 pull.
 * - 1 Ten-roll Headhunting Permit = 10 pulls.
 * - Any joint currency remainder less than 600 Orundum-equivalent does not yield a pull.
 *
 * @param treasury Treasury resources object containing orundum, originitePrime, permitsSingle, and permitsTen
 * @returns Total number of whole pulls available
 */
export function calculateTotalPulls(treasury: TreasuryResources): number {
  const orundum = Math.max(0, treasury.orundum || 0)
  const op = Math.max(0, treasury.originitePrime || 0)
  const single = Math.max(0, treasury.permitsSingle || 0)
  const ten = Math.max(0, treasury.permitsTen || 0)

  const pullsFromCurrency = Math.floor((orundum + op * 180) / 600)
  const pullsFromPermits = single + ten * 10

  return pullsFromCurrency + pullsFromPermits
}

/**
 * Computes spark progress toward a 300-pull guarantee.
 */
export function calculateSparkProgress(pulls: number, sparkMax = 300): SparkProgress {
  const safePulls = Math.max(0, pulls || 0)
  const current = Math.min(safePulls, sparkMax)
  const percentage = Math.min(100, Math.round((current / sparkMax) * 100))
  const remaining = Math.max(0, sparkMax - safePulls)

  return {
    current,
    max: sparkMax,
    percentage,
    remaining,
    isReady: safePulls >= sparkMax,
  }
}

/**
 * Default rate-up share per banner type.
 * Standard (single): 50%
 * Limited: 70% rate-up pool
 * Joint Operation: 25% (1 of 4 rate-up 6-stars)
 */
export const DEFAULT_RATE_UP_SHARES: Record<BannerType, number> = {
  standard: 0.5,
  limited: 0.7,
  joint_operation: 0.25,
}

/**
 * Calculates the individual target rate-up share for a 6★ operator on a banner.
 *
 * Rules:
 * - 'manual': Uses banner.rateUpShare directly as the individual target's share.
 *   If banner.rateUpShare is not provided, returns null (cannot be evaluated).
 * - 'single': Uses banner.rateUpShare ?? DEFAULT_RATE_UP_SHARES[banner.type].
 * - 'equal_split' (or undefined/default):
 *   - For 'joint_operation', 100% of 6★ pulls are guaranteed to be from the featured 4 operators.
 *     Target share = (banner.rateUpShare ?? 1.0) / max(1, rateUp6.length) (e.g. 1.0 / 4 = 0.25).
 *   - For other banner types, target share = (banner.rateUpShare ?? DEFAULT_RATE_UP_SHARES[banner.type]) / max(1, rateUp6.length).
 *   - If rateUp6 is empty, returns null.
 *
 * @param banner The gacha banner object
 * @returns Target rate-up share between 0 and 1, or null if insufficient data
 */
export function getTargetRateUpShare(banner: GachaBanner): number | null {
  if (!banner) return null

  // 1. Manual mode: individual target share must be explicitly provided
  if (banner.rateUpShareMode === 'manual') {
    if (typeof banner.rateUpShare === 'number' && !Number.isNaN(banner.rateUpShare)) {
      return Math.min(1, Math.max(0, banner.rateUpShare))
    }
    return null
  }

  // 2. Single target mode: entire pool share allocated to one target
  if (banner.rateUpShareMode === 'single') {
    const share = banner.rateUpShare ?? DEFAULT_RATE_UP_SHARES[banner.type] ?? 0.5
    return Math.min(1, Math.max(0, share))
  }

  // 3. Equal split mode (default): divide pool share equally among featured 6-stars
  const count = banner.rateUp6?.length ?? 0
  if (count === 0) return null

  // In Joint Operation, 100% of 6-star drops are guaranteed to be rate-up (1.0 total pool)
  const defaultPoolShare =
    banner.type === 'joint_operation' ? 1.0 : (DEFAULT_RATE_UP_SHARES[banner.type] ?? 0.5)
  const totalShare = banner.rateUpShare ?? defaultPoolShare

  return Math.min(1, Math.max(0, totalShare / count))
}

/**
 * Calculates exact cumulative probability of pulling at least one copy of a target rate-up 6-star
 * in N pulls, using the standard Arknights pity model:
 * - Base rate for 6-star: 2.0% (pulls 1..50)
 * - Pity rate increase: +2.0% per pull starting at pull 51 (100% at pull 99)
 * - Pity resets to 0 upon any 6-star drop
 * - Target rate-up share: r (e.g. 50% on standard, 70% on limited, or individual target share)
 * - Limited spark guarantee at 300 pulls: 100%
 *
 * @param pulls Number of pulls
 * @param bannerType Standard, limited, or joint_operation
 * @param targetRateUpShare Optional individual target rate-up share. If null, returns 0 (evaluation unavailable).
 */
export function calculateRateUpProbability(
  pulls: number,
  bannerType: BannerType = 'standard',
  targetRateUpShare?: number | null,
): number {
  if (targetRateUpShare === null) {
    return 0
  }

  const safePulls = Math.max(0, Math.floor(pulls || 0))
  if (safePulls === 0) return 0

  // 300 spark guarantee on limited banners
  if (bannerType === 'limited' && safePulls >= 300) {
    return 1.0
  }

  const rawR =
    targetRateUpShare !== undefined
      ? targetRateUpShare
      : (DEFAULT_RATE_UP_SHARES[bannerType] ?? 0.5)
  const r = Math.min(1.0, Math.max(0, rawR))

  // Probability distribution of current pity counter (0..98) where target has NOT been pulled yet
  let pityDist = new Float64Array(99)
  pityDist[0] = 1.0

  for (let n = 1; n <= safePulls; n++) {
    const nextDist = new Float64Array(99)

    for (let k = 0; k < 99; k++) {
      const probState = pityDist[k] ?? 0
      if (probState === 0) continue

      // 6-star probability at current pity k
      const p6 = k < 50 ? 0.02 : Math.min(1.0, 0.02 + 0.02 * (k - 49))
      const pOfftarget = p6 * (1 - r)
      const pOther = 1.0 - p6

      // Off-target 6-star resets pity to 0 without ending search
      nextDist[0] = (nextDist[0] ?? 0) + probState * pOfftarget

      // Non-6-star advances pity by 1
      if (k + 1 < 99) {
        nextDist[k + 1] = (nextDist[k + 1] ?? 0) + probState * pOther
      }
    }

    pityDist = nextDist
  }

  // Sum of states where target was NOT pulled
  let notPulled = 0
  for (let k = 0; k < 99; k++) {
    notPulled += pityDist[k] ?? 0
  }

  const prob = 1.0 - notPulled
  return Math.min(1.0, Math.max(0, prob))
}

/**
 * Returns probability milestones (50, 100, 150, 200, 300 pulls) for UI probability curves.
 *
 * @param bannerType Standard, limited, or joint_operation
 * @param targetRateUpShare Optional individual target rate-up share
 */
export function getProbabilityMilestones(
  bannerType: BannerType = 'standard',
  targetRateUpShare?: number | null,
): ProbabilityMilestone[] {
  const pullSteps = [50, 100, 150, 200, 300]
  return pullSteps.map((pulls) => {
    const isSpark = bannerType === 'limited' && pulls >= 300
    const probability =
      targetRateUpShare === null
        ? 0
        : isSpark
          ? 1.0
          : calculateRateUpProbability(pulls, bannerType, targetRateUpShare)
    return {
      pulls,
      probability: Math.round(probability * 1000) / 10, // e.g. 77.8%
      isSpark: targetRateUpShare !== null && isSpark,
    }
  })
}

/**
 * Resolves candidate art identifiers for a banner based on its pool ID and server.
 * - For CN: uses pool ID as-is (e.g. 'NORM_10_0_1').
 * - For EN with a confirmed pair: the paired CN pool first, then the raw EN ID.
 *   The stripped `_EN` id is intentionally NOT used here, because a known pair
 *   proves that the stripped pool is a different banner (foreign art).
 * - For EN without a pair: stripped id (e.g. 'NORM_EN_0_1_1' -> 'NORM_0_1_1'),
 *   then the raw EN id.
 */
export function getBannerArtCandidates(
  id: string,
  server?: 'cn' | 'en' | string,
  pairedBannerId?: string | null,
): string[] {
  if (!id || typeof id !== 'string') return []
  const cleanId = id.trim()
  if (!cleanId) return []

  const isEn = server === 'en' || cleanId.includes('_EN_') || cleanId.includes('_EN')
  if (!isEn) return [cleanId]

  const candidates: string[] = []
  const pairedId = pairedBannerId?.trim()
  if (pairedId) {
    candidates.push(pairedId, cleanId)
  } else {
    const stripped = cleanId.replace(/_EN(?=_|$)/, '')
    if (stripped !== cleanId) candidates.push(stripped)
    candidates.push(cleanId)
  }

  return Array.from(new Set(candidates))
}

export * from './forecast'
