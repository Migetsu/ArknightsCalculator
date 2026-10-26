import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  readGachaPageData,
  readBannerDetail,
  resetGachaBannersCache,
} from '../../../server/utils/gachaBanners'
import rawBanners from '../../../data/banners.json'
import rawOperatorsIndex from '../../../data/operators-index.json'

describe('server: gachaPageData', () => {
  beforeEach(() => {
    resetGachaBannersCache()
    vi.stubGlobal('useStorage', (namespace: string) => ({
      getItem: async (key: string) => {
        if (namespace === 'assets:gacha' && key === 'banners.json') return rawBanners
        if (namespace === 'assets:operatorsIndex' && key === 'operators-index.json') {
          return rawOperatorsIndex
        }
        return null
      },
    }))
  })

  it('reads global gacha page data with compact banners and operator dictionary', async () => {
    const data = await readGachaPageData('global')
    expect(data.currentBanner).toBeDefined()
    expect(data.currentBanner?.id).toBe('LIMITED_EN_42_0_1')
    expect(data.currentEnFullBanner?.id).toBe('LIMITED_EN_42_0_1')
    expect(data.upcomingBanners).toHaveLength(10)
    expect(data.globalLagDays).toBe(163.375)

    // Verify compact: no description in SSR payload
    expect(data.currentBanner?.description).toBeUndefined()
    for (const b of data.upcomingBanners) {
      expect(b.description).toBeUndefined()
    }

    // Verify operator dictionary is present and contains only relevant ops
    expect(data.operators).toBeDefined()
    const opCount = Object.keys(data.operators!).length
    expect(opCount).toBeGreaterThan(0)
    expect(opCount).toBeLessThan(100) // only active/upcoming ops, far less than full 300+ catalog
  })

  it('reads CN gacha page data with active CN banner while preserving currentEnFullBanner', async () => {
    const data = await readGachaPageData('cn')
    expect(data.currentBanner).toBeDefined()
    expect(data.currentBanner?.server).toBe('cn')
    expect(data.currentEnFullBanner?.id).toBe('LIMITED_EN_42_0_1')
    expect(data.upcomingBanners).toHaveLength(10)
  })

  it('verifies that serialized payload is well within the 60 KB budget', async () => {
    const data = await readGachaPageData('global')
    const jsonString = JSON.stringify(data)
    expect(jsonString.length).toBeLessThan(60_000)
    expect(jsonString.length).toBeLessThan(25_000) // measured at ~21.7 KB
  })

  it('reuses in-memory cache on subsequent calls', async () => {
    const first = await readGachaPageData('global')
    const second = await readGachaPageData('global')
    expect(first).toBe(second)
  })

  it('readBannerDetail returns full banner details', async () => {
    const banner = await readBannerDetail('LIMITED_EN_42_0_1')
    expect(banner.id).toBe('LIMITED_EN_42_0_1')
    expect(banner.rateUp6).toBeDefined()
  })

  it('readBannerDetail throws 404 for unknown banner ID', async () => {
    await expect(readBannerDetail('UNKNOWN_BANNER_999')).rejects.toThrow('Banner not found')
  })
})
