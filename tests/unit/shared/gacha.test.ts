import { describe, it, expect } from 'vitest'
import {
  calculateDaysRemaining,
  getBannerStatus,
  calculateTotalPulls,
  calculateSparkProgress,
  calculateRateUpProbability,
  getProbabilityMilestones,
  getTargetRateUpShare,
  formatHumanDate,
  formatBannerDateRange,
  isProvenNotOnGlobal,
  getBannerLifecycleStatus,
  getBannerArtCandidates,
  parseBannerDate,
  getUpcomingCutoff,
  getUpcomingBanners,
  getGlobalLagPairs,
  getGlobalLagDays,
  getEstimatedGlobalDate,
  UPCOMING_LAG_SAMPLE_SIZE,
} from '../../../shared/utils/gacha'
import type { GachaBanner } from '../../../shared/schemas/banner'
import type { I18nString } from '../../../shared/schemas/operator'

function mockI18n(en: string, zh: string = en): I18nString {
  return { en, zh, source: 'official', isMachineTranslation: false }
}

describe('Gacha Utility Engine', () => {
  describe('getBannerStatus and calculateDaysRemaining', () => {
    const fixedNow = new Date('2026-10-17T12:00:00Z')

    it('detects upcoming banner with correct days remaining', () => {
      const status = getBannerStatus('2026/11/06', '2026/11/20', fixedNow)
      expect(status.status).toBe('upcoming')
      expect(status.daysRemaining).toBe(20)
    })

    it('detects currently active banner', () => {
      const status = getBannerStatus('2026/10/10', '2026/10/25', fixedNow)
      expect(status.status).toBe('active')
      expect(status.daysRemaining).toBe(0)
    })

    it('detects ended banner', () => {
      const status = getBannerStatus('2026/09/01', '2026/09/15', fixedNow)
      expect(status.status).toBe('ended')
      expect(status.daysRemaining).toBe(0)
    })

    it('calculates days remaining to future date', () => {
      const days = calculateDaysRemaining('2026/11/06', fixedNow)
      expect(days).toBe(20)
    })
  })

  describe('calculateTotalPulls', () => {
    it('correctly converts orundum, OP, and permits into total rolls', () => {
      const total = calculateTotalPulls({
        orundum: 6000, // 10 pulls
        originitePrime: 33, // 33 * 180 = 5940 / 600 = 9 pulls
        permitsSingle: 5, // 5 pulls
        permitsTen: 2, // 20 pulls
      })
      expect(total).toBe(44)
    })

    it('handles empty or zero treasury gracefully', () => {
      expect(
        calculateTotalPulls({
          orundum: 0,
          originitePrime: 0,
          permitsSingle: 0,
          permitsTen: 0,
        }),
      ).toBe(0)
    })

    it('jointly converts orundum and OP remainders into pulls', () => {
      // 420 Orundum + 1 OP = 600 Orundum => 1 pull
      expect(
        calculateTotalPulls({
          orundum: 420,
          originitePrime: 1,
          permitsSingle: 0,
          permitsTen: 0,
        }),
      ).toBe(1)

      // 300 Orundum + 2 OP = 660 Orundum => 1 pull
      expect(
        calculateTotalPulls({
          orundum: 300,
          originitePrime: 2,
          permitsSingle: 0,
          permitsTen: 0,
        }),
      ).toBe(1)

      // 600 Orundum + 0 OP => 1 pull
      expect(
        calculateTotalPulls({
          orundum: 600,
          originitePrime: 0,
          permitsSingle: 0,
          permitsTen: 0,
        }),
      ).toBe(1)

      // 540 Orundum + 0 OP => 0 pulls
      expect(
        calculateTotalPulls({
          orundum: 540,
          originitePrime: 0,
          permitsSingle: 0,
          permitsTen: 0,
        }),
      ).toBe(0)

      // 0 Orundum + 3 OP = 540 Orundum => 0 pulls
      expect(
        calculateTotalPulls({
          orundum: 0,
          originitePrime: 3,
          permitsSingle: 0,
          permitsTen: 0,
        }),
      ).toBe(0)

      // 0 Orundum + 4 OP = 720 Orundum => 1 pull
      expect(
        calculateTotalPulls({
          orundum: 0,
          originitePrime: 4,
          permitsSingle: 0,
          permitsTen: 0,
        }),
      ).toBe(1)

      // 600 Orundum + 1 OP = 780 Orundum => 1 pull
      expect(
        calculateTotalPulls({
          orundum: 600,
          originitePrime: 1,
          permitsSingle: 0,
          permitsTen: 0,
        }),
      ).toBe(1)

      // 0 Orundum + 0 OP + permitsSingle=5 + permitsTen=2 => 25 pulls
      expect(
        calculateTotalPulls({
          orundum: 0,
          originitePrime: 0,
          permitsSingle: 5,
          permitsTen: 2,
        }),
      ).toBe(25)

      // 0 Orundum + 0 OP + permitsSingle=0 + permitsTen=0 => 0 pulls
      expect(
        calculateTotalPulls({
          orundum: 0,
          originitePrime: 0,
          permitsSingle: 0,
          permitsTen: 0,
        }),
      ).toBe(0)

      // 1 199 Orundum + 0 OP => 1 pull (remainder of 599 does not yield a pull)
      expect(
        calculateTotalPulls({
          orundum: 1199,
          originitePrime: 0,
          permitsSingle: 0,
          permitsTen: 0,
        }),
      ).toBe(1)

      // 1 200 Orundum + 0 OP => 2 pulls
      expect(
        calculateTotalPulls({
          orundum: 1200,
          originitePrime: 0,
          permitsSingle: 0,
          permitsTen: 0,
        }),
      ).toBe(2)
    })
  })

  describe('calculateSparkProgress', () => {
    it('computes spark milestones toward 300 guarantee', () => {
      const p0 = calculateSparkProgress(0)
      expect(p0.current).toBe(0)
      expect(p0.percentage).toBe(0)
      expect(p0.remaining).toBe(300)
      expect(p0.isReady).toBe(false)

      const p150 = calculateSparkProgress(150)
      expect(p150.current).toBe(150)
      expect(p150.percentage).toBe(50)
      expect(p150.remaining).toBe(150)
      expect(p150.isReady).toBe(false)

      const p300 = calculateSparkProgress(300)
      expect(p300.current).toBe(300)
      expect(p300.percentage).toBe(100)
      expect(p300.remaining).toBe(0)
      expect(p300.isReady).toBe(true)

      const p400 = calculateSparkProgress(400)
      expect(p400.current).toBe(300)
      expect(p400.percentage).toBe(100)
      expect(p400.remaining).toBe(0)
      expect(p400.isReady).toBe(true)
    })
  })

  describe('calculateRateUpProbability and milestones', () => {
    it('returns 0 probability for 0 pulls', () => {
      expect(calculateRateUpProbability(0)).toBe(0)
    })

    it('computes exact probability reflecting pity accumulation', () => {
      // 50 pulls on standard: base 2% rate without pity triggered yet
      const p50 = calculateRateUpProbability(50, 'standard')
      expect(p50).toBeGreaterThan(0.35)
      expect(p50).toBeLessThan(0.45)

      // 100 pulls: pity has kicked in
      const p100 = calculateRateUpProbability(100, 'standard')
      expect(p100).toBeGreaterThan(0.75)
      expect(p100).toBeLessThan(0.82)

      // 150 pulls
      const p150 = calculateRateUpProbability(150, 'standard')
      expect(p150).toBeGreaterThan(0.88)
      expect(p150).toBeLessThan(0.95)
    })

    it('guarantees 100% on Limited banners with 300 pulls via Spark', () => {
      expect(calculateRateUpProbability(300, 'limited')).toBe(1.0)
      expect(calculateRateUpProbability(350, 'limited')).toBe(1.0)
    })

    it('computes milestones for UI probability cards', () => {
      const milestones = getProbabilityMilestones('limited')
      expect(milestones.length).toBe(5)
      expect(milestones[0]?.pulls).toBe(50)
      expect(milestones[4]?.pulls).toBe(300)
      expect(milestones[4]?.probability).toBe(100)
      expect(milestones[4]?.isSpark).toBe(true)
    })

    it('returns 0 probability when targetRateUpShare is explicitly null', () => {
      expect(calculateRateUpProbability(50, 'standard', null)).toBe(0)
      expect(calculateRateUpProbability(100, 'limited', null)).toBe(0)
      expect(calculateRateUpProbability(300, 'limited', null)).toBe(0)
    })

    it('returns milestones with 0% probability and isSpark=false when targetRateUpShare is null', () => {
      const milestones = getProbabilityMilestones('limited', null)
      expect(milestones.length).toBe(5)
      expect(milestones[0]?.probability).toBe(0)
      expect(milestones[4]?.probability).toBe(0)
      expect(milestones[4]?.isSpark).toBe(false)
    })

    it('uses provided custom targetRateUpShare value correctly', () => {
      // 0.35 share (e.g. 2 rate-up 6★ on limited banner)
      const p100Split = calculateRateUpProbability(100, 'limited', 0.35)
      const p100Full = calculateRateUpProbability(100, 'limited', 0.7)
      expect(p100Split).toBeLessThan(p100Full)
      expect(p100Split).toBeGreaterThan(0.5)
    })
  })

  describe('getTargetRateUpShare', () => {
    it('returns 0.35 for limited banner with 2 rateUp6 operators (equal_split default)', () => {
      const banner: GachaBanner = {
        id: 'b1',
        type: 'limited',
        title: 'Limited Banner',
        cnStartDate: '2026/06/01',
        cnEndDate: '2026/06/15',
        rateUp6: ['char_1', 'char_2'],
        rateUp5: [],
      }
      expect(getTargetRateUpShare(banner)).toBeCloseTo(0.35, 5)
    })

    it('returns 0.25 for joint_operation banner with 4 rateUp6 operators (1.0 / 4)', () => {
      const banner: GachaBanner = {
        id: 'b2',
        type: 'joint_operation',
        title: 'Joint Operation',
        cnStartDate: '2026/06/26',
        cnEndDate: '2026/07/10',
        rateUp6: ['char_1', 'char_2', 'char_3', 'char_4'],
        rateUp5: [],
      }
      expect(getTargetRateUpShare(banner)).toBeCloseTo(0.25, 5)
    })

    it('returns 0.5 for standard banner with 1 rateUp6 operator', () => {
      const banner: GachaBanner = {
        id: 'b3',
        type: 'standard',
        title: 'Standard Banner',
        cnStartDate: '2026/05/15',
        cnEndDate: '2026/05/29',
        rateUp6: ['char_1'],
        rateUp5: [],
      }
      expect(getTargetRateUpShare(banner)).toBeCloseTo(0.5, 5)
    })

    it('returns null for manual mode without rateUpShare', () => {
      const banner: GachaBanner = {
        id: 'b4',
        type: 'standard',
        title: 'Manual Banner Without Share',
        cnStartDate: '2026/05/15',
        cnEndDate: '2026/05/29',
        rateUp6: ['char_1'],
        rateUp5: [],
        rateUpShareMode: 'manual',
      }
      expect(getTargetRateUpShare(banner)).toBeNull()
    })

    it('returns configured value for manual mode with rateUpShare', () => {
      const banner: GachaBanner = {
        id: 'b5',
        type: 'standard',
        title: 'Manual Banner With Share',
        cnStartDate: '2026/05/15',
        cnEndDate: '2026/05/29',
        rateUp6: ['char_1'],
        rateUp5: [],
        rateUpShareMode: 'manual',
        rateUpShare: 0.42,
      }
      expect(getTargetRateUpShare(banner)).toBeCloseTo(0.42, 5)
    })

    it('returns entire pool share for single mode', () => {
      const bannerDefault: GachaBanner = {
        id: 'b6',
        type: 'standard',
        title: mockI18n('Single Banner Default'),
        cnStartDate: '2026/05/15',
        cnEndDate: '2026/05/29',
        rateUp6: ['char_1', 'char_2'],
        rateUp5: [],
        rateUpShareMode: 'single',
      }
      expect(getTargetRateUpShare(bannerDefault)).toBe(0.5)

      const bannerCustom: GachaBanner = {
        id: 'b7',
        type: 'limited',
        title: mockI18n('Single Banner Custom'),
        cnStartDate: '2026/05/15',
        cnEndDate: '2026/05/29',
        rateUp6: ['char_1'],
        rateUp5: [],
        rateUpShareMode: 'single',
        rateUpShare: 0.6,
      }
      expect(getTargetRateUpShare(bannerCustom)).toBe(0.6)
    })

    it('returns null if rateUp6 is empty in equal_split mode', () => {
      const banner: GachaBanner = {
        id: 'b8',
        type: 'standard',
        title: mockI18n('Empty RateUp Banner'),
        cnStartDate: '2026/05/15',
        cnEndDate: '2026/05/29',
        rateUp6: [],
        rateUp5: [],
      }
      expect(getTargetRateUpShare(banner)).toBeNull()
    })

    it('returns null for null or undefined banner', () => {
      expect(getTargetRateUpShare(null as unknown as GachaBanner)).toBeNull()
      expect(getTargetRateUpShare(undefined as unknown as GachaBanner)).toBeNull()
    })
  })

  describe('formatHumanDate & formatBannerDateRange', () => {
    it('formats ISO dates into human-readable strings without timezone shift', () => {
      expect(formatHumanDate('2026-10-28T10:59:59.000Z')).toBe('Oct 28, 2026')
      expect(formatHumanDate('2026-10-14T13:00:00.000Z')).toBe('Oct 14, 2026')
    })

    it('formats date-only strings without shifting day', () => {
      expect(formatHumanDate('2026/05/15')).toBe('May 15, 2026')
      expect(formatHumanDate('2026-05-29')).toBe('May 29, 2026')
    })

    it('formats Unix timestamps in seconds', () => {
      // 1793185199 is 2026-10-28T10:59:59Z
      expect(formatHumanDate(1793185199)).toBe('Oct 28, 2026')
    })

    it('formats date range string cleanly', () => {
      expect(formatBannerDateRange('2026-10-14T13:00:00.000Z', '2026-10-28T10:59:59.000Z')).toBe(
        'Oct 14, 2026 – Oct 28, 2026',
      )
    })
  })

  describe('isProvenNotOnGlobal', () => {
    it('returns true ONLY for LIMITED banners on CN server without a paired Global banner', () => {
      const provenNextLimited: GachaBanner = {
        id: 'LIMITED_76_0_1',
        server: 'cn',
        ruleType: 'LIMITED',
        type: 'limited',
        title: mockI18n('Where the Ruts and Winds Return', '车辙与风的归所'),
        pairedBannerId: null,
        rateUp6: [],
        rateUp5: [],
      }
      expect(isProvenNotOnGlobal(provenNextLimited)).toBe(true)

      // Paired limited banner (has Global pair)
      const pairedLimited: GachaBanner = {
        id: 'LIMITED_73_0_1',
        server: 'cn',
        ruleType: 'LIMITED',
        type: 'limited',
        title: mockI18n('Promise', '承诺'),
        pairedBannerId: 'LIMITED_EN_42_0_1',
        rateUp6: [],
        rateUp5: [],
      }
      expect(isProvenNotOnGlobal(pairedLimited)).toBe(false)

      // Standard / normal banner with null pairedBannerId (unproven, must not receive badge)
      const normalCnBanner: GachaBanner = {
        id: 'NORM_0_1_1',
        server: 'cn',
        ruleType: 'NORMAL',
        type: 'standard',
        title: mockI18n('Standard Pool'),
        pairedBannerId: null,
        rateUp6: [],
        rateUp5: [],
      }
      expect(isProvenNotOnGlobal(normalCnBanner)).toBe(false)

      // Single rate-up banner
      const singleCnBanner: GachaBanner = {
        id: 'SINGLE_78_0_1',
        server: 'cn',
        ruleType: 'SINGLE',
        type: 'standard',
        title: mockI18n('Single Solo'),
        pairedBannerId: null,
        rateUp6: [],
        rateUp5: [],
      }
      expect(isProvenNotOnGlobal(singleCnBanner)).toBe(false)
    })
  })

  describe('getBannerLifecycleStatus', () => {
    it('accurately resolves active, upcoming, and ended from openTime/endTime', () => {
      const banner: GachaBanner = {
        id: 'b_test',
        type: 'standard',
        title: mockI18n('Test'),
        openTime: 1000,
        endTime: 2000,
        rateUp6: [],
        rateUp5: [],
      }

      expect(getBannerLifecycleStatus(banner, 500)).toBe('upcoming')
      expect(getBannerLifecycleStatus(banner, 1000)).toBe('active')
      expect(getBannerLifecycleStatus(banner, 1500)).toBe('active')
      expect(getBannerLifecycleStatus(banner, 2000)).toBe('active')
      expect(getBannerLifecycleStatus(banner, 2500)).toBe('ended')
    })
  })

  describe('getBannerArtCandidates', () => {
    it('returns pool ID as is for CN banners', () => {
      expect(getBannerArtCandidates('NORM_10_0_1', 'cn')).toEqual(['NORM_10_0_1'])
      expect(getBannerArtCandidates('LIMITED_27_0_3', 'cn')).toEqual(['LIMITED_27_0_3'])
    })

    it('strips _EN suffix/infix for EN banners with raw fallback', () => {
      expect(getBannerArtCandidates('NORM_EN_0_1_1', 'en')).toEqual(['NORM_0_1_1', 'NORM_EN_0_1_1'])
      expect(getBannerArtCandidates('LIMITED_EN_42_0_1', 'en')).toEqual([
        'LIMITED_42_0_1',
        'LIMITED_EN_42_0_1',
      ])
    })

    it('infers server from ID containing _EN when server argument is omitted', () => {
      expect(getBannerArtCandidates('NORM_EN_24_0_2')).toEqual(['NORM_24_0_2', 'NORM_EN_24_0_2'])
    })

    it('handles empty or invalid input gracefully', () => {
      expect(getBannerArtCandidates('')).toEqual([])
      expect(getBannerArtCandidates('   ')).toEqual([])
      // @ts-expect-error test invalid input
      expect(getBannerArtCandidates(null)).toEqual([])
    })
  })

  describe('upcoming CN window and Global estimate', () => {
    function banner(overrides: Partial<GachaBanner> & { id: string }): GachaBanner {
      return {
        id: overrides.id,
        server: 'cn',
        ruleType: 'NORMAL',
        type: 'standard',
        title: mockI18n(overrides.id),
        openTime: 0,
        endTime: 0,
        openIso: '',
        endIso: '',
        isActive: false,
        cnStartDate: '',
        cnEndDate: '',
        hasArt: false,
        rateUp6: [],
        rateUp5: [],
        secondaryRateUp6: [],
        ...overrides,
      }
    }

    function isoDate(openTime: number, lagDays: number): string {
      return new Date(openTime * 1000 + lagDays * 86_400_000).toISOString().slice(0, 10)
    }

    describe('parseBannerDate', () => {
      it('parses date-only and date-time values as UTC', () => {
        expect(parseBannerDate('2026/10/14')).toBe(Date.UTC(2026, 9, 14))
        expect(parseBannerDate('2026-10-14')).toBe(Date.UTC(2026, 9, 14))
        expect(parseBannerDate('2026/10/14 08:00:00')).toBe(Date.UTC(2026, 9, 14, 8, 0, 0))
        expect(parseBannerDate('2026/10/14 08:00')).toBe(Date.UTC(2026, 9, 14, 8, 0, 0))
      })

      it('returns null for empty, malformed and impossible dates', () => {
        expect(parseBannerDate(undefined)).toBeNull()
        expect(parseBannerDate('')).toBeNull()
        expect(parseBannerDate('not-a-date')).toBeNull()
        expect(parseBannerDate('2026/02/30')).toBeNull()
        expect(parseBannerDate('2026/13/01')).toBeNull()
      })
    })

    describe('getUpcomingCutoff', () => {
      it('uses the latest CN start that already has a real Global date', () => {
        const banners = [
          banner({ id: 'old', openTime: 100, globalStartDate: '2026/01/01' }),
          banner({ id: 'cutoff', openTime: 500, globalStartDate: '2026/05/01 08:00:00' }),
          banner({ id: 'pending', openTime: 900 }),
          banner({ id: 'invalid', openTime: 1200, globalStartDate: 'nope' }),
          banner({ id: 'en', server: 'en', openTime: 9999, globalStartDate: '2027/01/01' }),
        ]
        expect(getUpcomingCutoff(banners)).toBe(500)
      })

      it('returns null when no CN banner has a valid Global date', () => {
        expect(getUpcomingCutoff([banner({ id: 'a', openTime: 100 })])).toBeNull()
        expect(getUpcomingCutoff([])).toBeNull()
      })
    })

    describe('getUpcomingBanners', () => {
      const banners = [
        banner({ id: 'cutoff', openTime: 500, globalStartDate: '2026/05/01' }),
        banner({ id: 'too-old', openTime: 100, rateUp6: ['char_a'] }),
        banner({ id: 'no-roster', openTime: 600 }),
        banner({ id: 'standard', openTime: 700, rateUp6: ['char_a'] }),
        banner({ id: 'limited', openTime: 800, type: 'limited', rateUp5: ['char_b'] }),
        banner({
          id: 'already-global',
          openTime: 400,
          globalStartDate: '2026/09/01',
          rateUp6: ['char_c'],
        }),
        banner({
          id: 'invalid-global',
          openTime: 950,
          globalStartDate: 'nope',
          rateUp6: ['char_d'],
        }),
      ]

      it('keeps only unreleased CN banners with a rate-up roster, oldest first', () => {
        expect(getUpcomingBanners(banners).map((item) => item.id)).toEqual([
          'standard',
          'limited',
          'invalid-global',
        ])
      })

      it('returns an empty list without a confirmed cutoff', () => {
        expect(
          getUpcomingBanners([banner({ id: 'a', openTime: 100, rateUp6: ['char_a'] })]),
        ).toEqual([])
      })
    })

    describe('getGlobalLagPairs and getGlobalLagDays', () => {
      const pairs = Array.from({ length: 13 }, (_, index) => {
        const openTime = (index + 1) * 86_400
        const lagDays = index + 1
        return banner({
          id: `pair-${index + 1}`,
          openTime,
          globalStartDate: isoDate(openTime, lagDays),
        })
      })

      it('sorts confirmed pairs by CN start and samples the latest 12', () => {
        const sampled = getGlobalLagPairs([...pairs].reverse())
        expect(sampled).toHaveLength(UPCOMING_LAG_SAMPLE_SIZE)
        expect(sampled[0]?.id).toBe('pair-2')
        expect(sampled.at(-1)?.id).toBe('pair-13')
        expect(sampled.map((pair) => pair.lagDays)).toEqual([
          2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13,
        ])
      })

      it('returns the median lag of the sampled pairs', () => {
        expect(getGlobalLagDays(pairs)).toBeCloseTo(7.5)
        expect(getGlobalLagDays(pairs, 3)).toBe(12)
      })

      it('ignores invalid Global dates and returns null without pairs', () => {
        const invalid = banner({ id: 'bad', openTime: 100, globalStartDate: '2026/02/30' })
        expect(getGlobalLagPairs([invalid])).toEqual([])
        expect(getGlobalLagDays([invalid])).toBeNull()
        expect(getGlobalLagDays([])).toBeNull()
      })
    })

    describe('getEstimatedGlobalDate', () => {
      const openTime = Date.UTC(2026, 4, 15) / 1000

      it('adds the rounded lag to the CN start date', () => {
        expect(getEstimatedGlobalDate(banner({ id: 'b', openTime }), 163)).toBe('2026-10-25')
        expect(getEstimatedGlobalDate(banner({ id: 'b', openTime }), 163.5)).toBe('2026-10-26')
      })

      it('prefers the explicit CN-local start date over the UTC open timestamp', () => {
        // openTime is 2026-05-14T23:00Z, i.e. 2026-05-15 07:00 in CN (UTC+8)
        const cnLateBanner = banner({
          id: 'b',
          openTime: Date.UTC(2026, 4, 14, 23, 0) / 1000,
          cnStartDate: '2026/05/15',
        })
        expect(getEstimatedGlobalDate(cnLateBanner, 163)).toBe('2026-10-25')
      })

      it('falls back to the UTC+8 date derived from openTime', () => {
        const cnLateBanner = banner({ id: 'b', openTime: Date.UTC(2026, 4, 14, 23, 0) / 1000 })
        expect(getEstimatedGlobalDate(cnLateBanner, 163)).toBe('2026-10-25')
      })

      it('returns null without a usable lag or start time', () => {
        expect(getEstimatedGlobalDate(banner({ id: 'b', openTime }), null)).toBeNull()
        expect(getEstimatedGlobalDate(banner({ id: 'b', openTime }), Number.NaN)).toBeNull()
        expect(getEstimatedGlobalDate(banner({ id: 'b', openTime: 0 }), 163)).toBeNull()
      })
    })
  })
})
