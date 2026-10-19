import { describe, expect, it } from 'vitest'
import {
  collectUntranslatedFromSkins,
  collectUntranslatedFromBanners,
  type RawSkinItem,
  type RawBannerItem,
} from '../../../scripts/data/translate-missing'

describe('Translate Missing: Skins & Banners Collection (pure in-memory)', () => {
  describe('collectUntranslatedFromSkins', () => {
    it('collects pending skin strings and deduplicates identical Chinese templates', () => {
      const skins: RawSkinItem[] = [
        {
          skinId: 'char_1001_amiya2@casc#1',
          charId: 'char_002_amiya',
          skinName: {
            en: '[Pending Translation]',
            zh: '触及星辰',
            source: 'pending',
          },
          brandName: {
            en: 'CASC',
            zh: 'CASC',
            source: 'zh',
          },
          description: {
            en: '[Pending Translation]',
            zh: '她曾梦见过星星的模样。',
            source: 'pending',
          },
          dialog: {
            en: '[Pending Translation]',
            zh: '“向着群星迈进。”',
            source: 'pending',
          },
          obtainApproach: {
            en: '[Pending Translation]',
            zh: '活动获得',
            source: 'pending',
          },
        },
        {
          skinId: 'char_1001_amiya2@casc#2',
          charId: 'char_002_amiya',
          skinName: {
            en: '[Pending Translation]',
            zh: '触及星辰', // Same Chinese name -> should deduplicate
            source: 'pending',
          },
          brandName: {
            en: 'CASC',
            zh: 'CASC',
            source: 'zh',
          },
          description: {
            en: 'Official description already translated',
            zh: '已翻译描述',
            source: 'official', // Should be ignored
          },
        },
      ]

      const items = collectUntranslatedFromSkins(skins, {
        charNames: { char_002_amiya: '阿米娅' },
      })

      // We expect:
      // 1. skin_name: '触及星辰' with 2 keys
      // 2. skin_brand: CASC has no CJK -> 0 items
      // 3. skin_desc: '她曾梦见过星星的模样。' with 1 key
      // 4. skin_dialog: '“向着群星迈进。”' with 1 key
      // 5. skin_obtain: '活动获得' with 1 key
      expect(items.length).toBe(4)

      const skinNameItem = items.find((i) => i.type === 'skin_name')
      expect(skinNameItem).toBeDefined()
      expect(skinNameItem?.zh).toBe('触及星辰')
      expect(skinNameItem?.charId).toBe('char_002_amiya')
      expect(skinNameItem?.charNameZh).toBe('阿米娅')
      expect(skinNameItem?.keys).toEqual([
        'skin.char_1001_amiya2@casc#1.name',
        'skin.char_1001_amiya2@casc#2.name',
      ])

      const skinBrandItem = items.find((i) => i.type === 'skin_brand')
      expect(skinBrandItem).toBeUndefined() // Ignored because no CJK ideographs

      const descItem = items.find((i) => i.type === 'skin_desc')
      expect(descItem).toBeDefined()
      expect(descItem?.keys).toEqual(['skin.char_1001_amiya2@casc#1.description'])

      const obtainItem = items.find((i) => i.type === 'skin_obtain')
      expect(obtainItem).toBeDefined()
      expect(obtainItem?.keys).toEqual(['skin.char_1001_amiya2@casc#1.obtainApproach'])
    })

    it('ignores skins with no untranslated or non-CJK fields', () => {
      const skins: RawSkinItem[] = [
        {
          skinId: 'char_002_amiya#1',
          charId: 'char_002_amiya',
          skinName: {
            en: 'Default',
            zh: '默认服装',
            source: 'official',
          },
          brandName: {
            en: 'Rhodes Island',
            zh: 'Rhodes Island',
            source: 'official',
          },
        },
      ]

      const items = collectUntranslatedFromSkins(skins)
      expect(items.length).toBe(0)
    })
  })

  describe('collectUntranslatedFromBanners', () => {
    it('collects CN banners and deduplicates identical Chinese names', () => {
      const banners: RawBannerItem[] = [
        {
          id: 'NORM_0_1_1',
          name: '适合多种场合的强力干员',
          server: 'cn',
        },
        {
          id: 'NORM_0_1_2',
          name: '适合多种场合的强力干员', // Same Chinese name -> should deduplicate
          server: 'cn',
        },
        {
          id: 'LIMITED_76_0_1',
          name: {
            en: '[Pending Translation]',
            zh: '车辙与风的归所',
            source: 'pending',
          },
          server: 'cn',
        },
        {
          id: 'NORM_EN_0_1_1',
          name: 'Front That Was', // English only -> should be ignored
          server: 'en',
        },
        {
          id: 'LIMITED_EN_42_0_1',
          name: {
            en: 'Sealed With Time',
            zh: 'Sealed With Time',
            source: 'official',
          },
          server: 'en',
        },
      ]

      const items = collectUntranslatedFromBanners(banners)

      expect(items.length).toBe(2)

      const normItem = items.find((i) => i.zh === '适合多种场合的强力干员')
      expect(normItem).toBeDefined()
      expect(normItem?.type).toBe('banner_name')
      expect(normItem?.keys).toEqual([
        'banner.NORM_0_1_1.name',
        'banner.NORM_0_1_2.name',
      ])

      const limitedItem = items.find((i) => i.zh === '车辙与风的归所')
      expect(limitedItem).toBeDefined()
      expect(limitedItem?.type).toBe('banner_name')
      expect(limitedItem?.keys).toEqual(['banner.LIMITED_76_0_1.name'])
    })
  })
})
