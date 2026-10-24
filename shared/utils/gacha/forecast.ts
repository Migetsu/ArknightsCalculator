import {
  ORUNDUM_PER_PULL,
  ORUNDUM_PER_OP,
  F2P_WEEKLY_TOTAL,
  MONTHLY_CARD_WEEKLY,
} from '../../constants/gameConstants'

export type ForecastMode = 'f2p' | 'monthly_card'

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
  const weeklyRate =
    input.mode === 'monthly_card' ? F2P_WEEKLY_TOTAL + MONTHLY_CARD_WEEKLY : F2P_WEEKLY_TOTAL

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
