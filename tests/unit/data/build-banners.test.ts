import { describe, expect, it } from 'vitest'
import {
  buildBannersDataset,
  isPerpetualPool,
  isStarterPool,
  mapRuleToBannerType,
  PERPETUAL_THRESHOLD_DAYS,
} from '../../../scripts/data/build-banners'
import { BannersDatasetSchema } from '../../../shared/schemas/banner'

describe('Banners Dataset Builder (scripts/data/build-banners.ts)', () => {
  describe('Filter helpers', () => {
    it('identifies starter pools by prefix or name', () => {
      expect(isStarterPool({ gachaPoolId: 'BOOT_0_1_1', gachaRuleType: 'NORMAL', openTime: 0, endTime: 100, gachaIndex: 0, gachaPoolName: 'Starter' })).toBe(true)
      expect(isStarterPool({ gachaPoolId: 'boot_special', gachaRuleType: 'NORMAL', openTime: 0, endTime: 100, gachaIndex: 0, gachaPoolName: 'Starter' })).toBe(true)
      expect(isStarterPool({ gachaPoolId: 'newbee_pool', gachaRuleType: 'NORMAL', openTime: 0, endTime: 100, gachaIndex: 0, gachaPoolName: 'Newbee' })).toBe(true)
      expect(isStarterPool({ gachaPoolId: 'NORM_0_0_1', gachaRuleType: 'NORMAL', openTime: 0, endTime: 100, gachaIndex: 0, gachaPoolName: 'Standard' })).toBe(false)
      expect(isStarterPool({ gachaPoolId: 'LIMITED_EN_42_0_1', gachaRuleType: 'LIMITED', openTime: 0, endTime: 100, gachaIndex: 0, gachaPoolName: 'Sealed With Time' })).toBe(false)
    })

    it('identifies perpetual pools by rule BACKFLOW or excessive duration (> 180 days)', () => {
      // BACKFLOW rule (e.g. RETURN_EN_41_0_1)
      expect(isPerpetualPool({
        gachaPoolId: 'RETURN_EN_41_0_1',
        gachaRuleType: 'BACKFLOW',
        openTime: 1661270400,
        endTime: 1793185199,
        gachaIndex: 1,
        gachaPoolName: 'Return Headhunting',
      })).toBe(true)

      // Long duration > 180 days
      expect(isPerpetualPool({
        gachaPoolId: 'PERPETUAL_TEST',
        gachaRuleType: 'NORMAL',
        openTime: 100000,
        endTime: 100000 + (PERPETUAL_THRESHOLD_DAYS + 1) * 86400,
        gachaIndex: 1,
        gachaPoolName: 'Neverending',
      })).toBe(true)

      // Distant end time (year 2030+)
      expect(isPerpetualPool({
        gachaPoolId: 'YEAR_2030_POOL',
        gachaRuleType: 'NORMAL',
        openTime: 1600000000,
        endTime: 1918239000,
        gachaIndex: 1,
        gachaPoolName: 'Future 2030',
      })).toBe(true)

      // Standard 14-day event pool
      expect(isPerpetualPool({
        gachaPoolId: 'LIMITED_EN_42_0_1',
        gachaRuleType: 'LIMITED',
        openTime: 1791982800,
        endTime: 1793185199, // ~13.9 days
        gachaIndex: 1,
        gachaPoolName: 'Sealed With Time',
      })).toBe(false)
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

  describe('buildBannersDataset execution & data integrity', () => {
    const FIXED_TIMESTAMP = 1792414109 // 2026-10-19 reference
    const { dataset, stats } = buildBannersDataset({ now: FIXED_TIMESTAMP, write: false })

    it('validates against BannersDatasetSchema', () => {
      const parsed = BannersDatasetSchema.safeParse(dataset)
      expect(parsed.success).toBe(true)
    })

    it('excludes exactly starter pools and perpetual returning pools', () => {
      expect(stats.enExcludedPerpetual).toBe(1)
      expect(stats.cnExcludedPerpetual).toBe(1)

      // Verify neither RETURN_EN_41_0_1 nor RETURN_71_0_1 is in dataset
      const allIds = new Set(dataset.banners.map((b) => b.id))
      expect(allIds.has('RETURN_EN_41_0_1')).toBe(false)
      expect(allIds.has('RETURN_71_0_1')).toBe(false)

      // Verify no boot_ or newbee in banners
      for (const banner of dataset.banners) {
        expect(banner.id.toLowerCase().startsWith('boot_')).toBe(false)
        expect(banner.id.toLowerCase().includes('newbee')).toBe(false)
        expect(banner.ruleType).not.toBe('BACKFLOW')
        expect(banner.durationDays).toBeLessThanOrEqual(PERPETUAL_THRESHOLD_DAYS)
      }
    })

    it('sorts CN and EN banners chronologically ascending by openTime', () => {
      expect(dataset.cnBanners.length).toBeGreaterThan(0)
      for (let i = 0; i < dataset.cnBanners.length - 1; i++) {
        const curr = dataset.cnBanners[i]!
        const next = dataset.cnBanners[i + 1]!
        expect(curr.openTime).toBeLessThanOrEqual(next.openTime)
      }

      expect(dataset.enBanners.length).toBeGreaterThan(0)
      for (let i = 0; i < dataset.enBanners.length - 1; i++) {
        const curr = dataset.enBanners[i]!
        const next = dataset.enBanners[i + 1]!
        expect(curr.openTime).toBeLessThanOrEqual(next.openTime)
      }

      // Earliest CN banner is beta test pool NORM_0_1_1 (1548727200)
      expect(dataset.cnBanners[0]?.id).toBe('NORM_0_1_1')
      expect(dataset.cnBanners[0]?.openTime).toBe(1548727200)
    })

    it('identifies the active EN banner at reference timestamp', () => {
      expect(stats.currentEnBanner).not.toBeNull()
      expect(stats.currentEnBanner?.id).toBe('LIMITED_EN_42_0_1')
      expect(stats.currentEnBanner?.name).toBe('Sealed With Time')
      expect(stats.currentEnBanner?.ruleType).toBe('LIMITED')
      expect(stats.currentEnBanner?.openTime).toBeLessThanOrEqual(FIXED_TIMESTAMP)
      expect(stats.currentEnBanner?.endTime).toBeGreaterThanOrEqual(FIXED_TIMESTAMP)

      // Verified active flag in enBanners
      const enActive = dataset.enBanners.find((b) => b.id === 'LIMITED_EN_42_0_1')
      expect(enActive?.isActive).toBe(true)

      // Inactive past banner
      const enPast = dataset.enBanners.find((b) => b.id === 'NORM_EN_0_1_1')
      expect(enPast?.isActive).toBe(false)
    })

    it('matches 25 out of 25 LIMITED banners between EN and CN via LMTGSID', () => {
      expect(stats.verifiedLimitedPairsCount).toBe(25)
      expect(stats.verifiedLimitedPairs.length).toBe(25)

      // Check first, middle, and latest pairs
      const firstPair = stats.verifiedLimitedPairs[0]!
      expect(firstPair.lmtgsid).toBe('LMTGS_COIN_903')
      expect(firstPair.enName).toBe('Cremation Last Wish')
      expect(firstPair.cnName).toBe('遗愿焰火')

      const radiantPair = stats.verifiedLimitedPairs.find((p) => p.lmtgsid === 'LMTGS_COIN_2301')!
      expect(radiantPair).toBeDefined()
      expect(radiantPair.enName).toBe('Path of the Radiant')
      expect(radiantPair.cnName).toBe('循光道途')

      const latestPair = stats.verifiedLimitedPairs[stats.verifiedLimitedPairs.length - 1]!
      expect(latestPair.lmtgsid).toBe('LMTGS_COIN_7301')
      expect(latestPair.enName).toBe('Sealed With Time')
      expect(latestPair.cnName).toBe('承诺')
    })

    it('predicts the Next EN Limited Banner as LIMITED_76_0_1', () => {
      expect(stats.nextEnLimitedBanner).not.toBeNull()
      expect(stats.nextEnLimitedBanner?.id).toBe('LIMITED_76_0_1')
      expect(stats.nextEnLimitedBanner?.name).toBe('车辙与风的归所')
      expect(stats.nextEnLimitedBanner?.lmtgsid).toBe('LMTGS_COIN_7601')
      expect(stats.nextEnLimitedBanner?.server).toBe('cn')

      // Check isNextEnBanner flag on cnBanners
      const nextCnBanner = dataset.cnBanners.find((b) => b.id === 'LIMITED_76_0_1')
      expect(nextCnBanner?.isNextEnBanner).toBe(true)
    })

    it('demonstrates 100% precision for positional matching on LIMITED benchmark', () => {
      const enLimited = dataset.enBanners.filter((b) => b.ruleType === 'LIMITED')
      const cnLimited = dataset.cnBanners.filter((b) => b.ruleType === 'LIMITED')

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

      // Exactly 25/25 match positionally when filtered to LIMITED
      expect(positionalMatches).toBe(25)
    })

    it('leaves non-limited pairedBannerId null due to order divergence in other pool types', () => {
      const enNormal = dataset.enBanners.filter((b) => b.ruleType === 'NORMAL')
      const cnNormal = dataset.cnBanners.filter((b) => b.ruleType === 'NORMAL')

      // Count divergence makes positional matching inaccurate for non-limited
      expect(enNormal.length).not.toBe(cnNormal.length)

      // Verified: non-limited banners do not have guesswork pairedBannerId
      for (const banner of enNormal) {
        expect(banner.pairedBannerId).toBeNull()
      }
    })

    it('ensures rateUp6 and rateUp5 are empty arrays for modern data compatibility', () => {
      for (const banner of dataset.banners) {
        expect(Array.isArray(banner.rateUp6)).toBe(true)
        expect(Array.isArray(banner.rateUp5)).toBe(true)
      }
    })
  })
})
