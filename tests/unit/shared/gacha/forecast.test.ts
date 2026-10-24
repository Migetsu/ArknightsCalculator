import { describe, it, expect } from 'vitest'
import { forecastPulls, calculatePullsUntilDate } from '../../../../shared/utils/gacha/forecast'

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

  it('defaults to target="start" and calculates income until bannerStartDate', () => {
    const fixedBannerStart = '2026-10-25T00:00:00Z' // 3 days
    const result = forecastPulls(
      {
        bannerStartDate: fixedBannerStart,
        bannerEndDate: fixedBannerEnd, // 7 days
        currentOrundum: 0,
        currentOP: 0,
        currentTicketsSingle: 0,
        currentTicketsTen: 0,
        mode: 'f2p',
      },
      fixedToday,
    )

    expect(result.target).toBe('start')
    expect(result.daysUntil).toBe(3)
    expect(result.isAlreadyStarted).toBe(false)
    // 3 days F2P: 3/7 * 3000 = 1285.7 -> 1286 orundum -> 2 pulls
    expect(result.orundumFromIncome).toBe(1286)
    expect(result.pullsWithIncome).toBe(2)
  })

  it('calculates until bannerEndDate when target="end"', () => {
    const fixedBannerStart = '2026-10-25T00:00:00Z' // 3 days
    const result = forecastPulls(
      {
        bannerStartDate: fixedBannerStart,
        bannerEndDate: fixedBannerEnd, // 7 days
        target: 'end',
        currentOrundum: 0,
        currentOP: 0,
        currentTicketsSingle: 0,
        currentTicketsTen: 0,
        mode: 'f2p',
      },
      fixedToday,
    )

    expect(result.target).toBe('end')
    expect(result.daysUntil).toBe(7)
    expect(result.isAlreadyStarted).toBe(false)
    expect(result.pullsWithIncome).toBe(5)
  })

  it('marks isAlreadyStarted=true and daysUntil=0 when bannerStartDate is in the past for target="start"', () => {
    const pastStart = '2026-10-20T00:00:00Z'
    const result = forecastPulls(
      {
        bannerStartDate: pastStart,
        bannerEndDate: fixedBannerEnd,
        target: 'start',
        currentOrundum: 600,
        currentOP: 0,
        currentTicketsSingle: 0,
        currentTicketsTen: 0,
        mode: 'f2p',
      },
      fixedToday,
    )

    expect(result.target).toBe('start')
    expect(result.daysUntil).toBe(0)
    expect(result.isAlreadyStarted).toBe(true)
    expect(result.orundumFromIncome).toBe(0)
    expect(result.pullsWithIncome).toBe(1)
  })
})

describe('calculatePullsUntilDate', () => {
  const now = new Date('2026-10-24T00:00:00Z').getTime()
  const sevenDaysLater = now + 7 * 24 * 60 * 60 * 1000
  const fourteenDaysLater = now + 14 * 24 * 60 * 60 * 1000

  it('calculates 7 days F2P income yielding 5 pulls with 0 starting resources', () => {
    // 7 * 100 + 2300 * 1 = 3000 Orundum / 600 = 5 pulls
    const pulls = calculatePullsUntilDate(sevenDaysLater, 0, 0, 'f2p', 0, 0, now)
    expect(pulls).toBe(5)
  })

  it('calculates 7 days Monthly Card income yielding 7 pulls with 0 starting resources', () => {
    // 7 * 300 + 2300 * 1 = 4400 Orundum / 600 = 7 pulls (4400 / 600 = 7.33)
    const pulls = calculatePullsUntilDate(sevenDaysLater, 0, 0, 'monthly', 0, 0, now)
    expect(pulls).toBe(7)
  })

  it('calculates 0 remaining days returning only current resources', () => {
    // 1200 orundum (2 pulls) + 3 single permits (3 pulls) = 5 pulls
    const pulls = calculatePullsUntilDate(now, 1200, 3, 'f2p', 0, 0, now)
    expect(pulls).toBe(5)
  })

  it('handles past date as 0 days remaining', () => {
    const pastDate = now - 1000 * 60 * 60 * 24
    const pulls = calculatePullsUntilDate(pastDate, 600, 1, 'f2p', 0, 0, now)
    expect(pulls).toBe(2)
  })

  it('combines orundum, OP, single permits, ten-roll permits and income over 14 days', () => {
    // 14 days F2P: 14 * 100 + 2300 * 2 = 1400 + 4600 = 6000 Orundum (10 pulls)
    // Starting: 600 orundum (1) + 5 OP (900) + 2 single permits (1200) + 1 ten-roll permit (6000)
    // Starting orundum: 600 + 900 + 1200 + 6000 = 8700 (14 pulls)
    // Total orundum: 8700 + 6000 = 14700 / 600 = 24.5 -> 24 pulls
    const pulls = calculatePullsUntilDate(fourteenDaysLater, 600, 2, 'f2p', 5, 1, now)
    expect(pulls).toBe(24)
  })
})
