import { describe, expect, it } from 'vitest'
import { applyBannerArt } from '../../../scripts/data/apply-banner-art'

describe('applyBannerArt', () => {
  it('marks a CN banner as having art when its id is published', () => {
    const dataset = {
      cnBanners: [{ id: 'LIMITED_79_0_1', server: 'cn' as const, hasArt: false }],
      enBanners: [],
    }

    expect(applyBannerArt(dataset, ['LIMITED_79_0_1'])).toBe(1)
    expect(dataset.cnBanners[0]).toMatchObject({
      hasArt: true,
      artId: 'LIMITED_79_0_1',
      bannerArt: 'LIMITED_79_0_1',
    })
  })

  it('uses the paired CN art for an EN banner', () => {
    const dataset = {
      cnBanners: [],
      enBanners: [
        {
          id: 'LINKAGE_EN_42_0_5',
          server: 'en' as const,
          pairedBannerId: 'LINKAGE_74_0_1',
          hasArt: false,
        },
      ],
    }

    applyBannerArt(dataset, ['LINKAGE_74_0_1'])

    expect(dataset.enBanners[0]).toMatchObject({
      hasArt: true,
      artId: 'LINKAGE_74_0_1',
    })
  })

  it('clears stale art fields when the published art is gone', () => {
    const dataset = {
      cnBanners: [
        { id: 'GONE', server: 'cn' as const, hasArt: true, artId: 'GONE', bannerArt: 'GONE' },
      ],
      enBanners: [],
    }

    expect(applyBannerArt(dataset, [])).toBe(1)
    expect(dataset.cnBanners[0]?.hasArt).toBe(false)
    expect(dataset.cnBanners[0]?.artId).toBeUndefined()
  })

  it('is a no-op when the flags already match', () => {
    const dataset = {
      cnBanners: [
        { id: 'A', server: 'cn' as const, hasArt: true, artId: 'A', bannerArt: 'A' },
      ],
      enBanners: [],
    }

    expect(applyBannerArt(dataset, ['A'])).toBe(0)
  })
})
