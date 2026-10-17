import type {
  PenguinMatrixSnapshot,
  PenguinStageMatrix,
  FarmingOptimizationResult,
  FarmingStagePlan,
  FarmedItemContribution,
} from '../../schemas/farming'
import type { Stage } from '../../schemas/stage'
import type { CraftRecipe } from '../../schemas/recipe'
import defaultRecipesData from '../../../data/recipes.json'

const defaultRecipes = defaultRecipesData as unknown as readonly CraftRecipe[]

export interface FarmingOptimizationOptions {
  server?: 'cn' | 'global'
  maxSanity?: number
  regenMinutes?: number
  stagesMap?: Record<string, Stage>
  availableStageIds?: Set<string> | string[]
  allowCrafting?: boolean
  recipes?: readonly CraftRecipe[]
  now?: number
}

const DEFAULT_MAX_SANITY = 135
const DEFAULT_REGEN_MINUTES = 6
const EPS = 1e-7

/**
 * EXP card equivalence relative to Drill Battle Record ('2001' = 200 EXP):
 * - 2001 (Drill Battle Record): 200 EXP = 1x '2001'
 * - 2002 (Frontline Battle Record): 400 EXP = 2x '2001'
 * - 2003 (Tactical Battle Record): 1000 EXP = 5x '2001'
 * - 2004 (Strategic Battle Record): 2000 EXP = 10x '2001'
 */
export const EXP_CARD_BASE_ID = '2001'
export const EXP_CARD_EQUIV_TO_2001: Readonly<Record<string, number>> = {
  '2001': 1,
  '2002': 2,
  '2003': 5,
  '2004': 10,
}

/**
 * Guaranteed deterministic 3-star outputs for Cargo Escort (CE-1..CE-6, LMD '4001')
 * and Tactical Drill (LS-1..LS-6, Battle Records '2001'–'2004'), verified against
 * stage_table.json and arknights.wiki.gg/wiki/Operation/Supply.
 */
export const GUARANTEED_SUPPLY_STAGES: readonly PenguinStageMatrix[] = [
  {
    stageId: 'wk_melee_1',
    code: 'CE-1',
    apCost: 10,
    exist: true,
    drops: [{ itemId: '4001', quantity: 1700, times: 1, dropRate: 1700 }],
  },
  {
    stageId: 'wk_melee_2',
    code: 'CE-2',
    apCost: 15,
    exist: true,
    drops: [{ itemId: '4001', quantity: 2800, times: 1, dropRate: 2800 }],
  },
  {
    stageId: 'wk_melee_3',
    code: 'CE-3',
    apCost: 20,
    exist: true,
    drops: [{ itemId: '4001', quantity: 4100, times: 1, dropRate: 4100 }],
  },
  {
    stageId: 'wk_melee_4',
    code: 'CE-4',
    apCost: 25,
    exist: true,
    drops: [{ itemId: '4001', quantity: 5700, times: 1, dropRate: 5700 }],
  },
  {
    stageId: 'wk_melee_5',
    code: 'CE-5',
    apCost: 30,
    exist: true,
    drops: [{ itemId: '4001', quantity: 7500, times: 1, dropRate: 7500 }],
  },
  {
    stageId: 'wk_melee_6',
    code: 'CE-6',
    apCost: 36,
    exist: true,
    drops: [{ itemId: '4001', quantity: 10000, times: 1, dropRate: 10000 }],
  },
  {
    stageId: 'wk_kc_1',
    code: 'LS-1',
    apCost: 10,
    exist: true,
    drops: [
      { itemId: '2002', quantity: 3, times: 1, dropRate: 3 },
      { itemId: '2001', quantity: 2, times: 1, dropRate: 2 },
    ],
  },
  {
    stageId: 'wk_kc_2',
    code: 'LS-2',
    apCost: 15,
    exist: true,
    drops: [
      { itemId: '2002', quantity: 5, times: 1, dropRate: 5 },
      { itemId: '2001', quantity: 4, times: 1, dropRate: 4 },
    ],
  },
  {
    stageId: 'wk_kc_3',
    code: 'LS-3',
    apCost: 20,
    exist: true,
    drops: [
      { itemId: '2003', quantity: 3, times: 1, dropRate: 3 },
      { itemId: '2002', quantity: 175, times: 100, dropRate: 1.75 },
      { itemId: '2001', quantity: 2, times: 1, dropRate: 2 },
    ],
  },
  {
    stageId: 'wk_kc_4',
    code: 'LS-4',
    apCost: 25,
    exist: true,
    drops: [
      { itemId: '2004', quantity: 1, times: 1, dropRate: 1 },
      { itemId: '2003', quantity: 2, times: 1, dropRate: 2 },
      { itemId: '2002', quantity: 3, times: 1, dropRate: 3 },
      { itemId: '2001', quantity: 2, times: 1, dropRate: 2 },
    ],
  },
  {
    stageId: 'wk_kc_5',
    code: 'LS-5',
    apCost: 30,
    exist: true,
    drops: [
      { itemId: '2004', quantity: 3, times: 1, dropRate: 3 },
      { itemId: '2003', quantity: 1, times: 1, dropRate: 1 },
      { itemId: '2002', quantity: 1, times: 1, dropRate: 1 },
    ],
  },
  {
    stageId: 'wk_kc_6',
    code: 'LS-6',
    apCost: 36,
    exist: true,
    drops: [
      { itemId: '2004', quantity: 4, times: 1, dropRate: 4 },
      { itemId: '2003', quantity: 2, times: 1, dropRate: 2 },
    ],
  },
]

function isMatrixSnapshot(
  obj: PenguinMatrixSnapshot | Record<string, PenguinStageMatrix>,
): obj is PenguinMatrixSnapshot {
  return typeof obj === 'object' && obj !== null && 'server' in obj && 'stages' in obj
}

/**
 * Builds a base-material equivalence map from Workshop synthesis recipes.
 * For example:
 * - 30012 (Orirock Cube) -> { '30011': 3 }
 * - 30013 (Orirock Cluster) -> { '30011': 15 }
 * - 3302 (Skill Summary - 2) -> { '3301': 3 }
 * - 3303 (Skill Summary - 3) -> { '3301': 9 }
 * - 2001..2004 (Battle Records) -> { '2001': 1 | 2 | 5 | 10 }
 */
export function buildBaseEquivalenceMap(
  recipes: readonly CraftRecipe[] = defaultRecipes,
): (itemId: string) => Record<string, number> {
  const recipeByResult = new Map<string, CraftRecipe>()
  for (const r of recipes) {
    // Only use hierarchical Workshop synthesis recipes (exclude chip conversions, dualchip manufacture, and furniture dismantling)
    if (r.kind !== 'synthesis') continue
    if (r.resultId === '3401') continue
    if (r.resultId.startsWith('311') || r.resultId.startsWith('313')) continue
    if (r.ingredients.length > 0 && !recipeByResult.has(r.resultId)) {
      recipeByResult.set(r.resultId, r)
    }
  }

  const memo = new Map<string, Record<string, number>>()
  for (const [cardId, factor] of Object.entries(EXP_CARD_EQUIV_TO_2001)) {
    memo.set(cardId, { [EXP_CARD_BASE_ID]: factor })
  }

  function getEquiv(itemId: string, visited = new Set<string>()): Record<string, number> {
    const cached = memo.get(itemId)
    if (cached) return cached

    const recipe = recipeByResult.get(itemId)
    if (!recipe || visited.has(itemId)) {
      const selfEq = { [itemId]: 1 }
      memo.set(itemId, selfEq)
      return selfEq
    }

    const nextVisited = new Set(visited)
    nextVisited.add(itemId)

    const resultCount = recipe.resultCount > 0 ? recipe.resultCount : 1
    const eq: Record<string, number> = {}
    for (const ing of recipe.ingredients) {
      const sub = getEquiv(ing.id, nextVisited)
      for (const [baseId, qty] of Object.entries(sub)) {
        eq[baseId] = (eq[baseId] ?? 0) + (ing.count / resultCount) * qty
      }
    }

    memo.set(itemId, eq)
    return eq
  }

  return (itemId: string) => getEquiv(itemId)
}

/**
 * Checks whether a candidate stage exists on the server and is currently open.
 */
export function isStageCurrentlyOpen(stage: PenguinStageMatrix, now: number): boolean {
  if (stage.exist === false) return false
  if (typeof stage.openTime === 'number' && stage.openTime > now) return false
  if (typeof stage.closeTime === 'number' && stage.closeTime <= now) return false
  return true
}

/**
 * Solves min c^T x subject to A x >= b, x >= 0 via the Dual Simplex algorithm.
 * Returns continuous stage run counts x >= 0.
 */
function solveContinuousLpDualSimplex(
  costs: readonly number[],
  matrixA: readonly (readonly number[])[],
  rhsB: readonly number[],
): number[] {
  const m = rhsB.length
  const n = costs.length
  if (m === 0 || n === 0) return new Array(n).fill(0)

  // Tableau of size (m + 1) x (n + 1)
  // Row i (0..m-1): basic variable = surplus_i = sum_j A[i][j] * x_j - b_i
  // Standard form: x_{basic_i} + sum_j (-A[i][j]) * x_{nonbasic_j} = -b_i
  // Row m: objective reduced costs c_j >= 0 (dual feasible)
  const T: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0))

  for (let i = 0; i < m; i++) {
    const row = T[i]!
    const srcRow = matrixA[i]!
    for (let j = 0; j < n; j++) {
      row[j] = -(srcRow[j] ?? 0)
    }
    row[n] = -(rhsB[i] ?? 0)
  }

  const objRow = T[m]!
  for (let j = 0; j < n; j++) {
    objRow[j] = costs[j] ?? 0
  }
  objRow[n] = 0

  // Variable IDs: 0..m-1 are surplus variables, m..m+n-1 are stage variables
  const basicVar = Array.from({ length: m }, (_, i) => i)
  const nonBasicVar = Array.from({ length: n }, (_, j) => m + j)

  const maxIterations = 600
  for (let iter = 0; iter < maxIterations; iter++) {
    // 1. Choose leaving row r with most negative RHS
    let pivotRow = -1
    let minRhs = -EPS
    for (let i = 0; i < m; i++) {
      const val = T[i]![n]!
      if (val < minRhs) {
        minRhs = val
        pivotRow = i
      }
    }

    if (pivotRow === -1) {
      // Primal feasible and dual feasible -> optimal!
      break
    }

    // 2. Choose entering column k minimizing dual ratio T[m][j] / (-T[pivotRow][j]) for T[pivotRow][j] < -1e-9
    let pivotCol = -1
    let minRatio = Infinity
    const pRow = T[pivotRow]!

    for (let j = 0; j < n; j++) {
      const a = pRow[j]!
      if (a < -1e-9) {
        const reducedCost = Math.max(0, T[m]![j]!)
        const ratio = reducedCost / -a
        if (
          ratio < minRatio - 1e-11 ||
          (Math.abs(ratio - minRatio) <= 1e-11 &&
            pivotCol !== -1 &&
            nonBasicVar[j]! < nonBasicVar[pivotCol]!)
        ) {
          minRatio = ratio
          pivotCol = j
        }
      }
    }

    if (pivotCol === -1) {
      // Numerical guard: mark row satisfied if no negative entry exists
      pRow[n] = 0
      continue
    }

    // 3. Pivot on (pivotRow, pivotCol)
    const pivotVal = pRow[pivotCol]!

    const leavingId = basicVar[pivotRow]!
    basicVar[pivotRow] = nonBasicVar[pivotCol]!
    nonBasicVar[pivotCol] = leavingId

    for (let j = 0; j <= n; j++) {
      if (j !== pivotCol) {
        pRow[j] = pRow[j]! / pivotVal
      }
    }
    pRow[pivotCol] = 1 / pivotVal

    for (let i = 0; i <= m; i++) {
      if (i === pivotRow) continue
      const rowI = T[i]!
      const factor = rowI[pivotCol]!
      if (Math.abs(factor) < 1e-13) {
        rowI[pivotCol] = 0
        continue
      }
      for (let j = 0; j <= n; j++) {
        if (j !== pivotCol) {
          rowI[j] = rowI[j]! - factor * pRow[j]!
        }
      }
      rowI[pivotCol] = -factor / pivotVal
    }
  }

  const x = new Array<number>(n).fill(0)
  for (let i = 0; i < m; i++) {
    const varId = basicVar[i]!
    if (varId >= m) {
      const stageIdx = varId - m
      x[stageIdx] = Math.max(0, T[i]![n]!)
    }
  }

  return x
}

/**
 * Optimizes sanity farming to satisfy item deficit using Linear Programming (Simplex)
 * with Workshop crafting substitution (T1-equivalents) and byproduct deduction.
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
  const allowCrafting = options.allowCrafting ?? true
  const now = options.now ?? Date.now()

  const rawStageMatrices: Record<string, PenguinStageMatrix> = isMatrixSnapshot(matrixSnapshot)
    ? matrixSnapshot.stages
    : matrixSnapshot

  const stageMatrices: Record<string, PenguinStageMatrix> = { ...rawStageMatrices }
  for (const supplyStage of GUARANTEED_SUPPLY_STAGES) {
    const existing = stageMatrices[supplyStage.stageId]
    if (!existing) {
      stageMatrices[supplyStage.stageId] = supplyStage
    } else if (existing.code === supplyStage.code) {
      const dropMap = new Map(existing.drops.map((d) => [d.itemId, d]))
      for (const gDrop of supplyStage.drops) {
        dropMap.set(gDrop.itemId, gDrop)
      }
      stageMatrices[supplyStage.stageId] = {
        ...existing,
        drops: Array.from(dropMap.values()),
      }
    }
  }

  // 1. Filter positive deficit items
  const positiveDeficit: Record<string, number> = {}
  for (const [itemId, count] of Object.entries(rawDeficit)) {
    if (count > 0) {
      positiveDeficit[itemId] = count
    }
  }

  if (Object.keys(positiveDeficit).length === 0) {
    return {
      stages: [],
      totalRuns: 0,
      totalSanity: 0,
      naturalRegenDays: 0,
      originitePrimeCost: 0,
      uncoveredItems: [],
    }
  }

  // 2. Filter open & server-valid candidate stages
  const candidateStages: PenguinStageMatrix[] = []
  for (const stage of Object.values(stageMatrices)) {
    if (stage.apCost <= 0) continue
    if (!isStageCurrentlyOpen(stage, now)) continue

    // Deduplicate tough_* stages when canonical main_* exists
    if (stage.stageId.startsWith('tough_')) {
      const mainId = stage.stageId.replace(/^tough_/, 'main_')
      if (stageMatrices[mainId]) continue
    }

    if (stagesMap) {
      const meta = stagesMap[stage.stageId]
      if (!meta || meta.matchedGameData === false) continue
      if (!meta.servers.includes(server)) continue
    }

    if (availableSet && !availableSet.has(stage.stageId)) continue

    candidateStages.push(stage)
  }

  // Deterministic stage ordering
  candidateStages.sort((a, b) => a.stageId.localeCompare(b.stageId))

  // 3. Build recipe lookup for hierarchical synthesis when allowCrafting = true
  const recipeByResult = new Map<string, CraftRecipe>()
  if (allowCrafting) {
    for (const r of options.recipes ?? defaultRecipes) {
      if (r.kind !== 'synthesis') continue
      if (r.resultId === '3401') continue
      if (r.resultId.startsWith('311') || r.resultId.startsWith('313')) continue
      if (r.ingredients.length > 0 && !recipeByResult.has(r.resultId)) {
        recipeByResult.set(r.resultId, r)
      }
    }
  }

  const fullEquivFn = allowCrafting
    ? buildBaseEquivalenceMap(options.recipes ?? defaultRecipes)
    : (itemId: string) => {
        const expFactor = EXP_CARD_EQUIV_TO_2001[itemId]
        return expFactor !== undefined ? { [EXP_CARD_BASE_ID]: expFactor } : { [itemId]: 1 }
      }

  // Check which items have direct stage drops
  const directlyDroppedItems = new Set<string>()
  for (const stage of candidateStages) {
    for (const drop of stage.drops) {
      if (drop.dropRate > 0) {
        directlyDroppedItems.add(drop.itemId)
      }
    }
  }

  // Decide whether a demanded item should be decomposed to its base ingredients:
  // Decompose if item is an EXP card ('2001'–'2004') OR if allowCrafting is true AND either:
  // (a) one of its base ingredients is also in positiveDeficit, or
  // (b) no candidate stage drops the item directly (e.g. T4/T5 crafted items).
  const baseDeficitMap = new Map<string, number>()
  const itemToBaseKeys = new Map<string, string[]>()

  for (const [itemId, count] of Object.entries(positiveDeficit)) {
    const fullEq = fullEquivFn(itemId)
    const baseKeys = Object.keys(fullEq)
    const isComposite = baseKeys.length > 1 || baseKeys[0] !== itemId
    const hasBaseInDeficit =
      isComposite && baseKeys.some((k) => k !== itemId && positiveDeficit[k] !== undefined)
    const isExpCard = EXP_CARD_EQUIV_TO_2001[itemId] !== undefined
    const shouldDecomposeDemand =
      isExpCard ||
      (allowCrafting && isComposite && (hasBaseInDeficit || !directlyDroppedItems.has(itemId)))

    const eq = shouldDecomposeDemand ? fullEq : { [itemId]: 1 }
    const keys: string[] = []
    for (const [baseId, factor] of Object.entries(eq)) {
      if (factor > 0) {
        baseDeficitMap.set(baseId, (baseDeficitMap.get(baseId) ?? 0) + count * factor)
        keys.push(baseId)
      }
    }
    itemToBaseKeys.set(itemId, keys)
  }

  // Resolve how any stage drop itemId decomposes into keys present in baseDeficitMap
  const dropEquivMemo = new Map<string, Record<string, number>>()
  function getEquiv(itemId: string, visited = new Set<string>()): Record<string, number> {
    const expFactor = EXP_CARD_EQUIV_TO_2001[itemId]
    if (expFactor !== undefined && baseDeficitMap.has(EXP_CARD_BASE_ID)) {
      return { [EXP_CARD_BASE_ID]: expFactor }
    }
    if (!allowCrafting) {
      return { [itemId]: 1 }
    }
    const cached = dropEquivMemo.get(itemId)
    if (cached) return cached

    if (baseDeficitMap.has(itemId)) {
      const direct = { [itemId]: 1 }
      dropEquivMemo.set(itemId, direct)
      return direct
    }

    const recipe = recipeByResult.get(itemId)
    if (!recipe || visited.has(itemId)) {
      const selfEq = { [itemId]: 1 }
      dropEquivMemo.set(itemId, selfEq)
      return selfEq
    }

    const nextVisited = new Set(visited)
    nextVisited.add(itemId)
    const resultCount = recipe.resultCount > 0 ? recipe.resultCount : 1
    const eq: Record<string, number> = {}
    for (const ing of recipe.ingredients) {
      const sub = getEquiv(ing.id, nextVisited)
      for (const [baseId, factor] of Object.entries(sub)) {
        eq[baseId] = (eq[baseId] ?? 0) + (ing.count / resultCount) * factor
      }
    }
    dropEquivMemo.set(itemId, eq)
    return eq
  }

  // 4. Identify coverable vs uncovered base items
  const allBaseKeys = Array.from(baseDeficitMap.keys()).sort()
  const coverableBaseKeys: string[] = []
  const uncoveredBaseKeySet = new Set<string>()

  const hasDedicatedLsStage = candidateStages.some(
    (s) => s.stageId.startsWith('wk_kc_') || s.code.startsWith('LS-'),
  )

  // Precompute stage -> baseId yield per run
  const stageBaseYields = candidateStages.map((stage) => {
    const yields: Record<string, number> = {}
    const isLsStage = stage.stageId.startsWith('wk_kc_') || stage.code.startsWith('LS-')
    for (const drop of stage.drops) {
      if (drop.dropRate <= 0) continue
      if (hasDedicatedLsStage && !isLsStage && EXP_CARD_EQUIV_TO_2001[drop.itemId] !== undefined) {
        continue
      }
      const eq = getEquiv(drop.itemId)
      for (const [baseId, factor] of Object.entries(eq)) {
        if (baseDeficitMap.has(baseId) && factor > 0) {
          yields[baseId] = (yields[baseId] ?? 0) + drop.dropRate * factor
        }
      }
    }
    return yields
  })

  for (const baseId of allBaseKeys) {
    const hasStage = stageBaseYields.some((y) => (y[baseId] ?? 0) > 0)
    if (hasStage) {
      coverableBaseKeys.push(baseId)
    } else {
      uncoveredBaseKeySet.add(baseId)
    }
  }

  // Determine uncovered original items
  const uncoveredItems: Array<{ itemId: string; remainingQuantity: number }> = []
  for (const [itemId, count] of Object.entries(positiveDeficit)) {
    const keys = itemToBaseKeys.get(itemId) ?? [itemId]
    if (keys.some((k) => uncoveredBaseKeySet.has(k))) {
      uncoveredItems.push({
        itemId,
        remainingQuantity: count,
      })
    }
  }

  if (coverableBaseKeys.length === 0) {
    return {
      stages: [],
      totalRuns: 0,
      totalSanity: 0,
      naturalRegenDays: 0,
      originitePrimeCost: 0,
      uncoveredItems,
    }
  }

  // Filter candidate stages to those that yield at least one coverable base item
  const activeStageIndices: number[] = []
  for (let j = 0; j < candidateStages.length; j++) {
    const y = stageBaseYields[j]!
    if (coverableBaseKeys.some((k) => (y[k] ?? 0) > 0)) {
      activeStageIndices.push(j)
    }
  }

  const m = coverableBaseKeys.length
  const n = activeStageIndices.length
  const costs = activeStageIndices.map((j) => candidateStages[j]!.apCost)
  const rhsB = coverableBaseKeys.map((k) => baseDeficitMap.get(k) ?? 0)
  const matrixA: number[][] = coverableBaseKeys.map((k) =>
    activeStageIndices.map((j) => stageBaseYields[j]![k] ?? 0),
  )

  // 5. Solve continuous LP relaxation via Dual Simplex
  const xCont = solveContinuousLpDualSimplex(costs, matrixA, rhsB)

  // 6. Convert continuous runs to integer runs:
  // Start from floor(xCont), then greedily add runs for remaining fractional deficit, then prune any redundant runs.
  const intRuns = xCont.map((val) => (val > EPS ? Math.floor(val + 1e-9) : 0))

  const remDeficit = rhsB.map((b, i) => {
    let covered = 0
    for (let j = 0; j < n; j++) {
      if (intRuns[j]! > 0) {
        covered += matrixA[i]![j]! * intRuns[j]!
      }
    }
    return Math.max(0, b - covered)
  })

  // Greedy integer residual completion (prioritize LP-selected basis stages first)
  let guard = 0
  while (guard++ < 10000) {
    let maxRem = 0
    for (let i = 0; i < m; i++) {
      if (remDeficit[i]! > maxRem) {
        maxRem = remDeficit[i]!
      }
    }
    if (maxRem <= EPS) break

    let bestCol = -1
    let bestScore = -1

    for (const basisOnly of [true, false]) {
      for (let j = 0; j < n; j++) {
        if (basisOnly && xCont[j]! <= EPS) continue
        let usefulYield = 0
        for (let i = 0; i < m; i++) {
          const rem = remDeficit[i]!
          if (rem > EPS) {
            const a = matrixA[i]![j]!
            if (a > 0) {
              usefulYield += Math.min(rem, a)
            }
          }
        }
        if (usefulYield <= 0) continue
        const score = usefulYield / costs[j]!
        if (score > bestScore + 1e-11) {
          bestScore = score
          bestCol = j
        }
      }
      if (bestCol !== -1) break
    }

    if (bestCol === -1) break

    intRuns[bestCol] = intRuns[bestCol]! + 1
    for (let i = 0; i < m; i++) {
      remDeficit[i] = Math.max(0, remDeficit[i]! - matrixA[i]![bestCol]!)
    }
  }

  // Redundancy pruning (most expensive stage first) to ensure minimal integer plan
  const activeCols = Array.from({ length: n }, (_, j) => j)
    .filter((j) => intRuns[j]! > 0)
    .sort((a, b) => costs[b]! - costs[a]! || a - b)

  const totalCovered = new Array<number>(m).fill(0)
  for (let i = 0; i < m; i++) {
    let sum = 0
    for (const j of activeCols) {
      sum += matrixA[i]![j]! * intRuns[j]!
    }
    totalCovered[i] = sum
  }

  for (const j of activeCols) {
    while (intRuns[j]! > 0) {
      let canDecrement = true
      for (let i = 0; i < m; i++) {
        const a = matrixA[i]![j]!
        if (a > 0 && totalCovered[i]! - a < rhsB[i]! - EPS) {
          canDecrement = false
          break
        }
      }
      if (!canDecrement) break
      intRuns[j] = intRuns[j]! - 1
      for (let i = 0; i < m; i++) {
        totalCovered[i] = totalCovered[i]! - matrixA[i]![j]!
      }
    }
  }

  // 7. Build output stage plans and contributions
  const stagePlans: FarmingStagePlan[] = []
  let totalRuns = 0
  let totalSanity = 0

  for (let j = 0; j < n; j++) {
    const runs = intRuns[j]!
    if (runs <= 0) continue

    const stage = candidateStages[activeStageIndices[j]!]!
    const sanity = runs * stage.apCost
    totalRuns += runs
    totalSanity += sanity

    // Identify primary contributing drop and meaningful drop contributions
    const contributingDrops: Array<{
      itemId: string
      dropRate: number
      baseValuePerRun: number
      targetQty: number
    }> = []

    const isLsStage = stage.stageId.startsWith('wk_kc_') || stage.code.startsWith('LS-')
    for (const drop of stage.drops) {
      if (drop.dropRate <= 0) continue
      if (hasDedicatedLsStage && !isLsStage && EXP_CARD_EQUIV_TO_2001[drop.itemId] !== undefined) {
        continue
      }
      const eq = getEquiv(drop.itemId)
      let baseValuePerRun = 0
      let equivTarget = 0

      for (const [baseId, factor] of Object.entries(eq)) {
        const neededBase = baseDeficitMap.get(baseId) ?? 0
        if (neededBase > 0 && factor > 0) {
          baseValuePerRun += drop.dropRate * factor
          equivTarget += neededBase / factor
        }
      }

      if (baseValuePerRun > 0) {
        const directTarget = positiveDeficit[drop.itemId]
        contributingDrops.push({
          itemId: drop.itemId,
          dropRate: drop.dropRate,
          baseValuePerRun,
          targetQty:
            directTarget !== undefined && directTarget > 0 ? directTarget : Math.ceil(equivTarget),
        })
      }
    }

    contributingDrops.sort(
      (a, b) => b.baseValuePerRun - a.baseValuePerRun || b.dropRate - a.dropRate,
    )

    const primaryItemId = contributingDrops[0]?.itemId

    const contributions: FarmedItemContribution[] = []
    for (const cd of contributingDrops) {
      // Include primary drop, direct deficit drops, or drops with >= 15% rate per run
      const isDirectDeficit = (positiveDeficit[cd.itemId] ?? 0) > 0
      if (cd.itemId === primaryItemId || cd.dropRate >= 0.15 || isDirectDeficit) {
        contributions.push({
          itemId: cd.itemId,
          expectedQuantity: Math.round(runs * cd.dropRate * 10) / 10,
          targetQuantity: cd.targetQty,
          dropRate: cd.dropRate,
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

  // Sort plans: highest sanity cost first, then stageId
  stagePlans.sort((a, b) => b.sanity - a.sanity || a.stageId.localeCompare(b.stageId))

  // 8. Equivalents
  const naturalRegenPerDay = (24 * 60) / regenMinutes // 240 by default
  const naturalRegenDays = Math.round((totalSanity / naturalRegenPerDay) * 10) / 10
  const originitePrimeCost = Math.ceil(totalSanity / maxSanity)

  return {
    stages: stagePlans,
    totalRuns,
    totalSanity,
    naturalRegenDays,
    originitePrimeCost,
    uncoveredItems,
  }
}
