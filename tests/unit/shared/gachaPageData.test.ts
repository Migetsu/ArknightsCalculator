import { describe, expect, it } from 'vitest'
import bannersDataset from '../../../data/banners.json'
import type { BannersDataset } from '../../../shared/schemas/banner'
import {
  buildGachaPageData,
  emptyGachaPageData,
  isGachaPageData,
} from '../../../shared/utils/gachaPageData'

const dataset = bannersDataset as unknown as BannersDataset

describe('buildGachaPageData', () => {
  it('keeps the active Global banner with its rate-up roster', () => {
    const pageData = buildGachaPageData(dataset)

    expect(pageData.currentEnBannerId).toBe('DOUBLE_EN_42_0_2')
    expect(pageData.currentEnFullBanner?.id).toBe('DOUBLE_EN_42_0_2')
    expect(pageData.currentEnFullBanner?.rateUp6.length).toBeGreaterThan(0)
    expect(pageData.currentEnFullBanner?.endIso).toBe('2026-11-06T10:59:59.000Z')
  })

  it('returns exactly the upcoming CN window in dataset order', () => {
    const pageData = buildGachaPageData(dataset)

    expect(pageData.upcomingBanners).toHaveLength(10)
    expect(pageData.upcomingBanners[0]?.id).toBe('LINKAGE_74_0_1')
    expect(pageData.upcomingBanners[9]?.id).toBe('SINGLE_78_0_1')
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
    const pageData = buildGachaPageData(dataset, 'cn')
    expect(pageData.currentBanner).toBeDefined()
    expect(pageData.currentBanner?.server).toBe('cn')
    expect(pageData.currentEnFullBanner?.id).toBe('DOUBLE_EN_42_0_2')
    expect(pageData.upcomingBanners).toHaveLength(10)
  })

  it('is accepted by the runtime guard', () => {
    expect(isGachaPageData(buildGachaPageData(dataset))).toBe(true)
    expect(isGachaPageData(emptyGachaPageData())).toBe(true)
    expect(isGachaPageData(null)).toBe(false)
    expect(isGachaPageData({ upcomingBanners: [] })).toBe(false)
    expect(isGachaPageData({ ...emptyGachaPageData(), upcomingBanners: 'nope' })).toBe(false)
  })
})
