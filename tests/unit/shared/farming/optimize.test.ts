import { describe, it, expect } from 'vitest'
import { optimizeFarming } from '../../../../shared/utils/farming/optimize'
import { calculateCost } from '../../../../shared/utils/planner/calculateCost'
import { planExpCards } from '../../../../shared/utils/planner/planExpCards'
import { resolveDemand } from '../../../../shared/utils/workshop/resolveDemand'
import type { PenguinMatrixSnapshot, PenguinStageMatrix } from '../../../../shared/schemas/farming'
import type { Stage } from '../../../../shared/schemas/stage'
import type { OperatorDetail } from '../../../../shared/schemas/operator'
import type { GameConstants } from '../../../../shared/schemas/gameConstants'
import type { CraftRecipe } from '../../../../shared/schemas/recipe'
import kaltsitRaw from '../../../../data/operators/char_003_kalts.json'
import bluePoisonRaw from '../../../../data/operators/char_129_bluep.json'
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
    // 120 Orirock Cubes: 1-7 drops 1.2 cubes and 0.4 raw Orirock per run, so the
    // optimizer can craft the last few cubes from the raw byproduct:
    // 90 runs * 6 AP = 540 sanity.
    const deficit = { '30012': 120 }
    const res = optimizeFarming(deficit, dummyMatrix, {
      maxSanity: 135,
      regenMinutes: 6,
    })

    expect(res.totalSanity).toBe(540)
    // 540 / 240 sanity per day = 2.25 days
    expect(res.naturalRegenDays).toBe(2.3)
    // ceil(540 / 135) = 4 OP
    expect(res.originitePrimeCost).toBe(4)
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

  it('farms base materials directly and crafts higher-tier demand upward', () => {
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

    // Raw T1 demand ('30011' Orirock, '3301' Skill Summary 1) can only be met by
    // stages that drop those items: a Cube or a Summary-2/3 cannot be crafted down.
    const rawT1 = optimizeFarming({ '30011': 300, '3301': 225 }, rockAndSummaryMatrix, {
      allowCrafting: true,
    })
    expect(rawT1.stages.map((s) => s.code).sort()).toEqual(['CA-2', 'S2-5'])
    expect(rawT1.totalSanity).toBe(960 + 675) // 1635 AP

    // A T3 demand ('30013' Orirock Cluster) has no direct stage in this fixture,
    // so the optimizer crafts it upward from the cheap 1-7 cubes.
    const cluster = optimizeFarming({ '30013': 5 }, rockAndSummaryMatrix, {
      allowCrafting: true,
    })
    expect(cluster.uncoveredItems).toHaveLength(0)
    expect(cluster.stages.map((s) => s.code)).toEqual(['1-7'])
    expect(cluster.totalSanity).toBe(120)

    // Without crafting the same T3 demand is not coverable at all.
    const clusterNoCrafting = optimizeFarming({ '30013': 5 }, rockAndSummaryMatrix, {
      allowCrafting: false,
    })
    expect(clusterNoCrafting.uncoveredItems.map((u) => u.itemId)).toEqual(['30013'])
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

    const demand: Record<string, number> = {}
    for (const item of cost.items) demand[item.id] = (demand[item.id] ?? 0) + item.count

    // The optimizer consumes the item-level demand so it can craft materials
    // upward exactly like the game; resolveDemand still reports the unrolled base
    // materials used by the planner's own crafting breakdown.
    const emptyDepotRes = resolveDemand(cost.items, {}, { recipes: gameRecipes, useStock: true })

    // Verify 1d numbers: 0 direct 30011 before resolveDemand, 1191 after resolveDemand
    expect(cost.items.find((i) => i.id === '30011')).toBeUndefined()
    expect(emptyDepotRes.rawDeficit['30011']).toBe(1191)
    expect(emptyDepotRes.rawDeficit['3301']).toBe(1099)

    const netDemand = (stock: Record<string, number>): Record<string, number> => {
      const missing: Record<string, number> = {}
      for (const item of cost.items) {
        const count = Math.max(0, item.count - (stock[item.id] ?? 0))
        if (count > 0) missing[item.id] = (missing[item.id] ?? 0) + count
      }
      return missing
    }

    // CN comparison: allowCrafting = true (Simplex + crafting) vs allowCrafting = false
    const cnNew = optimizeFarming(demand, cnSnapshot, {
      server: 'cn',
      stagesMap: realStagesMap,
      allowCrafting: true,
    })
    const cnOldNoCrafting = optimizeFarming(demand, cnSnapshot, {
      server: 'cn',
      stagesMap: realStagesMap,
      allowCrafting: false,
    })

    expect(cnNew.totalSanity).toBeLessThan(cnOldNoCrafting.totalSanity)
    expect(cnNew.totalSanity).toBeLessThan(20000)
    expect(cnNew.stages.map((s) => s.code)).toContain('1-7')
    expect(cnNew.stages.map((s) => s.code)).toContain('CA-5')

    // Uncovered items: Chip Catalyst (3263), Module Data Block (mod_unlock_token),
    // and the Data Supplement module tokens.
    expect(cnNew.uncoveredItems.map((u) => u.itemId).sort()).toEqual([
      '3263',
      'mod_unlock_token',
      'mod_update_token_1',
      'mod_update_token_2',
    ])

    // US comparison: allowCrafting = true vs allowCrafting = false, and no CN-only stages
    const usNew = optimizeFarming(demand, usSnapshot, {
      server: 'global',
      stagesMap: realStagesMap,
      allowCrafting: true,
    })
    const usOldNoCrafting = optimizeFarming(demand, usSnapshot, {
      server: 'global',
      stagesMap: realStagesMap,
      allowCrafting: false,
    })

    expect(usNew.totalSanity).toBeLessThan(usOldNoCrafting.totalSanity)
    expect(usNew.totalSanity).toBeLessThan(22000)
    expect(usNew.stages.map((s) => s.code)).toContain('1-7')
    expect(usNew.stages.map((s) => s.code)).not.toContain('17-10')
    expect(usNew.stages.map((s) => s.code)).not.toContain('GA-4')

    // Monotonicity: more items in depot -> strictly non-increasing sanity on both CN and US
    const partialStock = { '30012': 100, '3303': 30, '30043': 20 }
    const cnPartial = optimizeFarming(netDemand(partialStock), cnSnapshot, {
      server: 'cn',
      stagesMap: realStagesMap,
      allowCrafting: true,
    })
    const usPartial = optimizeFarming(netDemand(partialStock), usSnapshot, {
      server: 'global',
      stagesMap: realStagesMap,
      allowCrafting: true,
    })

    expect(cnPartial.totalSanity).toBeLessThan(cnNew.totalSanity)
    expect(usPartial.totalSanity).toBeLessThan(usNew.totalSanity)
  })

  it('optimizes standalone LMD (4001) and EXP (2001-2004) deficits via CE-6 and LS-6 without uncovered items', () => {
    // 25,000 LMD -> 3 runs of CE-6 (3 * 10,000 = 30,000 LMD, 108 Sanity)
    const lmdRes = optimizeFarming({ '4001': 25000 }, usSnapshot, {
      server: 'global',
      stagesMap: realStagesMap,
    })
    expect(lmdRes.uncoveredItems).toHaveLength(0)
    expect(lmdRes.stages).toHaveLength(1)
    expect(lmdRes.stages[0]?.code).toBe('CE-6')
    expect(lmdRes.stages[0]?.runs).toBe(3)
    expect(lmdRes.stages[0]?.sanity).toBe(108)
    expect(lmdRes.stages[0]?.contributions[0]?.itemId).toBe('4001')
    expect(lmdRes.stages[0]?.contributions[0]?.expectedQuantity).toBe(30000)

    // Mixed EXP cards: 10x 2004 (20,000) + 3x 2003 (3,000) + 3x 2002 (1,200) + 4x 2001 (800) = 25,000 EXP
    // LS-6 yields 4x 2004 + 2x 2003 = 10,000 EXP/run -> 3 runs of LS-6 (30,000 EXP, 108 Sanity)
    const expRes = optimizeFarming({ '2004': 10, '2003': 3, '2002': 3, '2001': 4 }, usSnapshot, {
      server: 'global',
      stagesMap: realStagesMap,
    })
    expect(expRes.uncoveredItems).toHaveLength(0)
    expect(expRes.stages).toHaveLength(1)
    expect(expRes.stages[0]?.code).toBe('LS-6')
    expect(expRes.stages[0]?.runs).toBe(3)
    expect(expRes.stages[0]?.sanity).toBe(108)
    expect(expRes.stages[0]?.contributions.map((c) => c.itemId)).toEqual(['2004', '2003'])
  })

  it('covers the real farmable demand of a planner target end to end', () => {
    const bluePoison = bluePoisonRaw as unknown as OperatorDetail
    const cost = calculateCost(
      bluePoison,
      { elite: 0, level: 1, skillLevel: 1, skills: {}, modules: {} },
      { elite: 1, level: 70, skillLevel: 7, skills: {}, modules: {} },
      gameConstants,
    )
    const demand: Record<string, number> = {}
    for (const item of cost.items) demand[item.id] = (demand[item.id] ?? 0) + item.count

    const plan = optimizeFarming(demand, usSnapshot, {
      server: 'global',
      stagesMap: realStagesMap,
      allowCrafting: true,
    })

    const stages = usSnapshot.stages as Record<string, PenguinStageMatrix>
    const drops: Record<string, number> = {}
    for (const stagePlan of plan.stages) {
      const stage = stages[stagePlan.stageId]
      if (!stage) continue
      for (const drop of stage.drops) {
        if (drop.dropRate > 0) {
          drops[drop.itemId] = (drops[drop.itemId] ?? 0) + drop.dropRate * stagePlan.runs
        }
      }
    }
    const stock: Record<string, number> = {}
    for (const [itemId, quantity] of Object.entries(drops)) {
      const whole = Math.floor(quantity)
      if (whole > 0) stock[itemId] = whole
    }

    const missing = resolveDemand(cost.items, stock, {
      recipes: gameRecipes,
      useStock: true,
    }).rawDeficit
    expect(missing).toEqual({})
  })

  it("includes CE-6 and LS-6 for Kal'tsit full plan (materials + LMD + EXP) on both CN and US", () => {
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
    const workshopRes = resolveDemand(cost.items, {}, { recipes: gameRecipes, useStock: true })
    const expPlan = planExpCards(cost.exp, gameConstants.expItems)

    const materialDemand: Record<string, number> = {}
    for (const item of cost.items) {
      materialDemand[item.id] = (materialDemand[item.id] ?? 0) + item.count
    }

    // Total LMD = 1,634,796 + 279,500 = 1,914,296 -> 192 runs of CE-6 (6,912 AP)
    // Total EXP = 1,111,400 -> 112 runs of LS-6 (4,032 AP)
    const fullDeficit: Record<string, number> = {
      ...materialDemand,
      '4001': cost.lmd + workshopRes.lmdForCrafting,
      ...expPlan.cards,
    }

    const cnFull = optimizeFarming(fullDeficit, cnSnapshot, {
      server: 'cn',
      stagesMap: realStagesMap,
      allowCrafting: true,
    })
    const usFull = optimizeFarming(fullDeficit, usSnapshot, {
      server: 'global',
      stagesMap: realStagesMap,
      allowCrafting: true,
    })

    for (const res of [cnFull, usFull]) {
      const ce6 = res.stages.find((s) => s.code === 'CE-6')
      const ls6 = res.stages.find((s) => s.code === 'LS-6')
      expect(ce6?.runs).toBe(192)
      expect(ce6?.sanity).toBe(6912)
      expect(ls6?.runs).toBe(112)
      expect(ls6?.sanity).toBe(4032)
      expect(res.uncoveredItems.map((u) => u.itemId)).not.toContain('4001')
      expect(res.uncoveredItems.map((u) => u.itemId)).not.toContain('2004')
    }

    expect(cnFull.totalSanity).toBe(28605) // materials + CE-6 + LS-6
    expect(usFull.totalSanity).toBe(30494) // materials + CE-6 + LS-6
  })
})
