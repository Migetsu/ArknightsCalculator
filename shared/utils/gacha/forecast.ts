import {
  ORUNDUM_PER_PULL,
  ORUNDUM_PER_OP,
  F2P_WEEKLY_TOTAL,
  MONTHLY_CARD_WEEKLY,
} from '../../constants/gameConstants'

export type ForecastMode = 'f2p' | 'monthly' | 'monthly_card'

export interface ForecastInput {
  bannerEndDate: string | null
  currentOrundum: number
  currentOP: number
  currentTicketsSingle: number
  currentTicketsTen: number
  mode: ForecastMode
}

export interface ForecastResult {
  daysUntil: number
  pullsAvailable: number
  orundumFromIncome: number
  orundumTotal: number
  pullsNow: number
  pullsWithIncome: number
}

const MS_PER_DAY = 1000 * 60 * 60 * 24

/**
 * Calculates projected total headhunting pulls available by a target date.
 *
 * Sourced recurring income mechanics:
 * - Daily income: 100 Orundum (Dailies); +200 Orundum if Monthly Card active (= 300/day).
 * - Weekly income: 1800 Orundum (Annihilation) + 500 Orundum (Weeklies) = 2300/week.
 * - Current resources: Orundum + OP * 180 + Single Permits * 600 + Ten-roll Permits * 6000.
 * - Total available pulls: Math.floor(totalOrundum / 600).
 *
 * @param targetDate Timestamp in ms, Date instance, or ISO/date string.
 * @param currentOrundum Current Orundum inventory.
 * @param currentPermits Current Single Headhunting Permits.
 * @param mode 'f2p' | 'monthly' (or 'monthly_card').
 * @param currentOP Current Originite Prime (optional, defaults to 0).
 * @param currentTenPermits Current Ten-roll Headhunting Permits (optional, defaults to 0).
 * @param now Reference timestamp or Date (defaults to Date.now()).
 * @returns Total projected available pulls.
 */
export function calculatePullsUntilDate(
  targetDate: number | string | Date,
  currentOrundum: number,
  currentPermits: number,
  mode: ForecastMode,
  currentOP: number = 0,
  currentTenPermits: number = 0,
  now: number | Date = Date.now(),
): number {
  const targetMs =
    typeof targetDate === 'number'
      ? targetDate
      : targetDate instanceof Date
        ? targetDate.getTime()
        : new Date(targetDate).getTime()

  const nowMs = typeof now === 'number' ? now : now.getTime()
  const diffMs = targetMs - nowMs
  const days = Math.max(0, Math.ceil(diffMs / MS_PER_DAY))

  const isMonthly = mode === 'monthly' || mode === 'monthly_card'
  const dailyIncome = isMonthly ? 300 : 100
  const weeklyIncome = 2300 // 1800 Annihilation + 500 Weeklies

  const incomeOrundum = days * dailyIncome + weeklyIncome * (days / 7)
  const currentOrundumTotal =
    Math.max(0, currentOrundum) +
    Math.max(0, currentOP) * ORUNDUM_PER_OP +
    Math.max(0, currentPermits) * ORUNDUM_PER_PULL +
    Math.max(0, currentTenPermits) * 10 * ORUNDUM_PER_PULL

  return Math.floor((currentOrundumTotal + incomeOrundum) / ORUNDUM_PER_PULL)
}

export function forecastPulls(input: ForecastInput, today: Date = new Date()): ForecastResult {
  const currentOrundum = Math.max(0, input.currentOrundum || 0)
  const currentOP = Math.max(0, input.currentOP || 0)
  const ticketsSingle = Math.max(0, input.currentTicketsSingle || 0)
  const ticketsTen = Math.max(0, input.currentTicketsTen || 0)

  let daysUntil = 0
  if (input.bannerEndDate) {
    const end = new Date(input.bannerEndDate)
    const diff = end.getTime() - today.getTime()
    daysUntil = Math.max(0, Math.ceil(diff / MS_PER_DAY))
  }

  const weeks = daysUntil / 7
  const isMonthly = input.mode === 'monthly' || input.mode === 'monthly_card'
  const weeklyRate = isMonthly ? F2P_WEEKLY_TOTAL + MONTHLY_CARD_WEEKLY : F2P_WEEKLY_TOTAL

  const orundumFromIncome = daysUntil === 0 ? 0 : Math.round(weeks * weeklyRate)
  const orundumTotal = currentOrundum + orundumFromIncome

  const basePullsNumerator =
    currentOrundum +
    currentOP * ORUNDUM_PER_OP +
    ticketsSingle * ORUNDUM_PER_PULL +
    ticketsTen * 10 * ORUNDUM_PER_PULL

  const pullsNow = Math.floor(basePullsNumerator / ORUNDUM_PER_PULL)
  const pullsWithIncome = Math.floor((basePullsNumerator + orundumFromIncome) / ORUNDUM_PER_PULL)

  return {
    daysUntil,
    pullsAvailable: pullsWithIncome,
    orundumFromIncome,
    orundumTotal,
    pullsNow,
    pullsWithIncome,
  }
}
