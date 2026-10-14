import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import type { GameConstants } from '../../../../shared/schemas/gameConstants'
import type { OperatorDetail } from '../../../../shared/schemas/operator'
import { calculateRoadmap, type OperatorState } from '../../../../shared/utils/planner/roadmap'

function loadConstants(): GameConstants {
  const filePath = path.resolve(process.cwd(), 'data/constants.json')
  return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as GameConstants
}

function loadOperator(id: string): OperatorDetail {
  const filePath = path.resolve(process.cwd(), `data/operators/${id}.json`)
  return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as OperatorDetail
}

describe('roadmap order and cumulative costs (shared/utils/planner/roadmap.ts)', () => {
  const constants = loadConstants()
  const silverAsh = loadOperator('char_172_svrash')

  it('returns empty steps and undefined nextStepId when target equals current', () => {
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
    expect(roadmap.nextStepId).toBeUndefined()
  })

  it('generates chronological sequence of levels, promotions, skills, masteries and modules', () => {
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

    expect(roadmap.totalSteps).toBeGreaterThan(0)
    expect(roadmap.nextStepId).toBe(roadmap.steps[0]!.id)
    expect(roadmap.steps[0]!.isNextStep).toBe(true)

    // All steps after the first must have isNextStep === false
    for (let i = 1; i < roadmap.steps.length; i++) {
      expect(roadmap.steps[i]!.isNextStep).toBe(false)
    }

    // Step order validation:
    // Level E0 -> Skill Rank 1-4 -> Promotion E0->E1 -> Level E1 -> Skill Rank 4-7 -> Promotion E1->E2 -> Level E2 -> Masteries -> Modules
    const stepIds = roadmap.steps.map((s) => s.id)
    const levelE0Index = stepIds.findIndex((id) => id.startsWith('level_e0'))
    const promoE1Index = stepIds.findIndex((id) => id.startsWith('promotion_e0_to_e1'))
    const promoE2Index = stepIds.findIndex((id) => id.startsWith('promotion_e1_to_e2'))
    const levelE2Index = stepIds.findIndex((id) => id.startsWith('level_e2'))
    const masteryIndex = stepIds.findIndex((id) => id.startsWith('mastery_skchr_svrash_3'))
    const moduleIndex = stepIds.findIndex((id) => id.startsWith('module_uniequip_002_svrash'))

    expect(levelE0Index).toBeLessThan(promoE1Index)
    expect(promoE1Index).toBeLessThan(promoE2Index)
    expect(promoE2Index).toBeLessThan(levelE2Index)
    expect(levelE2Index).toBeLessThan(masteryIndex)
    expect(masteryIndex).toBeLessThan(moduleIndex)
  })

  it('calculates cumulative costs correctly across sequential steps', () => {
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
      modules: {},
    }

    const roadmap = calculateRoadmap(silverAsh, current, target, constants)

    let previousCumLmd = 0
    let previousCumExp = 0

    roadmap.steps.forEach((step) => {
      // Step cumulative costs must equal previous cumulative + step cost
      expect(step.cumulativeCosts.lmd).toBe(previousCumLmd + step.costs.lmd)
      expect(step.cumulativeCosts.exp).toBe(previousCumExp + step.costs.exp)

      previousCumLmd = step.cumulativeCosts.lmd
      previousCumExp = step.cumulativeCosts.exp
    })

    // The final step cumulative cost must equal the total sum
    const totalStepLmd = roadmap.steps.reduce((sum, s) => sum + s.costs.lmd, 0)
    const totalStepExp = roadmap.steps.reduce((sum, s) => sum + s.costs.exp, 0)
    const lastStep = roadmap.steps[roadmap.steps.length - 1]!

    expect(lastStep.cumulativeCosts.lmd).toBe(totalStepLmd)
    expect(lastStep.cumulativeCosts.exp).toBe(totalStepExp)
  })
})
