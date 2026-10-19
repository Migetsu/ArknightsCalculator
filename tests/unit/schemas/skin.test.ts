import { describe, expect, it } from 'vitest'
import {
  SkinSchema,
  SkinListSchema,
  SkinRecordMapSchema,
  type Skin,
} from '../../../shared/schemas/skin'
import { isDefaultSkin, getSkinPriceStatus } from '../../../shared/utils/skin'
import skinsDataset from '../../../data/skins.json'

const CJK_IDEOGRAPH_REGEX = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/

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
    brandName: {
      en: 'Coral Coast',
      zh: '珊瑚海岸',
      source: 'official' as const,
      isMachineTranslation: false,
    },
    drawerList: ['幻象黑兔'],
    description: {
      en: 'Sun and sand.',
      zh: '阳光与沙滩。',
      source: 'official' as const,
      isMachineTranslation: false,
    },
    dialog: {
      en: 'Coral Coast series summer outfit.',
      zh: '珊瑚海岸系列夏季泳装。',
      source: 'official' as const,
      isMachineTranslation: false,
    },
    obtainApproach: {
      en: 'Store',
      zh: '采购中心',
      source: 'official' as const,
      isMachineTranslation: false,
    },
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
      expect(parsed.brandName?.en).toBe('Coral Coast')
      expect(parsed.description?.en).toBe('Sun and sand.')
      expect(parsed.dialog?.en).toBe('Coral Coast series summer outfit.')
      expect(parsed.obtainApproach?.en).toBe('Store')
      expect(parsed.servers).toEqual(['cn', 'en'])
    })

    it('validates a default operator appearance record with default priceStatus and null details', () => {
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
        brandName: null,
        drawerList: ['唯@W'],
        description: null,
        dialog: null,
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
      expect(parsed.brandName).toBeNull()
      expect(parsed.description).toBeNull()
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
        obtainApproach: {
          en: 'Event Reward',
          zh: '活动获得',
          source: 'official' as const,
          isMachineTranslation: false,
        },
        priceStatus: 'free' as const,
      }

      const parsed = SkinSchema.parse(rewardSkin)
      expect(parsed.priceStatus).toBe('free')
      expect(parsed.price).toBeNull()
      expect(parsed.obtainApproach?.en).toBe('Event Reward')
    })

    it('validates a CN-only skin record with pending provenance', () => {
      const cnOnlySkin = {
        ...baseValidSkin,
        skinId: 'char_1001_amiya2@casc#1',
        skinName: {
          en: '[Pending Translation]',
          zh: '触及星辰',
          source: 'pending' as const,
          isMachineTranslation: false,
        },
        obtainApproach: {
          en: '[Pending Translation]',
          zh: '采购中心',
          source: 'pending' as const,
          isMachineTranslation: false,
        },
        isCnOnly: true,
        servers: ['cn' as const],
      }

      const parsed = SkinSchema.parse(cnOnlySkin)
      expect(parsed.isCnOnly).toBe(true)
      expect(parsed.servers).toEqual(['cn'])
      expect(parsed.skinName.source).toBe('pending')
      expect(parsed.obtainApproach?.source).toBe('pending')
    })

    it('rejects invalid skin records missing mandatory fields', () => {
      expect(() =>
        SkinSchema.parse({
          skinId: 'incomplete_skin',
        }),
      ).toThrow()
    })

    it('rejects raw string values for localized user-facing fields', () => {
      expect(() =>
        SkinSchema.parse({
          ...baseValidSkin,
          brandName: 'Coral Coast', // Must be an I18nString object or null
        }),
      ).toThrow()

      expect(() =>
        SkinSchema.parse({
          ...baseValidSkin,
          description: 'A raw description string',
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
      expect(statusCounts.free).toBe(115)
      expect(statusCounts.unknown).toBe(411)
    })
  })

  describe('CJK-Safety Fuse Test', () => {
    it('ensures no user-facing field in data/skins.json is a raw string containing CJK', () => {
      const skins = skinsDataset as unknown as Record<string, unknown>[]
      const checkFields = ['brandName', 'obtainApproach', 'description', 'dialog'] as const

      for (const skin of skins) {
        for (const field of checkFields) {
          const val = skin[field]
          if (typeof val === 'string') {
            expect(CJK_IDEOGRAPH_REGEX.test(val)).toBe(false)
          }
        }
      }
    })

    it('ensures English fields in data/skins.json do not contain CJK characters', () => {
      const skins = skinsDataset as Skin[]
      const checkFields = [
        'skinName',
        'brandName',
        'obtainApproach',
        'description',
        'dialog',
      ] as const

      for (const skin of skins) {
        for (const field of checkFields) {
          const item = skin[field]
          if (item && typeof item === 'object' && 'en' in item) {
            const hasCjk = CJK_IDEOGRAPH_REGEX.test(item.en)
            if (hasCjk) {
              expect.fail(
                `Skin '${skin.skinId}' field '${field}.en' contains CJK ideographs: "${item.en}"`,
              )
            }
          }
        }
      }
    })

    it('ensures char_002_amiya@epoque#4 has English brandName "Test Collection/II" rather than Chinese', () => {
      const amiyaSkin = (skinsDataset as Skin[]).find((s) => s.skinId === 'char_002_amiya@epoque#4')
      expect(amiyaSkin).toBeDefined()
      expect(amiyaSkin?.brandName?.en).toBe('Test Collection/II')
      expect(amiyaSkin?.brandName?.source).toBe('official')
      expect(CJK_IDEOGRAPH_REGEX.test(amiyaSkin?.brandName?.en ?? '')).toBe(false)
    })

    it('ensures all 72 CN-only skins have pending provenance and no CJK in en fields', () => {
      const cnOnlySkins = (skinsDataset as Skin[]).filter((s) => s.isCnOnly)
      expect(cnOnlySkins.length).toBe(72)

      for (const skin of cnOnlySkins) {
        if (!skin.isDefault) {
          expect(CJK_IDEOGRAPH_REGEX.test(skin.skinName.en)).toBe(false)
          if (skin.skinName.source === 'pending') {
            expect(skin.skinName.en).toBe('[Pending Translation]')
          }
          if (skin.obtainApproach?.source === 'pending') {
            expect(skin.obtainApproach.en).toBe('[Pending Translation]')
          }
        }
      }
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
      expect(getSkinPriceStatus({ skinId: 'char_102_texas#2', isDefault: true })).toBe('default')
    })

    it('returns "unknown" for store outfits', () => {
      expect(
        getSkinPriceStatus({
          skinId: 'char_102_texas@summer#1',
          isBuySkin: true,
          obtainApproach: 'Store',
        }),
      ).toBe('unknown')

      expect(
        getSkinPriceStatus({
          skinId: 'char_1035_wisdel@sale#14',
          isBuySkin: true,
          obtainApproach: 'Store',
        }),
      ).toBe('unknown')

      expect(
        getSkinPriceStatus({
          skinId: 'char_1001_amiya2@casc#1',
          isBuySkin: true,
          obtainApproach: 'Store, Redeem Code',
        }),
      ).toBe('unknown')
    })

    it('returns "free" for event rewards, gifts, IS, RA, and packs', () => {
      expect(
        getSkinPriceStatus({
          skinId: 'char_002_amiya@winter#1',
          isBuySkin: true,
          obtainApproach: 'Quest Reward',
        }),
      ).toBe('free')

      expect(
        getSkinPriceStatus({
          skinId: 'char_199_yak@summer#1',
          isBuySkin: true,
          obtainApproach: 'Event Reward',
        }),
      ).toBe('free')

      expect(
        getSkinPriceStatus({
          skinId: 'char_1011_lava2@whirlwind#9',
          isBuySkin: true,
          obtainApproach: 'Integrated Strategies',
        }),
      ).toBe('free')

      expect(
        getSkinPriceStatus({
          skinId: 'char_4042_lupus@epoque#30',
          isBuySkin: true,
          obtainApproach: 'Reclamation Algorithm',
        }),
      ).toBe('free')

      expect(
        getSkinPriceStatus({
          skinId: 'char_512_aprot@free#1',
          isBuySkin: false,
        }),
      ).toBe('free')
    })
  })
})
