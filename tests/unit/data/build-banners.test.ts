import { describe, expect, it } from 'vitest'
import {
  buildBannersFromTables,
  isPerpetualPool,
  isStarterPool,
  mapRuleToBannerType,
  PERPETUAL_THRESHOLD_DAYS,
  type RawGachaTable,
} from '../../../scripts/data/build-banners'
import committedBannersDataset from '../../../data/banners.json'
import { BannersDatasetSchema } from '../../../shared/schemas/banner'

describe('Banners Dataset Builder (scripts/data/build-banners.ts)', () => {
  describe('Filter helpers', () => {
    it('identifies starter pools by prefix or name', () => {
      expect(
        isStarterPool({
          gachaPoolId: 'BOOT_0_1_1',
          gachaRuleType: 'NORMAL',
          openTime: 0,
          endTime: 100,
          gachaIndex: 0,
          gachaPoolName: 'Starter',
        }),
      ).toBe(true)
      expect(
        isStarterPool({
          gachaPoolId: 'boot_special',
          gachaRuleType: 'NORMAL',
          openTime: 0,
          endTime: 100,
          gachaIndex: 0,
          gachaPoolName: 'Starter',
        }),
      ).toBe(true)
      expect(
        isStarterPool({
          gachaPoolId: 'newbee_pool',
          gachaRuleType: 'NORMAL',
          openTime: 0,
          endTime: 100,
          gachaIndex: 0,
          gachaPoolName: 'Newbee',
        }),
      ).toBe(true)
      expect(
        isStarterPool({
          gachaPoolId: 'NORM_0_0_1',
          gachaRuleType: 'NORMAL',
          openTime: 0,
          endTime: 100,
          gachaIndex: 0,
          gachaPoolName: 'Standard',
        }),
      ).toBe(false)
      expect(
        isStarterPool({
          gachaPoolId: 'LIMITED_EN_42_0_1',
          gachaRuleType: 'LIMITED',
          openTime: 0,
          endTime: 100,
          gachaIndex: 0,
          gachaPoolName: 'Sealed With Time',
        }),
      ).toBe(false)
    })

    it('identifies perpetual pools by rule BACKFLOW or excessive duration (> 180 days)', () => {
      // BACKFLOW rule (e.g. RETURN_EN_41_0_1)
      expect(
        isPerpetualPool({
          gachaPoolId: 'RETURN_EN_41_0_1',
          gachaRuleType: 'BACKFLOW',
          openTime: 1661270400,
          endTime: 1793185199,
          gachaIndex: 1,
          gachaPoolName: 'Return Headhunting',
        }),
      ).toBe(true)

      // Long duration > 180 days
      expect(
        isPerpetualPool({
          gachaPoolId: 'PERPETUAL_TEST',
          gachaRuleType: 'NORMAL',
          openTime: 100000,
          endTime: 100000 + (PERPETUAL_THRESHOLD_DAYS + 1) * 86400,
          gachaIndex: 1,
          gachaPoolName: 'Neverending',
        }),
      ).toBe(true)

      // Distant end time (year 2030+)
      expect(
        isPerpetualPool({
          gachaPoolId: 'YEAR_2030_POOL',
          gachaRuleType: 'NORMAL',
          openTime: 1600000000,
          endTime: 1918239000,
          gachaIndex: 1,
          gachaPoolName: 'Future 2030',
        }),
      ).toBe(true)

      // Standard 14-day event pool
      expect(
        isPerpetualPool({
          gachaPoolId: 'LIMITED_EN_42_0_1',
          gachaRuleType: 'LIMITED',
          openTime: 1791982800,
          endTime: 1793185199, // ~13.9 days
          gachaIndex: 1,
          gachaPoolName: 'Sealed With Time',
        }),
      ).toBe(false)
    })

    it('maps gachaRuleType and name to BannerType', () => {
      expect(mapRuleToBannerType('LIMITED', 'Sealed With Time')).toBe('limited')
      expect(mapRuleToBannerType('LINKAGE', 'Path of the Radiant')).toBe('limited')
      expect(mapRuleToBannerType('NORMAL', 'Joint Operation 12')).toBe('joint_operation')
      expect(mapRuleToBannerType('NORMAL', '第12次联合行动')).toBe('joint_operation')
      expect(mapRuleToBannerType('NORMAL', 'Standard Pool 123')).toBe('standard')
      expect(mapRuleToBannerType('SINGLE', 'Solo Rate-Up')).toBe('standard')
    })
  })

  describe('buildBannersFromTables pure execution with isolated fixtures', () => {
    const FIXED_NOW = 1792414109 // 2026-10-19 reference

    const sampleEnTable: RawGachaTable = {
      gachaPoolClient: [
        {
          gachaPoolId: 'BOOT_EN_0_1',
          gachaIndex: 0,
          openTime: 1579161600,
          endTime: 1610697600,
          gachaPoolName: 'Starter Headhunting',
          gachaRuleType: 'NORMAL',
        },
        {
          gachaPoolId: 'RETURN_EN_41_0_1',
          gachaIndex: 1,
          openTime: 1661270400,
          endTime: 1793185199,
          gachaPoolName: 'Return Headhunting',
          gachaRuleType: 'BACKFLOW',
        },
        {
          gachaPoolId: 'NORM_EN_0_1_1',
          gachaIndex: 2,
          openTime: 1579161600,
          endTime: 1580976000,
          gachaPoolName: 'Standard Pool 1',
          gachaRuleType: 'NORMAL',
        },
        {
          gachaPoolId: 'LIMITED_EN_42_0_1',
          gachaIndex: 3,
          openTime: 1791982800,
          endTime: 1793185199,
          gachaPoolName: 'Sealed With Time',
          gachaRuleType: 'LIMITED',
          LMTGSID: 'LMTGS_COIN_7301',
        },
      ],
    }

    const sampleCnTable: RawGachaTable = {
      gachaPoolClient: [
        {
          gachaPoolId: 'BOOT_CN_0_1',
          gachaIndex: 0,
          openTime: 1548727200,
          endTime: 1558727200,
          gachaPoolName: '新手寻访',
          gachaRuleType: 'NORMAL',
        },
        {
          gachaPoolId: 'RETURN_71_0_1',
          gachaIndex: 1,
          openTime: 1600000000,
          endTime: 1918239000,
          gachaPoolName: '回流寻访',
          gachaRuleType: 'BACKFLOW',
        },
        {
          gachaPoolId: 'NORM_0_1_1',
          gachaIndex: 2,
          openTime: 1548727200,
          endTime: 1558000000,
          gachaPoolName: '标准寻访 1',
          gachaRuleType: 'NORMAL',
        },
        {
          gachaPoolId: 'LIMITED_73_0_1',
          gachaIndex: 3,
          openTime: 1777500000,
          endTime: 1778500000,
          gachaPoolName: '承诺',
          gachaRuleType: 'LIMITED',
          LMTGSID: 'LMTGS_COIN_7301',
        },
        {
          gachaPoolId: 'LIMITED_76_0_1',
          gachaIndex: 4,
          openTime: 1795000000,
          endTime: 1796500000,
          gachaPoolName: '车辙与风的归所',
          gachaRuleType: 'LIMITED',
          LMTGSID: 'LMTGS_COIN_7601',
        },
      ],
    }

    const { dataset, stats } = buildBannersFromTables(sampleEnTable, sampleCnTable, { now: FIXED_NOW })

    it('validates against BannersDatasetSchema', () => {
      const parsed = BannersDatasetSchema.safeParse(dataset)
      expect(parsed.success).toBe(true)
    })

    it('excludes starter pools and perpetual returning pools', () => {
      expect(stats.enExcludedStarter).toBe(1)
      expect(stats.enExcludedPerpetual).toBe(1)
      expect(stats.cnExcludedStarter).toBe(1)
      expect(stats.cnExcludedPerpetual).toBe(1)

      const ids = new Set(dataset.banners.map((b) => b.id))
      expect(ids.has('BOOT_EN_0_1')).toBe(false)
      expect(ids.has('RETURN_EN_41_0_1')).toBe(false)
      expect(ids.has('BOOT_CN_0_1')).toBe(false)
      expect(ids.has('RETURN_71_0_1')).toBe(false)
    })

    it('sorts CN and EN banners chronologically ascending by openTime', () => {
      expect(dataset.cnBanners.length).toBe(3) // NORM_0_1_1, LIMITED_73_0_1, LIMITED_76_0_1
      expect(dataset.cnBanners[0]?.id).toBe('NORM_0_1_1')
      expect(dataset.cnBanners[1]?.id).toBe('LIMITED_73_0_1')
      expect(dataset.cnBanners[2]?.id).toBe('LIMITED_76_0_1')

      expect(dataset.enBanners.length).toBe(2) // NORM_EN_0_1_1, LIMITED_EN_42_0_1
      expect(dataset.enBanners[0]?.id).toBe('NORM_EN_0_1_1')
      expect(dataset.enBanners[1]?.id).toBe('LIMITED_EN_42_0_1')
    })

    it('identifies the active EN banner at reference timestamp', () => {
      expect(stats.currentEnBanner).not.toBeNull()
      expect(stats.currentEnBanner?.id).toBe('LIMITED_EN_42_0_1')
      expect(stats.currentEnBanner?.name.en).toBe('Sealed With Time')

      const enActive = dataset.enBanners.find((b) => b.id === 'LIMITED_EN_42_0_1')
      expect(enActive?.isActive).toBe(true)

      const enPast = dataset.enBanners.find((b) => b.id === 'NORM_EN_0_1_1')
      expect(enPast?.isActive).toBe(false)
    })

    it('matches LIMITED banners between EN and CN via LMTGSID', () => {
      expect(stats.verifiedLimitedPairsCount).toBe(1)
      expect(stats.verifiedLimitedPairs[0]?.lmtgsid).toBe('LMTGS_COIN_7301')
      expect(stats.verifiedLimitedPairs[0]?.enId).toBe('LIMITED_EN_42_0_1')
      expect(stats.verifiedLimitedPairs[0]?.cnId).toBe('LIMITED_73_0_1')

      const enLimited = dataset.enBanners.find((b) => b.id === 'LIMITED_EN_42_0_1')
      expect(enLimited?.pairedBannerId).toBe('LIMITED_73_0_1')

      const cnLimited = dataset.cnBanners.find((b) => b.id === 'LIMITED_73_0_1')
      expect(cnLimited?.pairedBannerId).toBe('LIMITED_EN_42_0_1')
    })

    it('predicts the Next EN Limited Banner as the first unreleased CN limited pool', () => {
      expect(stats.nextEnLimitedBanner).not.toBeNull()
      expect(stats.nextEnLimitedBanner?.id).toBe('LIMITED_76_0_1')
      expect(stats.nextEnLimitedBanner?.lmtgsid).toBe('LMTGS_COIN_7601')

      const nextCnBanner = dataset.cnBanners.find((b) => b.id === 'LIMITED_76_0_1')
      expect(nextCnBanner?.isNextEnBanner).toBe(true)
    })

    it('leaves non-limited pairedBannerId null due to order divergence in other pool types', () => {
      const enNormal = dataset.enBanners.find((b) => b.id === 'NORM_EN_0_1_1')
      expect(enNormal?.pairedBannerId).toBeNull()
    })

    it('ensures rateUp6 and rateUp5 are empty arrays for modern data compatibility', () => {
      for (const banner of dataset.banners) {
        expect(Array.isArray(banner.rateUp6)).toBe(true)
        expect(Array.isArray(banner.rateUp5)).toBe(true)
      }
    })
  })

  describe('Committed dataset integrity (data/banners.json)', () => {
    it('validates committed dataset against BannersDatasetSchema', () => {
      const parsed = BannersDatasetSchema.safeParse(committedBannersDataset)
      expect(parsed.success).toBe(true)
    })

    it('contains all 25 verified LIMITED pairs matching LMTGSID', () => {
      const enLimited = committedBannersDataset.enBanners.filter((b) => b.ruleType === 'LIMITED')
      const cnLimited = committedBannersDataset.cnBanners.filter((b) => b.ruleType === 'LIMITED')

      expect(enLimited.length).toBe(25)
      expect(cnLimited.length).toBeGreaterThanOrEqual(26)

      let positionalMatches = 0
      for (let i = 0; i < enLimited.length; i++) {
        const enP = enLimited[i]!
        const cnP = cnLimited[i]!
        if (enP.lmtgsid && cnP.lmtgsid && enP.lmtgsid === cnP.lmtgsid) {
          positionalMatches++
        }
      }

      expect(positionalMatches).toBe(25)
    })

    it('verifies active EN banner and Next EN Limited Banner in committed dataset', () => {
      expect(committedBannersDataset.meta.currentEnBanner?.id).toBe('LIMITED_EN_42_0_1')
      expect(committedBannersDataset.meta.nextEnLimitedBanner?.id).toBe('LIMITED_76_0_1')
    })
  })
})
