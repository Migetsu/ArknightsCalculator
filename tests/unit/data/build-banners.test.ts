import { describe, expect, it } from 'vitest'
import {
  buildBannersFromTables,
  formatCnLocalDate,
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

  describe('formatCnLocalDate', () => {
    it('formats UTC timestamps as CN-local (UTC+8) calendar dates', () => {
      expect(formatCnLocalDate(1778832000)).toBe('2026/05/15') // 2026-05-15T08:00Z
      expect(formatCnLocalDate(1779998399)).toBe('2026/05/29') // 2026-05-28T19:59:59Z
      expect(formatCnLocalDate(1780268400)).toBe('2026/06/01') // 2026-05-31T23:00Z
      expect(formatCnLocalDate(1792699199)).toBe('2026/10/23') // 2026-10-22T19:59:59Z
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
      expect(cnLimited?.name.en).toBe('Sealed With Time')
      expect(cnLimited?.name.zh).toBe('承诺')
      expect(cnLimited?.name.source).toBe('official')
      expect(cnLimited?.name.isMachineTranslation).toBe(false)
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
      expect(committedBannersDataset.meta.currentEnBanner?.id).toBe('DOUBLE_EN_42_0_2')
      expect(committedBannersDataset.meta.nextEnLimitedBanner?.id).toBe('LIMITED_76_0_1')
    })

    it('verifies art coverage in committed dataset (306 CN and 148 EN banners with art)', () => {
      const cnWithArt = committedBannersDataset.cnBanners.filter((b) => b.hasArt)
      const cnWithoutArt = committedBannersDataset.cnBanners.filter((b) => !b.hasArt)
      const enWithArt = committedBannersDataset.enBanners.filter((b) => b.hasArt)
      const enWithoutArt = committedBannersDataset.enBanners.filter((b) => !b.hasArt)

      expect(cnWithArt.length).toBe(306)
      expect(cnWithoutArt.length).toBe(147)
      expect(enWithArt.length).toBe(148)
      expect(enWithoutArt.length).toBe(260)

      for (const b of cnWithArt) {
        expect(b.artId).toBe(b.id)
      }
      for (const b of enWithArt) {
        const allowed = b.pairedBannerId
          ? [b.pairedBannerId, b.id]
          : [b.id.replace('_EN_', '_'), b.id]
        expect(allowed).toContain(b.artId)
      }
    })

    it('uses paired CN art for EN banners and never a foreign stripped id', () => {
      const pairedArt: Record<string, string> = {
        LIMITED_EN_27_0_3: 'LIMITED_44_0_1',
        NORM_EN_27_0_6: 'NORM_44_0_3',
        NORM_EN_32_0_2: 'NORM_52_0_2',
        NORM_EN_33_0_5: 'NORM_56_0_3',
        SINGLE_EN_37_0_1: 'SINGLE_63_0_1',
        SINGLE_EN_40_0_1: 'SINGLE_69_0_1',
        NORM_EN_41_0_3: 'NORM_71_0_3',
      }
      for (const [enId, cnArtId] of Object.entries(pairedArt)) {
        const banner = committedBannersDataset.enBanners.find((b) => b.id === enId)
        expect(banner?.artId).toBe(cnArtId)
      }

      // Paired CN pools without any published art stay without art instead of
      // borrowing the art of an unrelated stripped pool.
      for (const enId of ['NORM_EN_30_0_3', 'NORM_EN_32_0_4']) {
        const banner = committedBannersDataset.enBanners.find((b) => b.id === enId)
        expect(banner?.pairedBannerId).toBeTruthy()
        expect(banner?.hasArt).toBe(false)
      }
    })

    it('verifies rate-up operators and real Global dates coverage in committed dataset', () => {
      const cnWithRateUp = committedBannersDataset.cnBanners.filter(
        (b) => b.rateUp6.length > 0 || b.rateUp5.length > 0,
      )
      const enWithRateUp = committedBannersDataset.enBanners.filter(
        (b) => b.rateUp6.length > 0 || b.rateUp5.length > 0,
      )
      const cnWithGlobalDate = committedBannersDataset.cnBanners.filter(
        (b) => Boolean(b.globalStartDate),
      )
      const cnWithPair = committedBannersDataset.cnBanners.filter(
        (b) => Boolean(b.pairedBannerId),
      )

      expect(cnWithRateUp.length).toBe(195)
      expect(enWithRateUp.length).toBe(399)
      expect(cnWithGlobalDate.length).toBe(188)
      expect(cnWithPair.length).toBe(187)

      // Verified benchmark banner: Cremation Last Wish (W & Weedy)
      const wBanner = committedBannersDataset.cnBanners.find((b) => b.id === 'LIMITED_9_0_3')
      expect(wBanner).toBeDefined()
      expect(wBanner?.rateUp6).toEqual(['char_113_cqbw', 'char_400_weedy'])
      expect(wBanner?.rateUp5).toEqual(['char_401_elysm'])
      expect(wBanner?.primaryRateUp6).toBe('char_113_cqbw')
      expect(wBanner?.globalStartDate).toBe('2020/12/30')
      expect(wBanner?.globalEndDate).toBe('2021/01/13')
      expect(wBanner?.pairedBannerId).toBe('LIMITED_EN_4_3_1')

      // Paired EN banner matches
      const enW = committedBannersDataset.enBanners.find((b) => b.id === 'LIMITED_EN_4_3_1')
      expect(enW).toBeDefined()
      expect(enW?.pairedBannerId).toBe('LIMITED_9_0_3')
      expect(enW?.rateUp6).toEqual(['char_113_cqbw', 'char_400_weedy'])
    })
  })

  describe('Banner Art assignment in buildBannersFromTables', () => {
    it('accurately sets hasArt and artId based on knownArtIds for CN and EN', () => {
      const mockEn: RawGachaTable = {
        gachaPoolClient: [
          {
            gachaPoolId: 'NORM_EN_24_0_2',
            gachaIndex: 1,
            openTime: 100,
            endTime: 200,
            gachaPoolName: 'EN Pool With Art',
            gachaRuleType: 'NORMAL',
          },
          {
            gachaPoolId: 'NORM_EN_0_1_1',
            gachaIndex: 2,
            openTime: 100,
            endTime: 200,
            gachaPoolName: 'EN Pool Without Art',
            gachaRuleType: 'NORMAL',
          },
        ],
      }
      const mockCn: RawGachaTable = {
        gachaPoolClient: [
          {
            gachaPoolId: 'NORM_24_0_2',
            gachaIndex: 1,
            openTime: 100,
            endTime: 200,
            gachaPoolName: 'CN Pool With Art',
            gachaRuleType: 'NORMAL',
          },
          {
            gachaPoolId: 'NORM_0_1_1',
            gachaIndex: 2,
            openTime: 100,
            endTime: 200,
            gachaPoolName: 'CN Pool Without Art',
            gachaRuleType: 'NORMAL',
          },
        ],
      }

      const knownArtIds = new Set(['NORM_24_0_2'])
      const { dataset } = buildBannersFromTables(mockEn, mockCn, { knownArtIds })

      const enWithArt = dataset.enBanners.find((b) => b.id === 'NORM_EN_24_0_2')
      expect(enWithArt?.hasArt).toBe(true)
      expect(enWithArt?.artId).toBe('NORM_24_0_2')

      const enWithoutArt = dataset.enBanners.find((b) => b.id === 'NORM_EN_0_1_1')
      expect(enWithoutArt?.hasArt).toBe(false)
      expect(enWithoutArt?.artId).toBeUndefined()

      const cnWithArt = dataset.cnBanners.find((b) => b.id === 'NORM_24_0_2')
      expect(cnWithArt?.hasArt).toBe(true)
      expect(cnWithArt?.artId).toBe('NORM_24_0_2')

      const cnWithoutArt = dataset.cnBanners.find((b) => b.id === 'NORM_0_1_1')
      expect(cnWithoutArt?.hasArt).toBe(false)
      expect(cnWithoutArt?.artId).toBeUndefined()
    })

    it('resolves CN banner English names via paired EN banner (official) or wiki fallback', () => {
      // 1. LIMITED_61_0_1 has official name from paired EN banner LIMITED_EN_36_0_1
      const cn61 = committedBannersDataset.cnBanners.find((b) => b.id === 'LIMITED_61_0_1')
      expect(cn61).toBeDefined()
      expect(cn61?.name.en).toBe('Freedom of Preach')
      expect(cn61?.name.zh).toBe('布道自由')
      expect(cn61?.name.source).toBe('official')
      expect(cn61?.name.isMachineTranslation).toBe(false)
      expect(cn61?.pairedBannerId).toBe('LIMITED_EN_36_0_1')

      // 2. LIMITED_76_0_1 (unreleased on Global) takes name from arknights.wiki.gg
      const cn76 = committedBannersDataset.cnBanners.find((b) => b.id === 'LIMITED_76_0_1')
      expect(cn76).toBeDefined()
      expect(cn76?.name.en).toBe('Trails End Winds Rest')
      expect(cn76?.name.zh).toBe('车辙与风的归所')
      expect(cn76?.name.source).toBe('wiki')
      expect(cn76?.name.isMachineTranslation).toBe(false)
      expect(cn76?.pairedBannerId).toBeNull()

      // 3. Provenance distribution across all 453 CN banners
      let officialCount = 0
      let wikiCount = 0
      let machineCount = 0
      let manualCount = 0

      for (const b of committedBannersDataset.cnBanners) {
        if (b.name.source === 'official') officialCount++
        else if (b.name.source === 'wiki') wikiCount++
        else if (b.name.source === 'machine') machineCount++
        else if (b.name.source === 'manual') manualCount++
      }

      expect(officialCount).toBe(187)
      expect(wikiCount).toBe(10)
      expect(manualCount).toBe(1)
      expect(machineCount).toBe(255)
      expect(officialCount + wikiCount + machineCount + manualCount).toBe(453)
    })
  })
})
