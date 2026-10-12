import type { GameConstants } from '../../schemas/gameConstants'
import type { OperatorDetail } from '../../schemas/operator'
import type { CalculatedCost, CostCategoryBreakdown, OperatorState } from './types'

/**
 * Validates that elite phase and level are within valid bounds for the operator.
 */
function validateState(op: OperatorDetail, state: OperatorState, label: string): void {
  const maxElite = op.phases.length - 1
  if (state.elite < 0 || state.elite > maxElite) {
    throw new Error(
      `Invalid ${label} elite phase ${state.elite} for operator ${op.id} (max phase: ${maxElite})`,
    )
  }
  const phase = op.phases[state.elite]
  if (!phase) {
    throw new Error(`Missing phase data for elite ${state.elite} in operator ${op.id}`)
  }
  if (state.level < 1 || state.level > phase.maxLevel) {
    throw new Error(
      `Invalid ${label} level ${state.level} for operator ${op.id} at elite ${state.elite} (must be between 1 and ${phase.maxLevel})`,
    )
  }
  if (state.skillLevel < 1 || state.skillLevel > 7) {
    throw new Error(
      `Invalid ${label} skill level ${state.skillLevel} for operator ${op.id} (must be between 1 and 7)`,
    )
  }
}

/**
 * Merges items list by summing counts of matching item IDs.
 */
function mergeItems(
  existing: Array<{ id: string; count: number }>,
  additions: Array<{ id: string; count: number }>,
): Array<{ id: string; count: number }> {
  const map = new Map<string, number>()
  for (const item of existing) {
    map.set(item.id, (map.get(item.id) ?? 0) + item.count)
  }
  for (const item of additions) {
    map.set(item.id, (map.get(item.id) ?? 0) + item.count)
  }
  return Array.from(map.entries())
    .map(([id, count]) => ({ id, count }))
    .filter((it) => it.count > 0)
}

/**
 * Calculates leveling EXP and LMD requirements between (eliteFrom, levelFrom) and (eliteTo, levelTo).
 * Respects Arknights mechanics: leveling within an elite phase advances from level to target.
 * Upon promoting to the next elite phase, the operator's level drops to 1, and leveling restarts from 1.
 */
function calculateLevelProgression(
  op: OperatorDetail,
  current: OperatorState,
  target: OperatorState,
  constants: GameConstants,
): {
  exp: number
  levelLmd: number
  evolveLmd: number
  evolveItems: Array<{ id: string; count: number }>
} {
  // Check if target is strictly before current in progression
  if (
    target.elite < current.elite ||
    (target.elite === current.elite && target.level <= current.level)
  ) {
    return { exp: 0, levelLmd: 0, evolveLmd: 0, evolveItems: [] }
  }

  let totalExp = 0
  let totalLevelLmd = 0
  let totalEvolveLmd = 0
  let evolveItems: Array<{ id: string; count: number }> = []

  const rarityKey = String(op.rarity)
  const evolveGoldList = constants.evolveGoldCost[rarityKey] ?? []

  for (let e = current.elite; e <= target.elite; e++) {
    const phase = op.phases[e]
    if (!phase) continue

    const startLvl = e === current.elite ? current.level : 1
    const endLvl = e === target.elite ? target.level : phase.maxLevel

    const expMap = constants.characterExpMap[String(e)] ?? []
    const costMap = constants.characterUpgradeCostMap[String(e)] ?? []

    for (let lvl = startLvl; lvl < endLvl; lvl++) {
      const expNeeded = expMap[lvl - 1] ?? 0
      const lmdNeeded = costMap[lvl - 1] ?? 0
      totalExp += expNeeded
      totalLevelLmd += lmdNeeded
    }

    // If progressing past this elite phase, add promotion cost
    if (e < target.elite) {
      // Evolve gold cost index: E0->E1 is index 0, E1->E2 is index 1
      const goldCost = evolveGoldList[e] ?? 0
      totalEvolveLmd += goldCost

      // Items required for evolution are stored in phase[e + 1].evolveCost
      const nextPhase = op.phases[e + 1]
      if (nextPhase?.evolveCost) {
        evolveItems = mergeItems(evolveItems, nextPhase.evolveCost)
      }
    }
  }

  return {
    exp: totalExp,
    levelLmd: totalLevelLmd,
    evolveLmd: totalEvolveLmd,
    evolveItems,
  }
}

/**
 * Calculates common skill level upgrade costs (1 -> 7).
 */
function calculateSkillCommonProgression(
  op: OperatorDetail,
  currentRank: number,
  targetRank: number,
  lmdItemId: string,
): { items: Array<{ id: string; count: number }>; lmd: number } {
  if (targetRank <= currentRank || !op.allSkillLvlup) {
    return { items: [], lmd: 0 }
  }

  let items: Array<{ id: string; count: number }> = []
  let lmd = 0

  // allSkillLvlup[0] is rank 1->2, allSkillLvlup[5] is rank 6->7
  for (let r = currentRank; r < targetRank; r++) {
    const step = op.allSkillLvlup[r - 1]
    if (step?.lvlUpCost) {
      for (const costItem of step.lvlUpCost) {
        if (costItem.id === lmdItemId) {
          lmd += costItem.count
        } else {
          items = mergeItems(items, [costItem])
        }
      }
    }
  }

  return { items, lmd }
}

/**
 * Calculates skill mastery costs (M1 -> M3) for all individual skills.
 */
function calculateMasteryProgression(
  op: OperatorDetail,
  currentSkills: Record<string, number>,
  targetSkills: Record<string, number>,
  lmdItemId: string,
): { items: Array<{ id: string; count: number }>; lmd: number } {
  if (!op.skills || op.skills.length === 0) {
    return { items: [], lmd: 0 }
  }

  let items: Array<{ id: string; count: number }> = []
  let lmd = 0

  for (const skill of op.skills) {
    const curM = currentSkills[skill.skillId] ?? 0
    const tgtM = targetSkills[skill.skillId] ?? 0
    if (tgtM <= curM || !skill.masteryCosts) continue

    // masteryCosts[0] is M1, [1] is M2, [2] is M3
    for (let m = curM; m < tgtM; m++) {
      const step = skill.masteryCosts[m]
      if (step?.levelUpCost) {
        for (const costItem of step.levelUpCost) {
          if (costItem.id === lmdItemId) {
            lmd += costItem.count
          } else {
            items = mergeItems(items, [costItem])
          }
        }
      }
    }
  }

  return { items, lmd }
}

/**
 * Calculates module stage upgrade costs (0 -> 3) for all operator modules.
 */
function calculateModuleProgression(
  op: OperatorDetail,
  currentModules: Record<string, number>,
  targetModules: Record<string, number>,
  lmdItemId: string,
): { items: Array<{ id: string; count: number }>; lmd: number } {
  if (!op.modules || op.modules.length === 0) {
    return { items: [], lmd: 0 }
  }

  let items: Array<{ id: string; count: number }> = []
  let lmd = 0

  for (const mod of op.modules) {
    const curStage = currentModules[mod.id] ?? 0
    const tgtStage = targetModules[mod.id] ?? 0
    if (tgtStage <= curStage || !mod.stages) continue

    for (let st = curStage; st < tgtStage; st++) {
      const stageData = mod.stages.find((s) => s.stage === st + 1)
      if (stageData?.cost) {
        for (const costItem of stageData.cost) {
          if (costItem.id === lmdItemId) {
            lmd += costItem.count
          } else {
            items = mergeItems(items, [costItem])
          }
        }
      }
    }
  }

  return { items, lmd }
}

/**
 * Core calculation function: determines total LMD, EXP, and items required
 * to transition an operator from their current progression state to target state.
 */
export function calculateCost(
  operator: OperatorDetail,
  current: OperatorState,
  target: OperatorState,
  constants: GameConstants,
): CalculatedCost {
  validateState(operator, current, 'current')
  validateState(operator, target, 'target')

  const lmdItemId = constants.lmdItemId

  // 1. Level & Promotion Progression
  const levelProg = calculateLevelProgression(operator, current, target, constants)

  // 2. Common Skill Progression (1-7)
  const skillProg = calculateSkillCommonProgression(
    operator,
    current.skillLevel,
    target.skillLevel,
    lmdItemId,
  )

  // 3. Mastery Progression (M1-M3)
  const masteryProg = calculateMasteryProgression(
    operator,
    current.skills,
    target.skills,
    lmdItemId,
  )

  // 4. Module Progression (Stage 1-3)
  const moduleProg = calculateModuleProgression(
    operator,
    current.modules,
    target.modules,
    lmdItemId,
  )

  // Aggregate LMD
  const totalLmd =
    levelProg.levelLmd + levelProg.evolveLmd + skillProg.lmd + masteryProg.lmd + moduleProg.lmd

  // Aggregate breakdown
  const categoryItems: CostCategoryBreakdown = {
    elite: levelProg.evolveItems,
    skills: skillProg.items,
    masteries: masteryProg.items,
    modules: moduleProg.items,
  }

  let allItems = mergeItems([], levelProg.evolveItems)
  allItems = mergeItems(allItems, skillProg.items)
  allItems = mergeItems(allItems, masteryProg.items)
  allItems = mergeItems(allItems, moduleProg.items)

  return {
    lmd: totalLmd,
    exp: levelProg.exp,
    items: allItems,
    breakdown: {
      lmd: {
        levelUp: levelProg.levelLmd,
        evolve: levelProg.evolveLmd,
        skills: skillProg.lmd,
        modules: moduleProg.lmd,
      },
      exp: levelProg.exp,
      items: categoryItems,
    },
  }
}
