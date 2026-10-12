import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import type { GameConstants } from '../../../../shared/schemas/gameConstants'
import type { OperatorDetail } from '../../../../shared/schemas/operator'
import {
  calculateCost,
  planExpCards,
  sumCosts,
  type OperatorState,
} from '../../../../shared/utils/planner'

function loadConstants(): GameConstants {
  const filePath = path.resolve(process.cwd(), 'data/constants.json')
  return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as GameConstants
}

function loadOperator(id: string): OperatorDetail {
  const filePath = path.resolve(process.cwd(), `data/operators/${id}.json`)
  return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as OperatorDetail
}

describe('Planner Core (shared/utils/planner)', () => {
  const constants = loadConstants()
  const silverAsh = loadOperator('char_172_svrash') // 6*
  const texas = loadOperator('char_102_texas') // 5*
  const myrtle = loadOperator('char_151_myrtle') // 4*
  const fang = loadOperator('char_123_fang') // 3*
  const lancet2 = loadOperator('char_285_medic2') // 1*

  describe('Validation & Error Handling', () => {
    it('throws when current or target elite exceeds operator maximum phase', () => {
      // Fang max elite is 1
      expect(() =>
        calculateCost(
          fang,
          { elite: 2, level: 1, skillLevel: 1, skills: {}, modules: {} },
          { elite: 1, level: 55, skillLevel: 1, skills: {}, modules: {} },
          constants,
        ),
      ).toThrow(/Invalid current elite phase 2 for operator char_123_fang \(max phase: 1\)/)

      expect(() =>
        calculateCost(
          lancet2,
          { elite: 0, level: 1, skillLevel: 1, skills: {}, modules: {} },
          { elite: 1, level: 1, skillLevel: 1, skills: {}, modules: {} },
          constants,
        ),
      ).toThrow(/Invalid target elite phase 1 for operator char_285_medic2 \(max phase: 0\)/)
    })

    it('throws when level exceeds phase maxLevel', () => {
      // SilverAsh E0 maxLevel is 50
      expect(() =>
        calculateCost(
          silverAsh,
          { elite: 0, level: 51, skillLevel: 1, skills: {}, modules: {} },
          { elite: 2, level: 90, skillLevel: 1, skills: {}, modules: {} },
          constants,
        ),
      ).toThrow(
        /Invalid current level 51 for operator char_172_svrash at elite 0 \(must be between 1 and 50\)/,
      )

      expect(() =>
        calculateCost(
          silverAsh,
          { elite: 0, level: 1, skillLevel: 1, skills: {}, modules: {} },
          { elite: 2, level: 91, skillLevel: 1, skills: {}, modules: {} },
          constants,
        ),
      ).toThrow(
        /Invalid target level 91 for operator char_172_svrash at elite 2 \(must be between 1 and 90\)/,
      )
    })

    it('throws when skillLevel is out of range 1..7', () => {
      expect(() =>
        calculateCost(
          silverAsh,
          { elite: 0, level: 1, skillLevel: 0, skills: {}, modules: {} },
          { elite: 0, level: 1, skillLevel: 7, skills: {}, modules: {} },
          constants,
        ),
      ).toThrow(/Invalid current skill level 0 for operator char_172_svrash/)

      expect(() =>
        calculateCost(
          silverAsh,
          { elite: 0, level: 1, skillLevel: 1, skills: {}, modules: {} },
          { elite: 0, level: 1, skillLevel: 8, skills: {}, modules: {} },
          constants,
        ),
      ).toThrow(/Invalid target skill level 8 for operator char_172_svrash/)
    })
  })

  describe('Zero Cost & Invariant Operations', () => {
    it('returns 0 EXP, 0 LMD and empty items when current equals target', () => {
      const state: OperatorState = {
        elite: 2,
        level: 60,
        skillLevel: 7,
        skills: { skchr_svrash_3: 3 },
        modules: { uniequip_002_svrash: 3 },
      }
      const cost = calculateCost(silverAsh, state, state, constants)
      expect(cost.exp).toBe(0)
      expect(cost.lmd).toBe(0)
      expect(cost.items).toEqual([])
    })

    it('returns 0 when target is strictly lower than current (no reverse leveling)', () => {
      const current: OperatorState = {
        elite: 2,
        level: 80,
        skillLevel: 7,
        skills: {},
        modules: {},
      }
      const target: OperatorState = {
        elite: 1,
        level: 40,
        skillLevel: 4,
        skills: {},
        modules: {},
      }
      const cost = calculateCost(silverAsh, current, target, constants)
      expect(cost.exp).toBe(0)
      expect(cost.lmd).toBe(0)
      expect(cost.items).toEqual([])
    })
  })

  describe('Exact Benchmark Calculations (Verified Arithmetically)', () => {
    it('calculates 6* SilverAsh E0 L1 -> E0 L50 leveling cost', () => {
      const current: OperatorState = {
        elite: 0,
        level: 1,
        skillLevel: 1,
        skills: {},
        modules: {},
      }
      const target: OperatorState = {
        elite: 0,
        level: 50,
        skillLevel: 1,
        skills: {},
        modules: {},
      }
      const cost = calculateCost(silverAsh, current, target, constants)

      // Verified mathematically from characterExpMap and characterUpgradeCostMap:
      // E0 Lv1->Lv50 requires 24,400 EXP and 26,719 LMD
      expect(cost.exp).toBe(24400)
      expect(cost.lmd).toBe(26719)
      expect(cost.breakdown.lmd.levelUp).toBe(26719)
      expect(cost.breakdown.lmd.evolve).toBe(0)
      expect(cost.items).toEqual([])
    })

    it('calculates 6* SilverAsh full E0 L1 -> E2 L90 progression and evolution cost', () => {
      const current: OperatorState = {
        elite: 0,
        level: 1,
        skillLevel: 1,
        skills: {},
        modules: {},
      }
      const target: OperatorState = {
        elite: 2,
        level: 90,
        skillLevel: 1,
        skills: {},
        modules: {},
      }
      const cost = calculateCost(silverAsh, current, target, constants)

      // Expected EXP sum across phases:
      // E0 L1->L50: 24,400
      // E1 L1->L80: 337,000
      // E2 L1->L90: 750,000
      // Total EXP = 1,111,400
      expect(cost.exp).toBe(1111400)

      // Expected Level-up LMD:
      // E0: 26,719
      // E1: 353,122
      // E2: 744,955
      // Level-up LMD sum = 1,124,796
      expect(cost.breakdown.lmd.levelUp).toBe(1124796)

      // Evolution LMD (6*):
      // E1 promote: 30,000
      // E2 promote: 180,000
      // Evolve LMD sum = 210,000
      expect(cost.breakdown.lmd.evolve).toBe(210000)

      // Total LMD = 1,124,796 + 210,000 = 1,334,796
      expect(cost.lmd).toBe(1334796)

      // Promotion items check (E1 + E2 evolve costs)
      expect(cost.breakdown.items.elite).toEqual(
        expect.arrayContaining([
          { id: '3221', count: 5 }, // Guard Chip
          { id: '30032', count: 8 }, // Sugar
          { id: '30062', count: 3 }, // Ketone
          { id: '3223', count: 4 }, // Guard Dualchip
          { id: '30135', count: 4 }, // D32 Steel
          { id: '30074', count: 6 }, // White Horse Kohl
        ]),
      )
    })

    it('calculates skill ranks 1 -> 7 common upgrade costs', () => {
      const current: OperatorState = {
        elite: 0,
        level: 1,
        skillLevel: 1,
        skills: {},
        modules: {},
      }
      const target: OperatorState = {
        elite: 0,
        level: 1,
        skillLevel: 7,
        skills: {},
        modules: {},
      }
      const cost = calculateCost(silverAsh, current, target, constants)
      expect(cost.exp).toBe(0)
      expect(cost.lmd).toBe(0) // Skill 1-7 in Arknights uses skill books and mats, 0 LMD
      expect(cost.breakdown.items.skills.length).toBeGreaterThan(0)
      // Rank 1->2 requires Skill Summary 1 x5 (id: 3301)
      const skillBooks1 = cost.breakdown.items.skills.find((i) => i.id === '3301')
      expect(skillBooks1).toBeDefined()
    })

    it('calculates SilverAsh S3 Truesilver Slash Masteries M0 -> M3', () => {
      const current: OperatorState = {
        elite: 2,
        level: 1,
        skillLevel: 7,
        skills: { skchr_svrash_3: 0 },
        modules: {},
      }
      const target: OperatorState = {
        elite: 2,
        level: 1,
        skillLevel: 7,
        skills: { skchr_svrash_3: 3 },
        modules: {},
      }
      const cost = calculateCost(silverAsh, current, target, constants)
      expect(cost.exp).toBe(0)
      expect(cost.lmd).toBe(0)
      // S3 M1 + M2 + M3 items include Skill Summary 3 (id: 3303), D32 Steel (id: 30135), White Horse Kohl (id: 30074)
      const skillBooks3 = cost.breakdown.items.masteries.find((i) => i.id === '3303')
      expect(skillBooks3).toBeDefined()
      // M1 (6) + M2 (12) + M3 (15) = 33 Skill Summary 3
      expect(skillBooks3?.count).toBe(33)
    })

    it('calculates module upgrade Stage 0 -> Stage 3 including LMD cost', () => {
      const current: OperatorState = {
        elite: 2,
        level: 60,
        skillLevel: 7,
        skills: {},
        modules: { uniequip_002_svrash: 0 },
      }
      const target: OperatorState = {
        elite: 2,
        level: 60,
        skillLevel: 7,
        skills: {},
        modules: { uniequip_002_svrash: 3 },
      }
      const cost = calculateCost(silverAsh, current, target, constants)
      // SilverAsh Mod LOR-X:
      // Stage 1: 80,000 LMD, Stage 2: 100,000 LMD, Stage 3: 120,000 LMD -> Total Module LMD = 300,000
      expect(cost.breakdown.lmd.modules).toBe(300000)
      expect(cost.lmd).toBe(300000)
      // Module unlock tokens (id: mod_unlock_token): Stage 1 (4) + Stage 2 (4) + Stage 3 (4) = 12
      const modTokens = cost.breakdown.items.modules.find((i) => i.id === 'mod_unlock_token')
      expect(modTokens?.count).toBe(12)
    })
  })

  describe('Mathematical Properties: Monotonicity & Additivity', () => {
    it('satisfies monotonicity: intermediate target cost is strictly <= full target cost', () => {
      const current: OperatorState = {
        elite: 0,
        level: 1,
        skillLevel: 1,
        skills: {},
        modules: {},
      }
      const intermediate: OperatorState = {
        elite: 1,
        level: 50,
        skillLevel: 4,
        skills: {},
        modules: {},
      }
      const full: OperatorState = {
        elite: 2,
        level: 80,
        skillLevel: 7,
        skills: {},
        modules: {},
      }

      const costInter = calculateCost(texas, current, intermediate, constants)
      const costFull = calculateCost(texas, current, full, constants)

      expect(costInter.exp).toBeLessThan(costFull.exp)
      expect(costInter.lmd).toBeLessThan(costFull.lmd)
    })

    it('satisfies additivity: cost(A -> B) + cost(B -> C) == cost(A -> C)', () => {
      const stateA: OperatorState = {
        elite: 0,
        level: 1,
        skillLevel: 1,
        skills: {},
        modules: {},
      }
      const stateB: OperatorState = {
        elite: 1,
        level: 40,
        skillLevel: 5,
        skills: {},
        modules: {},
      }
      const stateC: OperatorState = {
        elite: 2,
        level: 70,
        skillLevel: 7,
        skills: {},
        modules: {},
      }

      const costAB = calculateCost(myrtle, stateA, stateB, constants)
      const costBC = calculateCost(myrtle, stateB, stateC, constants)
      const costAC = calculateCost(myrtle, stateA, stateC, constants)

      expect(costAB.exp + costBC.exp).toBe(costAC.exp)
      expect(costAB.lmd + costBC.lmd).toBe(costAC.lmd)
    })
  })

  describe('sumCosts Aggregator', () => {
    it('correctly aggregates multiple operator plans into combined totals', () => {
      const cost1 = calculateCost(
        silverAsh,
        { elite: 0, level: 1, skillLevel: 1, skills: {}, modules: {} },
        { elite: 1, level: 1, skillLevel: 1, skills: {}, modules: {} },
        constants,
      )
      const cost2 = calculateCost(
        myrtle,
        { elite: 0, level: 1, skillLevel: 1, skills: {}, modules: {} },
        { elite: 1, level: 1, skillLevel: 1, skills: {}, modules: {} },
        constants,
      )

      const combined = sumCosts([cost1, cost2])
      expect(combined.exp).toBe(cost1.exp + cost2.exp)
      expect(combined.lmd).toBe(cost1.lmd + cost2.lmd)
      expect(combined.breakdown.lmd.evolve).toBe(
        cost1.breakdown.lmd.evolve + cost2.breakdown.lmd.evolve,
      )
    })
  })

  describe('planExpCards Conversion', () => {
    it('returns empty plan for 0 required EXP', () => {
      const plan = planExpCards(0, constants.expItems)
      expect(plan.totalExp).toBe(0)
      expect(plan.wasteExp).toBe(0)
      expect(plan.cards).toEqual({})
    })

    it('plans exact or minimal cards for given EXP amounts', () => {
      // 2000 EXP = exactly one Strategic Battle Record (id: 2004)
      const plan2000 = planExpCards(2000, constants.expItems)
      expect(plan2000.cards['2004']).toBe(1)
      expect(plan2000.totalExp).toBe(2000)
      expect(plan2000.wasteExp).toBe(0)

      // 3600 EXP = one 2000, one 1000, one 400, one 200
      const plan3600 = planExpCards(3600, constants.expItems)
      expect(plan3600.cards['2004']).toBe(1)
      expect(plan3600.cards['2003']).toBe(1)
      expect(plan3600.cards['2002']).toBe(1)
      expect(plan3600.cards['2001']).toBe(1)
      expect(plan3600.totalExp).toBe(3600)
      expect(plan3600.wasteExp).toBe(0)

      // 550 EXP = rounds up to 600 (one 400 + one 200) -> 50 waste
      const plan550 = planExpCards(550, constants.expItems)
      expect(plan550.totalExp).toBe(600)
      expect(plan550.wasteExp).toBe(50)
    })
  })
})
