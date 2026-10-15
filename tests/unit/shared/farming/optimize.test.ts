import { describe, it, expect } from 'vitest'
import { optimizeFarming } from '../../../../shared/utils/farming/optimize'
import type { PenguinStageMatrix } from '../../../../shared/schemas/farming'
import type { Stage } from '../../../../shared/schemas/stage'

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
})
