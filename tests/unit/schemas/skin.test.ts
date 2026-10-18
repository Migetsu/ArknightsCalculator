import { describe, expect, it } from 'vitest'
import { SkinSchema, SkinListSchema, SkinRecordMapSchema } from '../../../shared/schemas/skin'
import { calculateSkinPrice, isDefaultSkin, KNOWN_15_OP_SKIN_IDS } from '../../../shared/utils/skin'

describe('Skin Schema and Utilities', () => {
  describe('SkinSchema validation', () => {
    it('validates a complete cosmetic outfit record', () => {
      const validSkin = {
        skinId: 'char_102_texas@summer#1',
        charId: 'char_102_texas',
        skinName: {
          en: 'Sunburn',
          zh: '日晒',
          source: 'official',
          isMachineTranslation: false,
        },
        brandId: 'summer',
        brandName: 'Coral Coast',
        drawerList: ['幻象黑兔'],
        description: 'Sun and sand.',
        dialog: 'Coral Coast series summer outfit.',
        obtainApproach: 'Store',
        isBuySkin: true,
        price: 18,
        currency: 'ORIGINITE_PRIME',
        illustId: 'illust_char_102_texas_summer#1',
        avatarId: 'char_102_texas_summer#1',
        portraitId: 'char_102_texas_summer#1',
        isCnOnly: false,
        servers: ['cn', 'en'],
      }

      const parsed = SkinSchema.parse(validSkin)
      expect(parsed.skinId).toBe('char_102_texas@summer#1')
      expect(parsed.price).toBe(18)
      expect(parsed.currency).toBe('ORIGINITE_PRIME')
      expect(parsed.servers).toEqual(['cn', 'en'])
    })

    it('validates a default operator appearance record with null price and brand', () => {
      const defaultSkin = {
        skinId: 'char_002_amiya#1',
        charId: 'char_002_amiya',
        skinName: {
          en: 'Default',
          zh: '默认',
          source: 'official',
          isMachineTranslation: false,
        },
        brandId: null,
        brandName: 'Default Outfit',
        drawerList: ['唯@W'],
        description: null,
        dialog: null,
        obtainApproach: null,
        isBuySkin: false,
        price: null,
        currency: null,
        illustId: 'illust_char_002_amiya_1',
        avatarId: 'char_002_amiya',
        portraitId: 'char_002_amiya_1',
        isCnOnly: false,
        servers: ['cn', 'en'],
      }

      const parsed = SkinSchema.parse(defaultSkin)
      expect(parsed.skinId).toBe('char_002_amiya#1')
      expect(parsed.isBuySkin).toBe(false)
      expect(parsed.price).toBeNull()
    })

    it('validates a CN-only skin record', () => {
      const cnOnlySkin = {
        skinId: 'char_1001_amiya2@casc#1',
        charId: 'char_002_amiya',
        skinName: {
          en: '[Pending Translation]',
          zh: '触及星辰',
          source: 'pending',
          isMachineTranslation: false,
        },
        brandId: 'casc',
        brandName: 'CASC',
        drawerList: ['Mag42'],
        description: 'CN-only description',
        dialog: 'CN-only dialog',
        obtainApproach: '采购中心',
        isBuySkin: true,
        price: 18,
        currency: 'ORIGINITE_PRIME',
        illustId: 'illust_char_1001_amiya2_casc#1',
        avatarId: 'char_1001_amiya2_casc#1',
        portraitId: 'char_1001_amiya2_casc#1',
        isCnOnly: true,
        servers: ['cn'],
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

    it('validates SkinListSchema and SkinRecordMapSchema', () => {
      const item = {
        skinId: 'char_002_amiya@winter#1',
        charId: 'char_002_amiya',
        skinName: {
          en: 'Newsgirl',
          zh: '报童',
          source: 'official',
        },
        drawerList: ['唯@W'],
        isBuySkin: true,
        price: null,
        currency: null,
        illustId: 'illust_char_002_amiya_winter#1',
        avatarId: 'char_002_amiya_winter#1',
        portraitId: 'char_002_amiya_winter#1',
        isCnOnly: false,
        servers: ['cn', 'en'],
      }

      const listParsed = SkinListSchema.parse([item])
      expect(listParsed).toHaveLength(1)

      const mapParsed = SkinRecordMapSchema.parse({
        [item.skinId]: item,
      })
      expect(mapParsed[item.skinId]?.skinName.en).toBe('Newsgirl')
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

  describe('calculateSkinPrice pure function', () => {
    it('returns null price for free reward skins (Event Reward, Quest Reward, IS, RA)', () => {
      expect(
        calculateSkinPrice({
          skinId: 'char_002_amiya@winter#1',
          isBuySkin: true,
          obtainApproach: 'Quest Reward',
          displayTagId: 'Event Reward',
        }),
      ).toEqual({})

      expect(
        calculateSkinPrice({
          skinId: 'char_199_yak@summer#1',
          isBuySkin: true,
          obtainApproach: '活动获得',
          displayTagId: '活动获得',
        }),
      ).toEqual({})

      expect(
        calculateSkinPrice({
          skinId: 'char_512_aprot#1',
          isBuySkin: false,
          obtainApproach: null,
          displayTagId: null,
        }),
      ).toEqual({})
    })

    it('calculates 24 OP for Dynamic Live2D skins with entrance animation or dynamic voice', () => {
      const res = calculateSkinPrice({
        skinId: 'char_003_kalts@boc#6',
        isBuySkin: true,
        dynEntranceId: 'dyn_entrance_char_003_kalts_boc#6',
        dynIllustId: 'dyn_illust_char_003_kalts_boc#6',
        voiceType: 'ALL',
        obtainApproach: 'Store',
      })

      expect(res).toEqual({
        price: 24,
        currency: 'ORIGINITE_PRIME',
      })

      const resCn = calculateSkinPrice({
        skinId: 'char_1035_wisdel@sale#14',
        isBuySkin: true,
        dynEntranceId: 'dyn_entrance_char_1035_wisdel_sale#14',
        dynIllustId: 'dyn_illust_char_1035_wisdel_sale#14',
        voiceType: 'ALL',
        obtainApproach: '采购中心',
      })

      expect(resCn).toEqual({
        price: 24,
        currency: 'ORIGINITE_PRIME',
      })
    })

    it('calculates 21 OP for Live2D skins without entrance animation', () => {
      const res = calculateSkinPrice({
        skinId: 'char_250_phatom@sale#4',
        isBuySkin: true,
        dynEntranceId: null,
        dynIllustId: 'dyn_illust_char_250_phatom_sale#4',
        voiceType: 'NONE',
        obtainApproach: 'Store',
      })

      expect(res).toEqual({
        price: 21,
        currency: 'ORIGINITE_PRIME',
      })
    })

    it('calculates 15 OP for known early standard skins without particle effects', () => {
      const sample15Id = Array.from(KNOWN_15_OP_SKIN_IDS)[0]!
      const res = calculateSkinPrice({
        skinId: sample15Id,
        isBuySkin: true,
        dynEntranceId: null,
        dynIllustId: null,
        voiceType: 'NONE',
        obtainApproach: 'Store',
      })

      expect(res).toEqual({
        price: 15,
        currency: 'ORIGINITE_PRIME',
      })
    })

    it('calculates 18 OP for standard store outfits', () => {
      const res = calculateSkinPrice({
        skinId: 'char_350_surtr@it#1',
        isBuySkin: true,
        dynEntranceId: null,
        dynIllustId: null,
        voiceType: 'NONE',
        obtainApproach: 'Store',
      })

      expect(res).toEqual({
        price: 18,
        currency: 'ORIGINITE_PRIME',
      })
    })
  })
})
