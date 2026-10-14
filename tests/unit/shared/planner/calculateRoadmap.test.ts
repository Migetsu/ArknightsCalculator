import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import type { GameConstants } from '../../../../shared/schemas/gameConstants'
import type { OperatorDetail } from '../../../../shared/schemas/operator'
import { calculateRoadmap, type OperatorState } from '../../../../shared/utils/planner'

function loadConstants(): GameConstants {
  const filePath = path.resolve(process.cwd(), 'data/constants.json')
  return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as GameConstants
}

function loadOperator(id: string): OperatorDetail {
  const filePath = path.resolve(process.cwd(), `data/operators/${id}.json`)
  return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as OperatorDetail
}

describe('calculateRoadmap (shared/utils/planner/calculateRoadmap)', () => {
  const constants = loadConstants()
  const silverAsh = loadOperator('char_172_svrash')

  it('returns empty steps when target state equals current state', () => {
    const current: OperatorState = {
      elite: 2,
      level: 90,
      skillLevel: 7,
      skills: { skchr_svrash_3: 3 },
      modules: { uniequip_002_svrash: 3 },
    }
    const roadmap = calculateRoadmap(silverAsh, current, current, constants)
    expect(roadmap.totalSteps).toBe(0)
    expect(roadmap.steps).toEqual([])
  })

  it('generates chronological milestone steps from E0 Lv1 to E2 Lv90 with M3 and Module Stage 3', () => {
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
      skillLevel: 7,
      skills: { skchr_svrash_3: 3 },
      modules: { uniequip_002_svrash: 3 },
    }

    const roadmap = calculateRoadmap(silverAsh, current, target, constants)

    expect(roadmap.operatorId).toBe('char_172_svrash')
    expect(roadmap.totalSteps).toBeGreaterThan(0)

    const kinds = roadmap.steps.map((s) => s.kind)
    expect(kinds).toContain('level')
    expect(kinds).toContain('promotion')
    expect(kinds).toContain('skill_rank')
    expect(kinds).toContain('skill_mastery')
    expect(kinds).toContain('module_stage')

    // First step should be leveling E0
    const step0 = roadmap.steps[0]!
    expect(step0.kind).toBe('level')
    expect(step0.phase).toBe(0)
    expect(step0.levelRange).toEqual({ from: 1, to: 50 })
    expect(step0.costs.exp).toBeGreaterThan(0)
    expect(step0.costs.lmd).toBeGreaterThan(0)
    expect(step0.resultingState.level).toBe(50)

    // Promotion E0 -> E1
    const promoE0 = roadmap.steps.find((s) => s.id === 'promotion_e0_to_e1')
    expect(promoE0).toBeDefined()
    expect(promoE0?.costs.lmd).toBe(30000) // 6* E0->E1 LMD cost
    expect(promoE0?.costs.items.length).toBeGreaterThan(0)

    // Masteries for S3 (M1, M2, M3)
    const m1 = roadmap.steps.find((s) => s.id === 'mastery_skchr_svrash_3_m1')
    const m2 = roadmap.steps.find((s) => s.id === 'mastery_skchr_svrash_3_m2')
    const m3 = roadmap.steps.find((s) => s.id === 'mastery_skchr_svrash_3_m3')
    expect(m1).toBeDefined()
    expect(m2).toBeDefined()
    expect(m3).toBeDefined()
    expect(m1?.masteryLevel).toBe(1)
    expect(m1?.costs.items).toEqual(
      expect.arrayContaining([
        { id: '3303', count: 6 },
        { id: '30064', count: 3 },
        { id: '30043', count: 4 },
      ]),
    )

    // Modules for uniequip_002_svrash (Stage 1, 2, 3)
    const mod1 = roadmap.steps.find((s) => s.id === 'module_uniequip_002_svrash_stage1')
    const mod2 = roadmap.steps.find((s) => s.id === 'module_uniequip_002_svrash_stage2')
    const mod3 = roadmap.steps.find((s) => s.id === 'module_uniequip_002_svrash_stage3')
    expect(mod1).toBeDefined()
    expect(mod2).toBeDefined()
    expect(mod3).toBeDefined()
    expect(mod1?.costs.items.length).toBeGreaterThan(0)
  })

  it('evaluates readiness accurately based on depot snapshot', () => {
    const current: OperatorState = {
      elite: 1,
      level: 80,
      skillLevel: 7,
      skills: {},
      modules: {},
    }
    const target: OperatorState = {
      elite: 2,
      level: 1,
      skillLevel: 7,
      skills: {},
      modules: {},
    }

    // SilverAsh E1 -> E2 costs:
    // LMD: 180,000, 4x 3223 (Guard Dualchip), 4x 30135 (D32 Steel), 6x 30074 (White Horse Kohl)

    // Case A: Depot has nothing
    const emptyDepot = { items: {}, lmd: 0 }
    const roadmapEmpty = calculateRoadmap(silverAsh, current, target, constants, emptyDepot)
    expect(roadmapEmpty.totalSteps).toBe(1)
    const stepPromo = roadmapEmpty.steps[0]!
    expect(stepPromo.readiness.isReady).toBe(false)
    expect(stepPromo.readiness.missingLmd).toBe(180000)
    expect(stepPromo.readiness.missingItems.length).toBe(3)
    expect(stepPromo.readiness.completionPercent).toBe(0)

    // Case B: Depot has full requirements
    const fullDepot = {
      items: {
        '3223': 10,
        '30135': 5,
        '30074': 8,
      },
      lmd: 200000,
    }
    const roadmapFull = calculateRoadmap(silverAsh, current, target, constants, fullDepot)
    const stepFull = roadmapFull.steps[0]!
    expect(stepFull.readiness.isReady).toBe(true)
    expect(stepFull.readiness.missingLmd).toBe(0)
    expect(stepFull.readiness.missingItems.length).toBe(0)
    expect(stepFull.readiness.completionPercent).toBe(100)
    expect(roadmapFull.readyStepsCount).toBe(1)
  })
})
