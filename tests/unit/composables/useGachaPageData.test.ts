import { describe, it, expect, vi } from 'vitest'
import { fetchGachaPageData, fetchBannerDetail } from '~/composables/useGachaPageData'
import bannersDataset from '../../../data/banners.json'
import type { BannersDataset } from '../../../shared/schemas/banner'
import { buildGachaPageData } from '../../../shared/utils/gachaPageData'

const projection = buildGachaPageData(bannersDataset as unknown as BannersDataset)

describe('useGachaPageData composable', () => {
  it('fetches the compact gacha payload from the data endpoint', async () => {
    const fetcher = vi.fn().mockResolvedValue(projection)
    const data = await fetchGachaPageData(fetcher)

    expect(fetcher).toHaveBeenCalledWith('/api/gacha/banners')
    expect(data.upcomingBanners).toHaveLength(11)
    expect(data.currentEnFullBanner?.id).toBe('LIMITED_EN_42_0_1')
  })

  it('fetches CN gacha payload with ?server=cn query parameter', async () => {
    const fetcher = vi.fn().mockResolvedValue(projection)
    await fetchGachaPageData('cn', fetcher)

    expect(fetcher).toHaveBeenCalledWith('/api/gacha/banners?server=cn')
  })

  it('fetches and caches banner detail via fetchBannerDetail', async () => {
    const mockDetail = { id: 'SPECIAL_73_0_3', description: 'Detailed test description' }
    const fetcher = vi.fn().mockResolvedValue(mockDetail)

    const res1 = await fetchBannerDetail('SPECIAL_73_0_3', fetcher)
    expect(fetcher).toHaveBeenCalledWith('/api/gacha/banners/SPECIAL_73_0_3')
    expect(res1.description).toBe('Detailed test description')

    // Second call should hit in-memory cache
    const res2 = await fetchBannerDetail('SPECIAL_73_0_3', fetcher)
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(res2).toBe(res1)
  })

  it('rejects a malformed payload so the page shows its error state', async () => {
    const fetcher = vi.fn().mockResolvedValue({ upcomingBanners: 'nope' })
    await expect(fetchGachaPageData(fetcher)).rejects.toThrow('Unexpected gacha page payload')
  })

  it('propagates network failures instead of rendering an empty schedule', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('500'))
    await expect(fetchGachaPageData(fetcher)).rejects.toThrow('500')
  })
})
