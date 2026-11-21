import { describe, expect, it } from 'vitest'
import {
  mapBannersToWikiCards,
  parseWikiBannerCards,
} from '../../../scripts/data/build-banner-thumbs'

const html = `
<div class="banner" style="max-width:512px;">
  <div><b>[Limited Headhunting ‐ Celebration] Cinders of Snow</b></div>
  <img alt="CN Cinders of Snow banner.png" src="https://arknights.wiki.gg/images/thumb/CN_Cinders_of_Snow_banner.png/1024px-CN_Cinders_of_Snow_banner.png?2ede25" width="1024" height="328">
  <div><b>CN date:</b> 2026/11/01 – 2026/11/15</div>
</div>
<div class="banner" style="max-width:512px;">
  <div><b>[Standard Headhunting] Joint Operation #24</b></div>
  <img src="/images/thumb/CN_Joint_Operation_24_banner.png/1024px-x.png" width="1024">
  <div><b>CN date:</b> 2026/11/15 – 2026/11/29</div>
</div>
<div class="banner"><div>malformed card without image or dates</div></div>
`

describe('parseWikiBannerCards', () => {
  it('extracts the name, absolute image URL and CN window from banner cards', () => {
    const cards = parseWikiBannerCards(html)

    expect(cards).toHaveLength(2)
    expect(cards[0]).toEqual({
      name: 'Cinders of Snow',
      imageUrl:
        'https://arknights.wiki.gg/images/thumb/CN_Cinders_of_Snow_banner.png/1024px-CN_Cinders_of_Snow_banner.png?2ede25',
      cnStart: '2026/11/01',
      cnEnd: '2026/11/15',
    })
    expect(cards[1]?.name).toBe('Joint Operation #24')
    expect(cards[1]?.imageUrl).toBe(
      'https://arknights.wiki.gg/images/thumb/CN_Joint_Operation_24_banner.png/1024px-x.png',
    )
  })

  it('skips cards that are missing the image or the date range', () => {
    expect(parseWikiBannerCards('<div class="banner"><b>Broken</b></div>')).toEqual([])
  })
})

describe('mapBannersToWikiCards', () => {
  const cards = [
    {
      name: 'Cinders of Snow',
      imageUrl: 'https://cdn.example/cinders.png',
      cnStart: '2026/11/01',
      cnEnd: '2026/11/15',
    },
    {
      name: 'Joint Operation #24',
      imageUrl: 'https://cdn.example/jo24.png',
      cnStart: '2026/11/15',
      cnEnd: '2026/11/29',
    },
  ]

  it('matches by CN start date even when the wiki title differs', () => {
    const mapped = mapBannersToWikiCards(
      [
        {
          id: 'NORM_79_0_4',
          name: { en: 'Joint Operation 4' },
          cnStartDate: '2026/11/15 16:00:00',
        },
      ],
      cards,
    )

    expect(mapped.get('NORM_79_0_4')).toBe('https://cdn.example/jo24.png')
  })

  it('falls back to the normalized name when the date is unavailable', () => {
    const mapped = mapBannersToWikiCards(
      [{ id: 'LIMITED_79_0_1', name: { en: 'Cinders of Snow' } }],
      cards,
    )

    expect(mapped.get('LIMITED_79_0_1')).toBe('https://cdn.example/cinders.png')
  })

  it('leaves unmatched banners out instead of guessing', () => {
    const mapped = mapBannersToWikiCards(
      [{ id: 'UNKNOWN', name: { en: 'Unknown Banner' }, cnStartDate: '2027/01/01' }],
      cards,
    )

    expect(mapped.size).toBe(0)
  })
})
