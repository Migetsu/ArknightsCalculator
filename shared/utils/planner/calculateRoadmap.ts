import type { GameConstants } from '../../schemas/gameConstants'
import type { OperatorDetail } from '../../schemas/operator'
import type {
  OperatorState,
  RoadmapPlan,
  RoadmapStep,
  RoadmapStepCosts,
  RoadmapStepReadiness,
} from './types'

export interface DepotInventorySnapshot {
  items?: Record<string, number>
  lmd?: number
  exp?: number
}

function computeReadiness(
  costs: RoadmapStepCosts,
  depot?: DepotInventorySnapshot,
): RoadmapStepReadiness {
  const depotItems = depot?.items ?? {}
  const depotLmd = depot?.lmd ?? 0
  const depotExp = depot?.exp ?? 0

  const missingLmd = Math.max(0, costs.lmd - depotLmd)
  const missingExp = Math.max(0, costs.exp - depotExp)

  const missingItems: Array<{ id: string; count: number }> = []
  for (const item of costs.items) {
    const have = depotItems[item.id] ?? 0
    if (have < item.count) {
      missingItems.push({
        id: item.id,
        count: item.count - have,
      })
    }
  }

  const isReady = missingLmd === 0 && missingExp === 0 && missingItems.length === 0

  let totalResourceUnits = 0
  let fulfilledUnits = 0

  if (costs.lmd > 0) {
    totalResourceUnits += 1
    if (missingLmd === 0) fulfilledUnits += 1
  }
  if (costs.exp > 0) {
    totalResourceUnits += 1
    if (missingExp === 0) fulfilledUnits += 1
  }
  for (const item of costs.items) {
    totalResourceUnits += item.count
    const have = depotItems[item.id] ?? 0
    fulfilledUnits += Math.min(have, item.count)
  }

  const completionPercent =
    totalResourceUnits === 0
      ? 100
      : Math.min(100, Math.round((fulfilledUnits / totalResourceUnits) * 100))

  return {
    isReady,
    missingLmd,
    missingExp,
    missingItems,
    completionPercent,
  }
}

/**
 * Calculates a structured, ordered roadmap of milestone steps to advance
 * an operator from current state to target state.
 */
export function calculateRoadmap(
  op: OperatorDetail,
  current: OperatorState,
  target: OperatorState,
  constants: GameConstants,
  depot?: DepotInventorySnapshot,
): RoadmapPlan {
  const steps: RoadmapStep[] = []

  let runningState: OperatorState = {
    elite: current.elite,
    level: current.level,
    skillLevel: current.skillLevel,
    skills: { ...current.skills },
    modules: { ...current.modules },
  }

  const lmdItemId = constants.lmdItemId || '4001'
  const rarityKey = String(op.rarity)
  const evolveGoldList = constants.evolveGoldCost[rarityKey] ?? []

  // 1. Process Elite phases and Levels
  const maxElite = Math.min(target.elite, op.phases.length - 1)

  for (let e = current.elite; e <= maxElite; e++) {
    const phase = op.phases[e]
    if (!phase) continue

    const startLvl = e === current.elite ? current.level : 1
    const endLvl = e === target.elite ? target.level : phase.maxLevel

    // Leveling step within current elite phase
    if (endLvl > startLvl) {
      let stepExp = 0
      let stepLmd = 0
      const expMap = constants.characterExpMap[String(e)] ?? []
      const costMap = constants.characterUpgradeCostMap[String(e)] ?? []

      for (let lvl = startLvl; lvl < endLvl; lvl++) {
        stepExp += expMap[lvl - 1] ?? 0
        stepLmd += costMap[lvl - 1] ?? 0
      }

      runningState = {
        ...runningState,
        elite: e,
        level: endLvl,
      }

      const costs: RoadmapStepCosts = {
        lmd: stepLmd,
        exp: stepExp,
        items: [],
      }

      steps.push({
        id: `level_e${e}_${startLvl}_to_${endLvl}`,
        kind: 'level',
        title: `Elite ${e} Level ${startLvl} → ${endLvl}`,
        subtitle: `Leveling up in Elite ${e}`,
        phase: e,
        levelRange: { from: startLvl, to: endLvl },
        costs,
        resultingState: { ...runningState },
        readiness: computeReadiness(costs, depot),
      })
    }

    // Common skill ranks available at this elite phase
    // Rank 1-4 accessible at E0; Rank 5-7 accessible at E1+
    const maxSkillAtPhase = e === 0 ? 4 : 7
    if (target.skillLevel > runningState.skillLevel && runningState.skillLevel < maxSkillAtPhase) {
      const targetRankForPhase = Math.min(target.skillLevel, maxSkillAtPhase)
      const fromRank = runningState.skillLevel
      const toRank = targetRankForPhase

      if (toRank > fromRank && op.allSkillLvlup) {
        let skillLmd = 0
        const itemMap = new Map<string, number>()

        for (let r = fromRank; r < toRank; r++) {
          const stepLvl = op.allSkillLvlup[r - 1]
          if (stepLvl?.lvlUpCost) {
            for (const c of stepLvl.lvlUpCost) {
              if (c.id === lmdItemId) {
                skillLmd += c.count
              } else {
                itemMap.set(c.id, (itemMap.get(c.id) ?? 0) + c.count)
              }
            }
          }
        }

        runningState = {
          ...runningState,
          skillLevel: toRank,
        }

        const costs: RoadmapStepCosts = {
          lmd: skillLmd,
          exp: 0,
          items: Array.from(itemMap.entries()).map(([id, count]) => ({ id, count })),
        }

        steps.push({
          id: `skill_rank_${fromRank}_to_${toRank}`,
          kind: 'skill_rank',
          title: `Skill Ranks ${fromRank} → ${toRank}`,
          subtitle: `Common skill upgrades`,
          phase: e,
          costs,
          resultingState: { ...runningState },
          readiness: computeReadiness(costs, depot),
        })
      }
    }

    // Promotion to next elite phase
    if (e < target.elite && e + 1 < op.phases.length) {
      const nextPhase = op.phases[e + 1]
      const goldCost = evolveGoldList[e] ?? 0
      const evolveItems = nextPhase?.evolveCost ?? []

      runningState = {
        ...runningState,
        elite: e + 1,
        level: 1,
      }

      const costs: RoadmapStepCosts = {
        lmd: goldCost,
        exp: 0,
        items: evolveItems.map((item) => ({ id: item.id, count: item.count })),
      }

      steps.push({
        id: `promotion_e${e}_to_e${e + 1}`,
        kind: 'promotion',
        title: `Promote to Elite ${e + 1}`,
        subtitle: `Elite ${e} → Elite ${e + 1}`,
        phase: e + 1,
        costs,
        resultingState: { ...runningState },
        readiness: computeReadiness(costs, depot),
      })
    }
  }

  // 2. Skill Masteries (M1, M2, M3)
  if (op.skills && op.skills.length > 0) {
    op.skills.forEach((skill, skillIdx) => {
      const curM = current.skills[skill.skillId] ?? 0
      const tgtM = target.skills[skill.skillId] ?? 0
      if (tgtM <= curM || !skill.masteryCosts) return

      const skillName = skill.levels[0]?.name.en ?? `Skill ${skillIdx + 1}`

      for (let m = curM; m < tgtM; m++) {
        const masteryTier = m + 1
        const costEntry = skill.masteryCosts[m]
        let masteryLmd = 0
        const items: Array<{ id: string; count: number }> = []

        if (costEntry?.levelUpCost) {
          for (const c of costEntry.levelUpCost) {
            if (c.id === lmdItemId) {
              masteryLmd += c.count
            } else {
              items.push({ id: c.id, count: c.count })
            }
          }
        }

        runningState = {
          ...runningState,
          skills: {
            ...runningState.skills,
            [skill.skillId]: masteryTier,
          },
        }

        const costs: RoadmapStepCosts = {
          lmd: masteryLmd,
          exp: 0,
          items,
        }

        steps.push({
          id: `mastery_${skill.skillId}_m${masteryTier}`,
          kind: 'skill_mastery',
          title: `${skillName} Mastery ${masteryTier}`,
          subtitle: `Skill ${skillIdx + 1} Specialization ${masteryTier}`,
          phase: 2,
          skillId: skill.skillId,
          masteryLevel: masteryTier,
          costs,
          resultingState: { ...runningState },
          readiness: computeReadiness(costs, depot),
        })
      }
    })
  }

  // 3. Module Stages (Stage 1, Stage 2, Stage 3)
  if (op.modules && op.modules.length > 0) {
    op.modules.forEach((mod, modIdx) => {
      const curStage = current.modules[mod.id] ?? 0
      const tgtStage = target.modules[mod.id] ?? 0
      if (tgtStage <= curStage || !mod.itemCost) return

      const modName = mod.name.en || `Module ${modIdx + 1}`

      for (let s = curStage; s < tgtStage; s++) {
        const stageNum = s + 1
        const stageCosts = mod.itemCost[String(stageNum)] ?? []
        let modLmd = 0
        const items: Array<{ id: string; count: number }> = []

        for (const c of stageCosts) {
          if (c.id === lmdItemId) {
            modLmd += c.count
          } else {
            items.push({ id: c.id, count: c.count })
          }
        }

        runningState = {
          ...runningState,
          modules: {
            ...runningState.modules,
            [mod.id]: stageNum,
          },
        }

        const costs: RoadmapStepCosts = {
          lmd: modLmd,
          exp: 0,
          items,
        }

        steps.push({
          id: `module_${mod.id}_stage${stageNum}`,
          kind: 'module_stage',
          title: `${modName} Stage ${stageNum}`,
          subtitle: `Module upgrade stage ${stageNum}`,
          phase: 2,
          moduleId: mod.id,
          moduleStage: stageNum,
          costs,
          resultingState: { ...runningState },
          readiness: computeReadiness(costs, depot),
        })
      }
    })
  }

  const readyStepsCount = steps.filter((s) => s.readiness.isReady).length

  return {
    operatorId: op.id,
    steps,
    totalSteps: steps.length,
    readyStepsCount,
  }
}
