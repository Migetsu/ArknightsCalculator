import { describe, expect, it } from 'vitest'
import {
  SkinSchema,
  SkinListSchema,
  SkinRecordMapSchema,
  type Skin,
} from '../../../shared/schemas/skin'
import { isDefaultSkin, getSkinPriceStatus } from '../../../shared/utils/skin'
import skinsDataset from '../../../data/skins.json'

describe('Skin Schema and Utilities', () => {
  const baseValidSkin = {
    skinId: 'char_102_texas@summer#1',
    charId: 'char_102_texas',
    skinName: {
      en: 'Sunburn',
      zh: '日晒',
      source: 'official' as const,
      isMachineTranslation: false,
    },
    brandId: 'summer',
    brandName: 'Coral Coast',
    drawerList: ['幻象黑兔'],
    description: 'Sun and sand.',
    dialog: 'Coral Coast series summer outfit.',
    obtainApproach: 'Store',
    isBuySkin: true,
    isDefault: false,
    price: null,
    priceStatus: 'unknown' as const,
    priceSource: null,
    currency: null,
    illustId: 'illust_char_102_texas_summer#1',
    avatarId: 'char_102_texas_summer#1',
    portraitId: 'char_102_texas_summer#1',
    isCnOnly: false,
    servers: ['cn' as const, 'en' as const],
  }

  describe('SkinSchema validation', () => {
    it('validates a complete cosmetic outfit record with null price and unknown priceStatus', () => {
      const parsed = SkinSchema.parse(baseValidSkin)
      expect(parsed.skinId).toBe('char_102_texas@summer#1')
      expect(parsed.isDefault).toBe(false)
      expect(parsed.price).toBeNull()
      expect(parsed.priceStatus).toBe('unknown')
      expect(parsed.priceSource).toBeNull()
      expect(parsed.servers).toEqual(['cn', 'en'])
    })

    it('validates a default operator appearance record with default priceStatus', () => {
      const defaultSkin = {
        ...baseValidSkin,
        skinId: 'char_002_amiya#1',
        charId: 'char_002_amiya',
        skinName: {
          en: 'Default',
          zh: '默认',
          source: 'official' as const,
          isMachineTranslation: false,
        },
        brandId: null,
        brandName: 'Default Outfit',
        drawerList: ['唯@W'],
        obtainApproach: null,
        isBuySkin: false,
        isDefault: true,
        priceStatus: 'default' as const,
        illustId: 'illust_char_002_amiya_1',
        avatarId: 'char_002_amiya',
        portraitId: 'char_002_amiya_1',
      }

      const parsed = SkinSchema.parse(defaultSkin)
      expect(parsed.skinId).toBe('char_002_amiya#1')
      expect(parsed.isDefault).toBe(true)
      expect(parsed.priceStatus).toBe('default')
      expect(parsed.price).toBeNull()
    })

    it('validates a free reward cosmetic skin record with free priceStatus', () => {
      const rewardSkin = {
        ...baseValidSkin,
        skinId: 'char_002_amiya@winter#1',
        skinName: {
          en: 'Newsgirl',
          zh: '报童',
          source: 'official' as const,
          isMachineTranslation: false,
        },
        obtainApproach: 'Event Reward',
        priceStatus: 'free' as const,
      }

      const parsed = SkinSchema.parse(rewardSkin)
      expect(parsed.priceStatus).toBe('free')
      expect(parsed.price).toBeNull()
    })

    it('validates a CN-only skin record', () => {
      const cnOnlySkin = {
        ...baseValidSkin,
        skinId: 'char_1001_amiya2@casc#1',
        skinName: {
          en: '[Pending Translation]',
          zh: '触及星辰',
          source: 'pending' as const,
          isMachineTranslation: false,
        },
        obtainApproach: '采购中心',
        isCnOnly: true,
        servers: ['cn' as const],
      }

      const parsed = SkinSchema.parse(cnOnlySkin)
      expect(parsed.isCnOnly).toBe(true)
      expect(parsed.servers).toEqual(['cn'])
    })

    it('rejects invalid skin records missing mandatory fields', () => {
      expect(() =>
        SkinSchema.parse({
          skinId: 'incomplete_skin',
        }),
      ).toThrow()
    })

    it('rejects invalid priceStatus values', () => {
      expect(() =>
        SkinSchema.parse({
          ...baseValidSkin,
          priceStatus: 'invalid_status',
        }),
      ).toThrow()
    })

    it('validates SkinListSchema and SkinRecordMapSchema', () => {
      const listParsed = SkinListSchema.parse([baseValidSkin])
      expect(listParsed).toHaveLength(1)

      const mapParsed = SkinRecordMapSchema.parse({
        [baseValidSkin.skinId]: baseValidSkin,
      })
      expect(mapParsed[baseValidSkin.skinId]?.skinName.en).toBe('Sunburn')
    })
  })

  describe('Price Guard (Fuse Test)', () => {
    it('fails validation when a skin has a numeric price without a verified priceSource', () => {
      expect(() =>
        SkinSchema.parse({
          ...baseValidSkin,
          price: 18,
          priceSource: null,
        }),
      ).toThrow(/numeric price cannot be assigned without a verified, non-empty priceSource/i)

      expect(() =>
        SkinSchema.parse({
          ...baseValidSkin,
          price: 18,
          priceSource: '',
        }),
      ).toThrow(/numeric price cannot be assigned without a verified, non-empty priceSource/i)

      expect(() =>
        SkinSchema.parse({
          ...baseValidSkin,
          price: 18,
          priceSource: undefined,
        }),
      ).toThrow(/numeric price cannot be assigned without a verified, non-empty priceSource/i)
    })

    it('allows numeric price when a non-empty priceSource is provided', () => {
      const parsed = SkinSchema.parse({
        ...baseValidSkin,
        price: 18,
        priceSource: 'arknights.wiki.gg/wiki/Texas/Outfits',
      })
      expect(parsed.price).toBe(18)
      expect(parsed.priceSource).toBe('arknights.wiki.gg/wiki/Texas/Outfits')
    })

    it('guarantees all 1359 entries in data/skins.json have price === null and valid priceStatus', () => {
      const skins = skinsDataset as Skin[]
      expect(skins.length).toBe(1359)

      let numericPricesCount = 0
      const statusCounts = { default: 0, free: 0, unknown: 0 }

      for (const skin of skins) {
        if (typeof skin.price === 'number') {
          numericPricesCount++
        }
        expect(skin.price).toBeNull()
        expect(skin.priceSource).toBeNull()
        expect(['default', 'free', 'unknown']).toContain(skin.priceStatus)
        statusCounts[skin.priceStatus]++

        if (skin.isDefault) {
          expect(skin.priceStatus).toBe('default')
        }
      }

      expect(numericPricesCount).toBe(0)
      expect(statusCounts.default).toBe(833)
      expect(statusCounts.free).toBe(123)
      expect(statusCounts.unknown).toBe(403)
    })
  })

  describe('isDefaultSkin pure helper', () => {
    it('returns true for default E0/E1/E2 skins without @', () => {
      expect(isDefaultSkin('char_002_amiya#1')).toBe(true)
      expect(isDefaultSkin('char_002_amiya#2')).toBe(true)
      expect(isDefaultSkin('char_002_amiya#1+')).toBe(true)
      expect(isDefaultSkin('char_102_texas#1')).toBe(true)
    })

    it('returns false for cosmetic outfits containing @', () => {
      expect(isDefaultSkin('char_002_amiya@winter#1')).toBe(false)
      expect(isDefaultSkin('char_102_texas@summer#1')).toBe(false)
      expect(isDefaultSkin('char_003_kalts@boc#6')).toBe(false)
    })
  })

  describe('getSkinPriceStatus pure helper', () => {
    it('returns "default" for default appearance skins', () => {
      expect(getSkinPriceStatus({ skinId: 'char_002_amiya#1' })).toBe('default')
      expect(getSkinPriceStatus({ skinId: 'char_102_texas#2' })).toBe('default')
    })

    it('returns "unknown" for outfits obtainable in the Store / 采购中心', () => {
      expect(
        getSkinPriceStatus({
          skinId: 'char_102_texas@summer#1',
          obtainApproach: 'Store',
        }),
      ).toBe('unknown')

      expect(
        getSkinPriceStatus({
          skinId: 'char_1035_wisdel@sale#14',
          obtainApproach: '采购中心',
        }),
      ).toBe('unknown')

      expect(
        getSkinPriceStatus({
          skinId: 'char_1001_amiya2@casc#1',
          obtainApproach: '采购中心、兑换码获得',
        }),
      ).toBe('unknown')
    })

    it('returns "free" for event rewards, gifts, IS, RA, and packs', () => {
      expect(
        getSkinPriceStatus({
          skinId: 'char_002_amiya@winter#1',
          obtainApproach: 'Quest Reward',
        }),
      ).toBe('free')

      expect(
        getSkinPriceStatus({
          skinId: 'char_199_yak@summer#1',
          obtainApproach: '活动获得',
        }),
      ).toBe('free')

      expect(
        getSkinPriceStatus({
          skinId: 'char_1011_lava2@whirlwind#9',
          obtainApproach: 'Integrated Strategies',
        }),
      ).toBe('free')

      expect(
        getSkinPriceStatus({
          skinId: 'char_4042_lupus@epoque#30',
          obtainApproach: '生息演算',
        }),
      ).toBe('free')
    })
  })
})
