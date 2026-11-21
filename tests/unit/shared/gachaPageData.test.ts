import { describe, expect, it } from 'vitest'
import bannersDataset from '../../../data/banners.json'
import type { BannersDataset } from '../../../shared/schemas/banner'
import {
  buildGachaPageData,
  emptyGachaPageData,
  isGachaPageData,
} from '../../../shared/utils/gachaPageData'
import { getUpcomingBanners } from '../../../shared/utils/gacha'

const dataset = bannersDataset as unknown as BannersDataset

/**
 * Fixed instant inside the `SPECIAL_EN_42_0_3` window, the banner the committed
 * dataset lists as the current EN pool. Selection depends on wall-clock time, so
 * pinning it keeps the assertions deterministic instead of following the rotation.
 */

function syntheticBanner(options: { id: string; ruleType: string; type: string; nowSec: number }) {
  const { id, ruleType, type, nowSec } = options
  return {
    id,
    server: 'en',
    ruleType,
    type,
    title: { en: id, zh: id, source: 'official', isMachineTranslation: false },
    openTime: nowSec - 3600,
    endTime: nowSec + 86400,
    openIso: new Date((nowSec - 3600) * 1000).toISOString(),
    endIso: new Date((nowSec + 86400) * 1000).toISOString(),
    isActive: true,
    cnStartDate: '',
    cnEndDate: '',
    hasArt: true,
    rateUp6: ['char_a'],
    rateUp5: ['char_b'],
    secondaryRateUp6: [],
  }
}

const ACTIVE_WINDOW_NOW_SEC = Math.floor(Date.parse('2026-11-01T12:00:00.000Z') / 1000)

describe('buildGachaPageData', () => {
  it('keeps the active Global banner with its rate-up roster', () => {
    const pageData = buildGachaPageData(dataset, 'global', undefined, ACTIVE_WINDOW_NOW_SEC)

    expect(pageData.currentEnBannerId).toBe('SPECIAL_EN_42_0_3')
    expect(pageData.currentEnFullBanner?.id).toBe('SPECIAL_EN_42_0_3')
    expect(pageData.currentEnFullBanner?.rateUp6.length).toBeGreaterThan(0)
    expect(pageData.currentEnFullBanner?.endIso).toBe('2026-11-11T10:59:59.000Z')
  })

  it('prefers a live premium banner over a live standard banner', () => {
    const nowSec = Math.floor(Date.parse('2026-11-01T12:00:00.000Z') / 1000)
    const datasetWithPools = {
      ...dataset,
      cnBanners: [],
      enBanners: [
        syntheticBanner({ id: 'STD_EN_1', ruleType: 'NORMAL', type: 'standard', nowSec }),
        syntheticBanner({ id: 'LIM_EN_1', ruleType: 'LIMITED', type: 'limited', nowSec }),
      ],
      meta: { ...dataset.meta, currentEnBanner: null, activeEnBanners: [] },
    } as unknown as BannersDataset

    const pageData = buildGachaPageData(datasetWithPools, 'global', undefined, nowSec)

    expect(pageData.currentEnBannerId).toBe('LIM_EN_1')
  })

  it('falls back to a live standard banner when no premium banner is active', () => {
    const nowSec = Math.floor(Date.parse('2026-11-01T12:00:00.000Z') / 1000)
    const datasetWithPools = {
      ...dataset,
      cnBanners: [],
      enBanners: [
        syntheticBanner({ id: 'STD_EN_1', ruleType: 'NORMAL', type: 'standard', nowSec }),
      ],
      meta: { ...dataset.meta, currentEnBanner: null, activeEnBanners: [] },
    } as unknown as BannersDataset

    const pageData = buildGachaPageData(datasetWithPools, 'global', undefined, nowSec)

    expect(pageData.currentEnBannerId).toBe('STD_EN_1')
  })

  it('returns exactly the upcoming CN window in dataset order', () => {
    const pageData = buildGachaPageData(dataset, 'global', undefined, ACTIVE_WINDOW_NOW_SEC)
    const expected = getUpcomingBanners(dataset.cnBanners, ACTIVE_WINDOW_NOW_SEC * 1000)

    expect(pageData.upcomingBanners.map((banner) => banner.id)).toEqual(
      expected.map((banner) => banner.id),
    )
    expect(pageData.upcomingBanners.length).toBeGreaterThan(0)
    expect(pageData.globalLagDays).toBe(163.375)
  })

  it('is small enough to stay out of the route chunk and meets <= 60 KB budget', () => {
    const pageData = buildGachaPageData(dataset)
    const projectionBytes = JSON.stringify(pageData).length
    const datasetBytes = JSON.stringify(dataset).length

    expect(projectionBytes).toBeLessThan(60_000)
    expect(projectionBytes).toBeLessThan(100_000)
    expect(projectionBytes / datasetBytes).toBeLessThan(0.05)
  })

  it('supports CN server mode with active CN banner while preserving EN banner in currentEnFullBanner', () => {
    const pageData = buildGachaPageData(dataset, 'cn', undefined, ACTIVE_WINDOW_NOW_SEC)
    expect(pageData.currentBanner).toBeDefined()
    expect(pageData.currentBanner?.server).toBe('cn')
    expect(pageData.currentEnFullBanner?.id).toBe('SPECIAL_EN_42_0_3')
    expect(pageData.upcomingBanners.map((banner) => banner.id)).toEqual(
      getUpcomingBanners(dataset.cnBanners, ACTIVE_WINDOW_NOW_SEC * 1000).map(
        (banner) => banner.id,
      ),
    )
  })

  it('is accepted by the runtime guard', () => {
    expect(isGachaPageData(buildGachaPageData(dataset))).toBe(true)
    expect(isGachaPageData(emptyGachaPageData())).toBe(true)
    expect(isGachaPageData(null)).toBe(false)
    expect(isGachaPageData({ upcomingBanners: [] })).toBe(false)
    expect(isGachaPageData({ ...emptyGachaPageData(), upcomingBanners: 'nope' })).toBe(false)
  })
})
