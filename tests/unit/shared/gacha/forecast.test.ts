import { describe, it, expect } from 'vitest'
import { forecastPulls } from '../../../../shared/utils/gacha/forecast'

describe('forecastPulls', () => {
  const fixedToday = new Date('2026-10-22T00:00:00Z')
  const fixedBannerEnd = '2026-10-29T00:00:00Z'

  it('handles bannerEndDate = null: 0 days, pullsNow computed, pullsWithIncome = pullsNow', () => {
    const result = forecastPulls(
      {
        bannerEndDate: null,
        currentOrundum: 1200,
        currentOP: 10,
        currentTicketsSingle: 2,
        currentTicketsTen: 1,
        mode: 'f2p',
      },
      fixedToday,
    )

    expect(result.daysUntil).toBe(0)
    expect(result.orundumFromIncome).toBe(0)
    // 1200 + 10*180(1800) + 2*600(1200) + 1*6000(6000) = 10200 / 600 = 17 pulls
    expect(result.pullsNow).toBe(17)
    expect(result.pullsWithIncome).toBe(17)
    expect(result.pullsAvailable).toBe(17)
  })

  it('forecasts 7 days on F2P: +5 pulls from 3000 weekly orundum', () => {
    const result = forecastPulls(
      {
        bannerEndDate: fixedBannerEnd,
        currentOrundum: 0,
        currentOP: 0,
        currentTicketsSingle: 0,
        currentTicketsTen: 0,
        mode: 'f2p',
      },
      fixedToday,
    )

    expect(result.daysUntil).toBe(7)
    expect(result.orundumFromIncome).toBe(3000)
    expect(result.pullsNow).toBe(0)
    expect(result.pullsWithIncome).toBe(5)
    expect(result.pullsAvailable).toBe(5)
  })

  it('forecasts 7 days on Monthly Card: 4400 orundum (~7.33 pulls), rounds down to 7 pulls', () => {
    const result = forecastPulls(
      {
        bannerEndDate: fixedBannerEnd,
        currentOrundum: 0,
        currentOP: 0,
        currentTicketsSingle: 0,
        currentTicketsTen: 0,
        mode: 'monthly_card',
      },
      fixedToday,
    )

    expect(result.daysUntil).toBe(7)
    expect(result.orundumFromIncome).toBe(4400)
    expect(result.pullsNow).toBe(0)
    expect(result.pullsWithIncome).toBe(7)
    expect(result.pullsAvailable).toBe(7)
  })

  it('forecasts 30 days on F2P: ~21 pulls', () => {
    const today = new Date('2026-10-01T00:00:00Z')
    const bannerEnd = '2026-10-31T00:00:00Z'

    const result = forecastPulls(
      {
        bannerEndDate: bannerEnd,
        currentOrundum: 0,
        currentOP: 0,
        currentTicketsSingle: 0,
        currentTicketsTen: 0,
        mode: 'f2p',
      },
      today,
    )

    expect(result.daysUntil).toBe(30)
    // 30 / 7 * 3000 = 12857 orundum
    expect(result.orundumFromIncome).toBe(12857)
    expect(result.pullsWithIncome).toBe(21)
    expect(result.pullsAvailable).toBe(21)
  })

  it('computes pulls strictly from orundum when OP and tickets are depleted', () => {
    const result = forecastPulls(
      {
        bannerEndDate: null,
        currentOrundum: 1800,
        currentOP: 0,
        currentTicketsSingle: 0,
        currentTicketsTen: 0,
        mode: 'f2p',
      },
      fixedToday,
    )

    expect(result.daysUntil).toBe(0)
    expect(result.pullsNow).toBe(3)
    expect(result.pullsWithIncome).toBe(3)
    expect(result.orundumTotal).toBe(1800)
  })
})
