import type { OperatorDetail } from '../schemas/operator'

export interface PromotionCost {
  phase: 1 | 2
  lmd: number
  materials: Array<{ id: string; count: number }>
}

export interface BaseSkillUpgradeStep {
  fromLevel: number
  toLevel: number
  unlockCond: { phase: number; level: number }
  materials: Array<{ id: string; count: number }>
}

export interface BaseSkillUpgradeSummary {
  steps: BaseSkillUpgradeStep[]
  totalMaterials: Array<{ id: string; count: number }>
}

/**
 * Returns available elite promotion costs (E1, E2) for the given operator.
 * Respects operator rarity and accessible phases:
 * - 1-2★: Returns [] (no promotions exist).
 * - 3★: Returns [E1] (10,000 LMD + 0 materials). E2 does not exist for 3★ operators.
 * - 4-6★: Returns [E1, E2] with respective materials and LMD.
 */
export function getOperatorPromotionCosts(
  operator: Pick<OperatorDetail, 'rarity' | 'phases'>,
  evolveGoldCostMap: Record<string, number[]>,
): PromotionCost[] {
  if (!operator.phases || operator.phases.length <= 1) {
    return []
  }

  const results: PromotionCost[] = []
  const goldList = evolveGoldCostMap[String(operator.rarity)] ?? [0, 0]

  // Phase 1 (Elite 1)
  if (operator.phases.length > 1) {
    const p1 = operator.phases[1]
    const gold = goldList[0] ?? 0
    const mats = p1?.evolveCost ?? []
    // 3★ operators have mats: [] but gold: 10000
    if (gold > 0 || mats.length > 0) {
      results.push({
        phase: 1,
        lmd: gold,
        materials: mats,
      })
    }
  }

  // Phase 2 (Elite 2) - only exists for operators with >= 3 phases (4-6★)
  if (operator.phases.length > 2) {
    const p2 = operator.phases[2]
    const gold = goldList[1] ?? 0
    const mats = p2?.evolveCost ?? []
    if (gold > 0 || mats.length > 0) {
      results.push({
        phase: 2,
        lmd: gold,
        materials: mats,
      })
    }
  }

  return results
}

/**
 * Parses and aggregates common skill level upgrades (Lv 1 -> 7).
 */
export function getBaseSkillUpgradeSummary(
  allSkillLvlup?: OperatorDetail['allSkillLvlup'],
): BaseSkillUpgradeSummary {
  if (!allSkillLvlup || allSkillLvlup.length === 0) {
    return { steps: [], totalMaterials: [] }
  }

  const steps: BaseSkillUpgradeStep[] = allSkillLvlup.map((entry, idx) => ({
    fromLevel: idx + 1,
    toLevel: idx + 2,
    unlockCond: entry.unlockCond,
    materials: entry.lvlUpCost ?? [],
  }))

  const totalsMap = new Map<string, number>()
  for (const step of steps) {
    for (const mat of step.materials) {
      totalsMap.set(mat.id, (totalsMap.get(mat.id) ?? 0) + mat.count)
    }
  }

  const totalMaterials = Array.from(totalsMap.entries()).map(([id, count]) => ({
    id,
    count,
  }))

  return { steps, totalMaterials }
}
