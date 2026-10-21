import { describe, it, expect, vi } from 'vitest'
import { fetchGachaPageData } from '~/composables/useGachaPageData'
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

  it('rejects a malformed payload so the page shows its error state', async () => {
    const fetcher = vi.fn().mockResolvedValue({ upcomingBanners: 'nope' })
    await expect(fetchGachaPageData(fetcher)).rejects.toThrow('Unexpected gacha page payload')
  })

  it('propagates network failures instead of rendering an empty schedule', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('500'))
    await expect(fetchGachaPageData(fetcher)).rejects.toThrow('500')
  })
})
