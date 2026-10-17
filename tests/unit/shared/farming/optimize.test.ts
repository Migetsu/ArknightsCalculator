import { describe, it, expect } from 'vitest'
import { optimizeFarming } from '../../../../shared/utils/farming/optimize'
import { calculateCost } from '../../../../shared/utils/planner/calculateCost'
import { resolveDemand } from '../../../../shared/utils/workshop/resolveDemand'
import type { PenguinMatrixSnapshot, PenguinStageMatrix } from '../../../../shared/schemas/farming'
import type { Stage } from '../../../../shared/schemas/stage'
import type { OperatorDetail } from '../../../../shared/schemas/operator'
import type { GameConstants } from '../../../../shared/schemas/gameConstants'
import type { CraftRecipe } from '../../../../shared/schemas/recipe'
import kaltsitRaw from '../../../../data/operators/char_003_kalts.json'
import constantsRaw from '../../../../data/constants.json'
import recipesRaw from '../../../../data/recipes.json'
import cnMatrixRaw from '../../../../data/penguin/cn.json'
import usMatrixRaw from '../../../../data/penguin/us.json'
import stagesRaw from '../../../../data/stages.json'

const kaltsitOp = kaltsitRaw as unknown as OperatorDetail
const gameConstants = constantsRaw as unknown as GameConstants
const gameRecipes = recipesRaw as unknown as CraftRecipe[]
const cnSnapshot = cnMatrixRaw as unknown as PenguinMatrixSnapshot
const usSnapshot = usMatrixRaw as unknown as PenguinMatrixSnapshot
const realStagesMap = stagesRaw as unknown as Record<string, Stage>

describe('Farming Optimization Core (shared/utils/farming/optimize)', () => {
  const dummyMatrix: Record<string, PenguinStageMatrix> = {
    'stage_1-7': {
      stageId: 'stage_1-7',
      code: '1-7',
      apCost: 6,
      drops: [
        { itemId: '30012', quantity: 600, times: 500, dropRate: 1.2 }, // Rock T2
        { itemId: '30011', quantity: 200, times: 500, dropRate: 0.4 }, // Rock T1 byproduct
      ],
    },
    'stage_4-6': {
      stageId: 'stage_4-6',
      code: '4-6',
      apCost: 21,
      drops: [
        { itemId: '30063', quantity: 180, times: 500, dropRate: 0.36 }, // Aketon T3
        { itemId: '30062', quantity: 250, times: 500, dropRate: 0.5 }, // Aketon T2 byproduct
      ],
    },
    'stage_s3-2': {
      stageId: 'stage_s3-2',
      code: 'S3-2',
      apCost: 15,
      drops: [
        { itemId: '30023', quantity: 200, times: 500, dropRate: 0.4 }, // Sugar T3
      ],
    },
    stage_alt_sugar: {
      stageId: 'stage_alt_sugar',
      code: 'ALT-1',
      apCost: 18,
      drops: [
        { itemId: '30023', quantity: 100, times: 500, dropRate: 0.2 }, // Lower efficiency Sugar
      ],
    },
  }

  const dummyStagesMap: Record<string, Stage> = {
    'stage_1-7': {
      stageId: 'stage_1-7',
      code: '1-7',
      name: { en: '1-7', zh: '1-7', source: 'official', isMachineTranslation: false },
      stageType: 'MAIN',
      apCost: 6,
      matchedGameData: true,
      servers: ['global', 'cn'],
    },
    'stage_4-6': {
      stageId: 'stage_4-6',
      code: '4-6',
      name: { en: '4-6', zh: '4-6', source: 'official', isMachineTranslation: false },
      stageType: 'MAIN',
      apCost: 21,
      matchedGameData: true,
      servers: ['global', 'cn'],
    },
    'stage_s3-2': {
      stageId: 'stage_s3-2',
      code: 'S3-2',
      name: { en: 'S3-2', zh: 'S3-2', source: 'official', isMachineTranslation: false },
      stageType: 'MAIN',
      apCost: 15,
      matchedGameData: true,
      servers: ['global', 'cn'],
    },
    stage_alt_sugar: {
      stageId: 'stage_alt_sugar',
      code: 'ALT-1',
      name: { en: 'ALT-1', zh: 'ALT-1', source: 'official', isMachineTranslation: false },
      stageType: 'MAIN',
      apCost: 18,
      matchedGameData: true,
      servers: ['cn'], // CN only
    },
  }

  it('returns empty result when deficit is empty or all items 0', () => {
    const res = optimizeFarming({}, dummyMatrix)
    expect(res.stages).toHaveLength(0)
    expect(res.totalRuns).toBe(0)
    expect(res.totalSanity).toBe(0)
    expect(res.naturalRegenDays).toBe(0)
    expect(res.originitePrimeCost).toBe(0)
  })

  it('picks the most sanity-efficient stage for a target item (manual calculation fixture)', () => {
    // 30023 (Sugar T3) can be farmed at stage_s3-2 (eff = 0.4 / 15 = 0.0267) or stage_alt_sugar (eff = 0.2 / 18 = 0.011)
    const deficit = { '30023': 4 }
    const res = optimizeFarming(deficit, dummyMatrix, {
      server: 'global',
      stagesMap: dummyStagesMap,
    })

    expect(res.stages).toHaveLength(1)
    expect(res.stages[0]?.stageId).toBe('stage_s3-2')
    // 4 needed / 0.4 dropRate = 10 runs
    expect(res.stages[0]?.runs).toBe(10)
    expect(res.stages[0]?.sanity).toBe(150) // 10 * 15
    expect(res.totalSanity).toBe(150)
  })

  it('deducts byproducts when farming primary items', () => {
    // Need 12 Rock T2 ('30012') and 4 Rock T1 ('30011')
    // Stage 1-7 drops 1.2 T2 and 0.4 T1 per run.
    // 12 T2 / 1.2 = 10 runs of 1-7.
    // In 10 runs, expected T1 byproduct is 10 * 0.4 = 4.0, which completely satisfies T1 need!
    const deficit = {
      '30012': 12,
      '30011': 4,
    }

    const res = optimizeFarming(deficit, dummyMatrix, { stagesMap: dummyStagesMap })
    expect(res.stages).toHaveLength(1)
    expect(res.stages[0]?.stageId).toBe('stage_1-7')
    expect(res.stages[0]?.runs).toBe(10)
    expect(res.stages[0]?.sanity).toBe(60) // 10 * 6
    expect(res.uncoveredItems).toHaveLength(0)
  })

  it('filters out stages from different servers', () => {
    // stage_alt_sugar is CN only
    const deficit = { '30023': 2 }
    const globalRes = optimizeFarming(deficit, dummyMatrix, {
      server: 'global',
      stagesMap: dummyStagesMap,
    })
    expect(globalRes.stages.map((s) => s.stageId)).not.toContain('stage_alt_sugar')
  })

  it('calculates natural regeneration days and Originite Prime cost accurately', () => {
    const deficit = { '30012': 120 } // 120 / 1.2 = 100 runs * 6 AP = 600 sanity
    const res = optimizeFarming(deficit, dummyMatrix, {
      maxSanity: 135,
      regenMinutes: 6,
    })

    expect(res.totalSanity).toBe(600)
    // 600 / 240 sanity per day = 2.5 days
    expect(res.naturalRegenDays).toBe(2.5)
    // ceil(600 / 135) = 5 OP
    expect(res.originitePrimeCost).toBe(5)
  })

  it('satisfies monotonicity property: higher inventory -> lower deficit -> non-increasing sanity', () => {
    // Deficit A (less inventory) vs Deficit B (more inventory = smaller deficit)
    const deficitA = { '30012': 24, '30063': 10 }
    const deficitB = { '30012': 12, '30063': 5 }

    const resA = optimizeFarming(deficitA, dummyMatrix)
    const resB = optimizeFarming(deficitB, dummyMatrix)

    expect(resB.totalSanity).toBeLessThanOrEqual(resA.totalSanity)
    expect(resB.totalRuns).toBeLessThanOrEqual(resA.totalRuns)
  })

  it('reports uncovered items when no candidate stage exists', () => {
    const deficit = { unknown_item_999: 5 }
    const res = optimizeFarming(deficit, dummyMatrix)

    expect(res.stages).toHaveLength(0)
    expect(res.uncoveredItems).toHaveLength(1)
    expect(res.uncoveredItems[0]?.itemId).toBe('unknown_item_999')
    expect(res.uncoveredItems[0]?.remainingQuantity).toBe(5)
  })

  it('filters out closed temporary event stages (closeTime <= now, openTime > now, or exist: false)', () => {
    const now = 1_792_000_000_000
    const eventMatrix: Record<string, PenguinStageMatrix> = {
      closed_event: {
        stageId: 'closed_event',
        code: 'EV-8',
        apCost: 18,
        exist: true,
        openTime: 1_700_000_000_000,
        closeTime: 1_750_000_000_000, // Closed in the past
        drops: [{ itemId: '30073', quantity: 900, times: 1000, dropRate: 0.9 }],
      },
      future_event: {
        stageId: 'future_event',
        code: 'FV-8',
        apCost: 18,
        exist: true,
        openTime: 1_850_000_000_000, // Opens in the future
        closeTime: null,
        drops: [{ itemId: '30073', quantity: 950, times: 1000, dropRate: 0.95 }],
      },
      non_existent: {
        stageId: 'non_existent',
        code: 'NE-8',
        apCost: 18,
        exist: false,
        drops: [{ itemId: '30073', quantity: 990, times: 1000, dropRate: 0.99 }],
      },
      open_permanent: {
        stageId: 'open_permanent',
        code: '14-8',
        apCost: 21,
        exist: true,
        openTime: 1_700_000_000_000,
        closeTime: null,
        drops: [{ itemId: '30073', quantity: 700, times: 1000, dropRate: 0.7 }],
      },
    }

    const res = optimizeFarming({ '30073': 7 }, eventMatrix, { now })
    expect(res.stages).toHaveLength(1)
    expect(res.stages[0]?.stageId).toBe('open_permanent')
    expect(res.stages[0]?.runs).toBe(10) // 7 / 0.7 = 10 runs
    expect(res.stages[0]?.sanity).toBe(210) // 10 * 21 AP
  })

  it('substitutes higher-tier drops via crafting recipes (1-7 Orirock Cube beats S2-5 Orirock, CA-5 beats CA-2)', () => {
    const rockAndSummaryMatrix: Record<string, PenguinStageMatrix> = {
      'sub_02-05': {
        stageId: 'sub_02-05',
        code: 'S2-5',
        apCost: 12,
        drops: [{ itemId: '30011', quantity: 3750, times: 1000, dropRate: 3.75 }],
      },
      'main_01-07': {
        stageId: 'main_01-07',
        code: '1-7',
        apCost: 6,
        drops: [{ itemId: '30012', quantity: 1250, times: 1000, dropRate: 1.25 }],
      },
      wk_kc_2: {
        stageId: 'wk_kc_2',
        code: 'CA-2',
        apCost: 15,
        drops: [{ itemId: '3301', quantity: 5000, times: 1000, dropRate: 5.0 }],
      },
      wk_kc_5: {
        stageId: 'wk_kc_5',
        code: 'CA-5',
        apCost: 30,
        drops: [
          { itemId: '3303', quantity: 2000, times: 1000, dropRate: 2.0 }, // 2.0 * 9 = 18
          { itemId: '3302', quantity: 1500, times: 1000, dropRate: 1.5 }, // 1.5 * 3 = 4.5 (total 22.5 / run)
        ],
      },
    }

    // Need 300 Orirock T1 ('30011') and 225 Skill Summary 1 ('3301')
    // With allowCrafting = true:
    // - 1-7 yields 1.25 * 3 = 3.75 Orirock eq per 6 AP -> 300 / 3.75 = 80 runs = 480 AP (vs S2-5: 80 * 12 = 960 AP)
    // - CA-5 yields 22.5 Summary-1 eq per 30 AP -> 225 / 22.5 = 10 runs = 300 AP (vs CA-2: 45 * 15 = 675 AP)
    const withCrafting = optimizeFarming({ '30011': 300, '3301': 225 }, rockAndSummaryMatrix, {
      allowCrafting: true,
    })

    expect(withCrafting.stages.map((s) => s.code).sort()).toEqual(['1-7', 'CA-5'])
    expect(withCrafting.totalSanity).toBe(480 + 300) // 780 AP
    const stage17 = withCrafting.stages.find((s) => s.code === '1-7')
    expect(stage17?.runs).toBe(80)
    expect(stage17?.contributions[0]?.itemId).toBe('30012')
    expect(stage17?.contributions[0]?.dropRate).toBe(1.25)

    // With allowCrafting = false: falls back to direct itemId matching (S2-5 and CA-2)
    const withoutCrafting = optimizeFarming({ '30011': 300, '3301': 225 }, rockAndSummaryMatrix, {
      allowCrafting: false,
    })
    expect(withoutCrafting.stages.map((s) => s.code).sort()).toEqual(['CA-2', 'S2-5'])
    expect(withoutCrafting.totalSanity).toBe(960 + 675) // 1635 AP
  })

  it("optimizes Kal'tsit full deficit with lower sanity than non-crafting greedy and preserves monotonicity on CN and US", () => {
    const cost = calculateCost(
      kaltsitOp,
      { elite: 0, level: 1, skillLevel: 1, skills: {}, modules: {} },
      {
        elite: 2,
        level: 90,
        skillLevel: 7,
        skills: { skchr_kalts_1: 3, skchr_kalts_2: 3, skchr_kalts_3: 3 },
        modules: { uniequip_002_kalts: 3 },
      },
      gameConstants,
    )

    const emptyDepotRes = resolveDemand(cost.items, {}, { recipes: gameRecipes, useStock: true })
    const partialDepotRes = resolveDemand(
      cost.items,
      { '30012': 100, '3303': 30, '30043': 20 },
      { recipes: gameRecipes, useStock: true },
    )

    // Verify 1d numbers: 0 direct 30011 before resolveDemand, 1191 after resolveDemand
    expect(cost.items.find((i) => i.id === '30011')).toBeUndefined()
    expect(emptyDepotRes.rawDeficit['30011']).toBe(1191)
    expect(emptyDepotRes.rawDeficit['3301']).toBe(1099)

    // CN comparison: allowCrafting = true (Simplex + crafting) vs allowCrafting = false
    const cnNew = optimizeFarming(emptyDepotRes.rawDeficit, cnSnapshot, {
      server: 'cn',
      stagesMap: realStagesMap,
      allowCrafting: true,
    })
    const cnOldNoCrafting = optimizeFarming(emptyDepotRes.rawDeficit, cnSnapshot, {
      server: 'cn',
      stagesMap: realStagesMap,
      allowCrafting: false,
    })

    expect(cnNew.totalSanity).toBeLessThan(cnOldNoCrafting.totalSanity)
    expect(cnNew.totalSanity).toBeLessThan(20000) // ~17,373 AP vs 33,969 AP old
    expect(cnNew.stages.map((s) => s.code)).toContain('1-7')
    expect(cnNew.stages.map((s) => s.code)).toContain('CA-5')
    expect(cnNew.stages.map((s) => s.code)).not.toContain('S2-5')
    expect(cnNew.stages.map((s) => s.code)).not.toContain('CA-2')

    // Uncovered items: Chip Catalyst (32001), Module Data Block (mod_unlock_token), and Data Supplement items
    expect(cnNew.uncoveredItems.map((u) => u.itemId).sort()).toEqual([
      '32001',
      'mod_unlock_token',
      'mod_update_token_1',
      'mod_update_token_2',
    ])

    // US comparison: allowCrafting = true vs allowCrafting = false, and no CN-only stages
    const usNew = optimizeFarming(emptyDepotRes.rawDeficit, usSnapshot, {
      server: 'global',
      stagesMap: realStagesMap,
      allowCrafting: true,
    })
    const usOldNoCrafting = optimizeFarming(emptyDepotRes.rawDeficit, usSnapshot, {
      server: 'global',
      stagesMap: realStagesMap,
      allowCrafting: false,
    })

    expect(usNew.totalSanity).toBeLessThan(usOldNoCrafting.totalSanity)
    expect(usNew.totalSanity).toBeLessThan(22000) // ~18,864 AP vs 116,222 AP old
    expect(usNew.stages.map((s) => s.code)).toContain('1-7')
    expect(usNew.stages.map((s) => s.code)).not.toContain('17-10')
    expect(usNew.stages.map((s) => s.code)).not.toContain('GA-4')

    // Monotonicity: more items in depot -> strictly non-increasing sanity on both CN and US
    const cnPartial = optimizeFarming(partialDepotRes.rawDeficit, cnSnapshot, {
      server: 'cn',
      stagesMap: realStagesMap,
      allowCrafting: true,
    })
    const usPartial = optimizeFarming(partialDepotRes.rawDeficit, usSnapshot, {
      server: 'global',
      stagesMap: realStagesMap,
      allowCrafting: true,
    })

    expect(cnPartial.totalSanity).toBeLessThan(cnNew.totalSanity)
    expect(usPartial.totalSanity).toBeLessThan(usNew.totalSanity)
  })
})
