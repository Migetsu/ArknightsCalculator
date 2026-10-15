import type {
  PenguinMatrixSnapshot,
  PenguinStageMatrix,
  FarmingOptimizationResult,
  FarmingStagePlan,
  FarmedItemContribution,
} from '../../schemas/farming'
import type { Stage } from '../../schemas/stage'

export interface FarmingOptimizationOptions {
  server?: 'cn' | 'global'
  maxSanity?: number
  regenMinutes?: number
  stagesMap?: Record<string, Stage>
  availableStageIds?: Set<string> | string[]
}

const DEFAULT_MAX_SANITY = 135
const DEFAULT_REGEN_MINUTES = 6

function isMatrixSnapshot(
  obj: PenguinMatrixSnapshot | Record<string, PenguinStageMatrix>,
): obj is PenguinMatrixSnapshot {
  return typeof obj === 'object' && obj !== null && 'server' in obj && 'stages' in obj
}

/**
 * Optimizes sanity farming to satisfy raw item deficit.
 * Pure calculation logic (no Vue, no network, deterministic).
 */
export function optimizeFarming(
  rawDeficit: Record<string, number>,
  matrixSnapshot: PenguinMatrixSnapshot | Record<string, PenguinStageMatrix>,
  options: FarmingOptimizationOptions = {},
): FarmingOptimizationResult {
  const server = options.server ?? 'global'
  const maxSanity = options.maxSanity ?? DEFAULT_MAX_SANITY
  const regenMinutes = options.regenMinutes ?? DEFAULT_REGEN_MINUTES
  const stagesMap = options.stagesMap
  const availableSet = options.availableStageIds ? new Set(options.availableStageIds) : null

  const stageMatrices: Record<string, PenguinStageMatrix> = isMatrixSnapshot(matrixSnapshot)
    ? matrixSnapshot.stages
    : matrixSnapshot

  // 1. Filter needed items (deficit > 0)
  const remainingDeficit: Record<string, number> = {}
  for (const [itemId, count] of Object.entries(rawDeficit)) {
    if (count > 0) {
      remainingDeficit[itemId] = count
    }
  }

  const neededItemIds = Object.keys(remainingDeficit)
  if (neededItemIds.length === 0) {
    return {
      stages: [],
      totalRuns: 0,
      totalSanity: 0,
      naturalRegenDays: 0,
      originitePrimeCost: 0,
      uncoveredItems: [],
    }
  }

  // 2. Pre-filter candidate stages
  const candidateStages: PenguinStageMatrix[] = []
  for (const stage of Object.values(stageMatrices)) {
    if (stage.apCost <= 0) continue

    if (stagesMap) {
      const meta = stagesMap[stage.stageId]
      if (!meta || meta.matchedGameData === false) continue
      if (!meta.servers.includes(server)) continue
    }

    if (availableSet && !availableSet.has(stage.stageId)) continue

    candidateStages.push(stage)
  }

  // 3. Find best stage for each missing item (highest dropRate / apCost)
  function getBestStageForItem(
    itemId: string,
  ): { stage: PenguinStageMatrix; dropRate: number } | null {
    let bestStage: PenguinStageMatrix | null = null
    let maxEff = 0
    let bestDropRate = 0

    for (const stage of candidateStages) {
      const drop = stage.drops.find((d) => d.itemId === itemId)
      if (!drop || drop.dropRate <= 0) continue

      const eff = drop.dropRate / stage.apCost
      if (eff > maxEff) {
        maxEff = eff
        bestStage = stage
        bestDropRate = drop.dropRate
      }
    }

    if (!bestStage) return null
    return { stage: bestStage, dropRate: bestDropRate }
  }

  // 4. Iteratively cover items by best stages, reducing deficit for byproducts
  const plannedRunsByStage = new Map<
    string,
    { stage: PenguinStageMatrix; runs: number; primaryItemId?: string }
  >()
  const uncoveredSet = new Set<string>()

  // Sort items to process items with few drop alternatives or higher demand first
  while (true) {
    const activeItemIds = Object.keys(remainingDeficit).filter(
      (id) => (remainingDeficit[id] ?? 0) > 0 && !uncoveredSet.has(id),
    )
    if (activeItemIds.length === 0) break

    // Sort active items: highest remaining quantity first
    activeItemIds.sort((a, b) => (remainingDeficit[b] ?? 0) - (remainingDeficit[a] ?? 0))
    const currentItemId = activeItemIds[0]
    if (!currentItemId) break

    const best = getBestStageForItem(currentItemId)
    if (!best) {
      uncoveredSet.add(currentItemId)
      continue
    }

    const neededQty = remainingDeficit[currentItemId] ?? 0
    const runsForCurrent = Math.ceil(neededQty / best.dropRate)

    if (runsForCurrent <= 0) {
      remainingDeficit[currentItemId] = 0
      continue
    }

    // Add runs to planned stages
    const existing = plannedRunsByStage.get(best.stage.stageId)
    if (existing) {
      existing.runs += runsForCurrent
    } else {
      plannedRunsByStage.set(best.stage.stageId, {
        stage: best.stage,
        runs: runsForCurrent,
        primaryItemId: currentItemId,
      })
    }

    // Deduct all items dropped by this stage (including byproducts)
    for (const drop of best.stage.drops) {
      if (remainingDeficit[drop.itemId] !== undefined) {
        const covered = runsForCurrent * drop.dropRate
        remainingDeficit[drop.itemId] = Math.max(0, remainingDeficit[drop.itemId]! - covered)
      }
    }
  }

  // 5. Build output stage plans and contributions
  const stagePlans: FarmingStagePlan[] = []
  let totalRuns = 0
  let totalSanity = 0

  for (const { stage, runs, primaryItemId } of plannedRunsByStage.values()) {
    if (runs <= 0) continue

    const sanity = runs * stage.apCost
    totalRuns += runs
    totalSanity += sanity

    const contributions: FarmedItemContribution[] = []
    for (const drop of stage.drops) {
      const origTarget = rawDeficit[drop.itemId]
      if (origTarget && origTarget > 0) {
        contributions.push({
          itemId: drop.itemId,
          expectedQuantity: Math.round(runs * drop.dropRate * 10) / 10,
          targetQuantity: origTarget,
        })
      }
    }

    stagePlans.push({
      stageId: stage.stageId,
      code: stage.code,
      apCost: stage.apCost,
      runs,
      sanity,
      contributions,
      primaryItemId,
    })
  }

  // Sort plans: highest sanity cost first
  stagePlans.sort((a, b) => b.sanity - a.sanity)

  // 6. Equivalents
  const naturalRegenPerDay = (24 * 60) / regenMinutes // 240 by default
  const naturalRegenDays = Math.round((totalSanity / naturalRegenPerDay) * 10) / 10
  const originitePrimeCost = Math.ceil(totalSanity / maxSanity)

  const uncoveredItems = Array.from(uncoveredSet).map((itemId) => ({
    itemId,
    remainingQuantity: rawDeficit[itemId] ?? 0,
  }))

  return {
    stages: stagePlans,
    totalRuns,
    totalSanity,
    naturalRegenDays,
    originitePrimeCost,
    uncoveredItems,
  }
}
