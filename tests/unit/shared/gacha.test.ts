import { describe, it, expect } from 'vitest'
import {
  calculateEstimatedGlobalDate,
  calculateDaysRemaining,
  getBannerStatus,
  calculateTotalPulls,
  calculateSparkProgress,
  calculateRateUpProbability,
  getProbabilityMilestones,
  getTargetRateUpShare,
} from '../../../shared/utils/gacha'
import type { GachaBanner } from '../../../shared/schemas/banner'

describe('Gacha Utility Engine', () => {
  describe('calculateEstimatedGlobalDate', () => {
    it('accurately projects CN dates to Global dates with 175 days formula', () => {
      expect(calculateEstimatedGlobalDate('2026/05/15')).toBe('2026/11/06')
      expect(calculateEstimatedGlobalDate('2026/05/29')).toBe('2026/11/20')
      expect(calculateEstimatedGlobalDate('2026/06/01')).toBe('2026/11/23')
      expect(calculateEstimatedGlobalDate('2026/06/15')).toBe('2026/12/07')
      expect(calculateEstimatedGlobalDate('2026/06/26')).toBe('2026/12/18')
      expect(calculateEstimatedGlobalDate('2026/07/10')).toBe('2027/01/01')
    })

    it('handles dash-separated dates as well', () => {
      expect(calculateEstimatedGlobalDate('2026-05-15')).toBe('2026/11/06')
    })
  })

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
        title: 'Single Banner Default',
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
        title: 'Single Banner Custom',
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
        title: 'Empty RateUp Banner',
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
})
