import { describe, expect, it } from 'vitest'
import {
  getOperatorPromotionCosts,
  getBaseSkillUpgradeSummary,
} from '../../../shared/utils/upgradeCosts'
import constantsData from '../../../data/constants.json'
import svrashData from '../../../data/operators/char_172_svrash.json'
import amiyaData from '../../../data/operators/char_002_amiya.json'
import fangData from '../../../data/operators/char_123_fang.json'
import noircData from '../../../data/operators/char_500_noirc.json'
import lancetData from '../../../data/operators/char_285_medic2.json'
import type { OperatorDetail } from '../../../shared/schemas/operator'

describe('upgradeCosts utility', () => {
  describe('guard: constants.json evolveGoldCost reactivity', () => {
    it('strictly derives LMD evolve cost from provided evolveGoldCost map and reflects changes without hardcoding', () => {
      // 1. Derives from official constantsData.evolveGoldCost
      const officialCosts = getOperatorPromotionCosts(
        svrashData as unknown as OperatorDetail,
        constantsData.evolveGoldCost,
      )
      expect(officialCosts[0]?.lmd).toBe(constantsData.evolveGoldCost['6']?.[0])
      expect(officialCosts[1]?.lmd).toBe(constantsData.evolveGoldCost['6']?.[1])

      // 2. Guard: if constants change, getOperatorPromotionCosts follows the map rather than silent defaults
      const customMap = {
        ...constantsData.evolveGoldCost,
        '6': [99999, 88888],
      }
      const customCosts = getOperatorPromotionCosts(
        svrashData as unknown as OperatorDetail,
        customMap,
      )
      expect(customCosts[0]?.lmd).toBe(99999)
      expect(customCosts[1]?.lmd).toBe(88888)
    })
  })

  describe('getOperatorPromotionCosts', () => {
    it('calculates E1 and E2 costs correctly for 6★ operator (SilverAsh)', () => {
      const costs = getOperatorPromotionCosts(
        svrashData as unknown as OperatorDetail,
        constantsData.evolveGoldCost,
      )
      expect(costs).toHaveLength(2)

      const e1 = costs[0]!
      expect(e1.phase).toBe(1)
      expect(e1.lmd).toBe(30000)
      expect(e1.materials).toEqual([
        { id: '3221', count: 5 },
        { id: '30032', count: 8 },
        { id: '30062', count: 3 },
      ])

      const e2 = costs[1]!
      expect(e2.phase).toBe(2)
      expect(e2.lmd).toBe(180000)
      expect(e2.materials).toEqual([
        { id: '3223', count: 4 },
        { id: '30135', count: 4 },
        { id: '30074', count: 6 },
      ])
    })

    it('calculates E1 and E2 costs correctly for 5★ operator (Amiya)', () => {
      const costs = getOperatorPromotionCosts(
        amiyaData as unknown as OperatorDetail,
        constantsData.evolveGoldCost,
      )
      expect(costs).toHaveLength(2)

      const e1 = costs[0]!
      expect(e1.phase).toBe(1)
      expect(e1.lmd).toBe(20000)
      expect(e1.materials).toEqual([
        { id: '3251', count: 3 },
        { id: '30062', count: 4 },
        { id: '30042', count: 4 },
      ])

      const e2 = costs[1]!
      expect(e2.phase).toBe(2)
      expect(e2.lmd).toBe(120000)
      expect(e2.materials).toEqual([
        { id: '3253', count: 3 },
        { id: '30014', count: 10 },
        { id: '30073', count: 10 },
      ])
    })

    it('calculates E1 with 0 materials and 10,000 LMD, with E2 absent for 3★ operator (Fang)', () => {
      const costs = getOperatorPromotionCosts(
        fangData as unknown as OperatorDetail,
        constantsData.evolveGoldCost,
      )
      expect(costs).toHaveLength(1)

      const e1 = costs[0]!
      expect(e1.phase).toBe(1)
      expect(e1.lmd).toBe(10000)
      expect(e1.materials).toEqual([])

      // E2 MUST NOT exist for 3-star operators
      const e2 = costs.find((c) => c.phase === 2)
      expect(e2).toBeUndefined()
    })

    it('returns empty array for 2★ and 1★ operators with no promotions', () => {
      const noircCosts = getOperatorPromotionCosts(
        noircData as unknown as OperatorDetail,
        constantsData.evolveGoldCost,
      )
      expect(noircCosts).toEqual([])

      const lancetCosts = getOperatorPromotionCosts(
        lancetData as unknown as OperatorDetail,
        constantsData.evolveGoldCost,
      )
      expect(lancetCosts).toEqual([])
    })
  })

  describe('getBaseSkillUpgradeSummary', () => {
    it('returns 6 level upgrade steps and aggregates total materials for SilverAsh', () => {
      const summary = getBaseSkillUpgradeSummary(
        (svrashData as unknown as OperatorDetail).allSkillLvlup,
      )
      expect(summary.steps).toHaveLength(6)

      // Step 1: Lv 1 -> 2
      expect(summary.steps[0]).toEqual({
        fromLevel: 1,
        toLevel: 2,
        unlockCond: { phase: 0, level: 1 },
        materials: [{ id: '3301', count: 5 }],
      })

      // Step 4: Lv 4 -> 5 requires Phase 1
      expect(summary.steps[3]).toEqual({
        fromLevel: 4,
        toLevel: 5,
        unlockCond: { phase: 1, level: 1 },
        materials: [
          { id: '3302', count: 8 },
          { id: '30052', count: 4 },
          { id: '30012', count: 5 },
        ],
      })

      // Step 6: Lv 6 -> 7
      expect(summary.steps[5]).toEqual({
        fromLevel: 6,
        toLevel: 7,
        unlockCond: { phase: 1, level: 1 },
        materials: [
          { id: '3303', count: 8 },
          { id: '30033', count: 4 },
          { id: '30083', count: 5 },
        ],
      })

      // Total materials aggregated
      expect(summary.totalMaterials.length).toBeGreaterThan(0)
      const skill1Books = summary.totalMaterials.find((m) => m.id === '3301')
      expect(skill1Books?.count).toBe(10) // 5 + 5
      const skill2Books = summary.totalMaterials.find((m) => m.id === '3302')
      expect(skill2Books?.count).toBe(24) // 8 + 8 + 8
      const skill3Books = summary.totalMaterials.find((m) => m.id === '3303')
      expect(skill3Books?.count).toBe(8)
    })

    it('returns empty steps and totalMaterials when allSkillLvlup is undefined or empty', () => {
      const empty1 = getBaseSkillUpgradeSummary(undefined)
      expect(empty1.steps).toEqual([])
      expect(empty1.totalMaterials).toEqual([])

      const empty2 = getBaseSkillUpgradeSummary([])
      expect(empty2.steps).toEqual([])
      expect(empty2.totalMaterials).toEqual([])
    })
  })
})
