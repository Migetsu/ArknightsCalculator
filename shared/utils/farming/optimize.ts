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

/** Workshop synthesis steps used by the crafting model (conversions are excluded). */
interface CraftStep {
  resultId: string
  resultCount: number
  ingredients: ReadonlyArray<{ id: string; count: number }>
}

function buildCraftSteps(recipes: readonly CraftRecipe[]): Map<string, CraftStep> {
  const steps = new Map<string, CraftStep>()
  for (const recipe of recipes) {
    if (recipe.kind !== 'synthesis') continue
    if (recipe.resultId === '3401') continue
    if (recipe.resultId.startsWith('311') || recipe.resultId.startsWith('313')) continue
    if (recipe.ingredients.length === 0 || steps.has(recipe.resultId)) continue
    steps.set(recipe.resultId, {
      resultId: recipe.resultId,
      resultCount: recipe.resultCount > 0 ? recipe.resultCount : 1,
      ingredients: recipe.ingredients,
    })
  }
  return steps
}

/**
 * Normalizes the incoming demand to item ids the optimizer works with. EXP cards
 * (`2001`–`2004`) are folded into the `2001` EXP unit because the game lets the
 * player feed any card; every other item maps to itself.
 */
function normalizeDemand(rawDemand: Record<string, number>): Record<string, number> {
  const demand: Record<string, number> = {}
  for (const [itemId, count] of Object.entries(rawDemand)) {
    if (!(count > 0)) continue
    const expFactor = EXP_CARD_EQUIV_TO_2001[itemId]
    if (expFactor !== undefined) {
      demand[EXP_CARD_BASE_ID] = (demand[EXP_CARD_BASE_ID] ?? 0) + count * expFactor
    } else {
      demand[itemId] = (demand[itemId] ?? 0) + count
    }
  }
  return demand
}

/** All items that can take part in crafting: the demand plus its ingredient closure. */
function collectCraftUniverse(
  demand: Readonly<Record<string, number>>,
  steps: Map<string, CraftStep>,
): Set<string> {
  const universe = new Set<string>()
  const queue = Object.keys(demand)
  while (queue.length > 0) {
    const id = queue.pop()!
    if (universe.has(id)) continue
    universe.add(id)
    const step = steps.get(id)
    if (step) for (const ingredient of step.ingredients) queue.push(ingredient.id)
  }
  return universe
}

/**
 * Topological order with products before their ingredients (Kahn's algorithm over
 * the "recipe -> ingredient" edges). Recipes form a DAG once chip and furniture
 * conversions are excluded, so one pass can craft every intermediate.
 */
function orderForCrafting(universe: ReadonlySet<string>, steps: Map<string, CraftStep>): string[] {
  const indegree = new Map<string, number>()
  for (const id of universe) indegree.set(id, 0)
  for (const id of universe) {
    const step = steps.get(id)
    if (!step) continue
    for (const ingredient of step.ingredients) {
      if (!universe.has(ingredient.id)) continue
      indegree.set(ingredient.id, (indegree.get(ingredient.id) ?? 0) + 1)
    }
  }

  const order: string[] = []
  const queue = Array.from(universe)
    .filter((id) => (indegree.get(id) ?? 0) === 0)
    .sort()
  while (queue.length > 0) {
    const id = queue.shift()!
    order.push(id)
    const step = steps.get(id)
    if (!step) continue
    for (const ingredient of step.ingredients) {
      if (!universe.has(ingredient.id)) continue
      const next = (indegree.get(ingredient.id) ?? 0) - 1
      indegree.set(ingredient.id, next)
      if (next === 0) queue.push(ingredient.id)
    }
  }
  return order
}

interface CraftEvaluation {
  /** Items the plan cannot provide, with the missing amount (base materials). */
  missing: Record<string, number>
  /** Every amount the plan has to provide: the demand plus crafted ingredients. */
  required: Record<string, number>
}

/**
 * Top-down feasibility pass: given expected drops, craft ingredients upward and
 * report what is still missing. Drops only ever satisfy their own tier — a Sugar
 * Pack can never become a Sugar Substitute, because the game has no downward
 * crafting.
 */
function evaluateCrafting(
  demand: Readonly<Record<string, number>>,
  drops: Readonly<Record<string, number>>,
  order: readonly string[],
  steps: Map<string, CraftStep>,
): CraftEvaluation {
  const pending = new Map<string, number>()
  const required: Record<string, number> = {}
  for (const [id, count] of Object.entries(demand)) {
    pending.set(id, (pending.get(id) ?? 0) + count)
    required[id] = (required[id] ?? 0) + count
  }
  const available = new Map<string, number>(Object.entries(drops))

  const missing: Record<string, number> = {}
  for (const id of order) {
    const need = pending.get(id) ?? 0
    if (need <= 0) continue
    const fromDrops = Math.min(need, available.get(id) ?? 0)
    available.set(id, (available.get(id) ?? 0) - fromDrops)
    const remaining = need - fromDrops
    if (remaining <= 1e-9) continue

    const step = steps.get(id)
    if (!step) {
      missing[id] = (missing[id] ?? 0) + remaining
      continue
    }

    const crafts = Math.ceil(remaining / step.resultCount - 1e-9)
    for (const ingredient of step.ingredients) {
      const amount = crafts * ingredient.count
      pending.set(ingredient.id, (pending.get(ingredient.id) ?? 0) + amount)
      required[ingredient.id] = (required[ingredient.id] ?? 0) + amount
    }
  }
  return { missing, required }
}

/**
 * Optimizes sanity farming to satisfy the item demand.
 *
 * The model is a linear program whose variables are stage runs and Workshop
 * crafts: every stage contributes its expected drops, every craft consumes its
 * ingredients and produces its result, and the objective minimizes total sanity.
 * Crafting therefore only ever substitutes material *upward*, which matches the
 * game. (An earlier model mapped higher-tier drops down to base materials, so it
 * credited a Sugar Pack as 12 Sugar Substitutes and produced plans that could not
 * be executed.)
 *
 * Pure calculation logic (no Vue, no network, deterministic).
 */
export function optimizeFarming(
  rawDemand: Record<string, number>,
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
  const recipes = options.recipes ?? defaultRecipes

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

  let demand = normalizeDemand(rawDemand)
  if (Object.keys(demand).length === 0) {
    return {
      stages: [],
      totalRuns: 0,
      totalSanity: 0,
      naturalRegenDays: 0,
      originitePrimeCost: 0,
      uncoveredItems: [],
    }
  }

  // 1. Filter open & server-valid candidate stages
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

  const hasDedicatedLsStage = candidateStages.some(
    (stage) => stage.stageId.startsWith('wk_kc_') || stage.code.startsWith('LS-'),
  )

  /**
   * Expected yield per run, keyed by the item ids the optimizer reasons about,
   * plus the raw drops used for the UI contributions.
   * EXP cards are folded into the `2001` unit; cards from non-LS stages are
   * ignored while a dedicated EXP stage is available.
   */
  const stageYields: Array<{
    stage: PenguinStageMatrix
    rates: Record<string, number>
    drops: Array<{ itemId: string; dropRate: number; expUnits: number }>
  }> = candidateStages.map((stage) => {
    const isLsStage = stage.stageId.startsWith('wk_kc_') || stage.code.startsWith('LS-')
    const rates: Record<string, number> = {}
    const drops: Array<{ itemId: string; dropRate: number; expUnits: number }> = []
    for (const drop of stage.drops) {
      if (drop.dropRate <= 0) continue
      const expFactor = EXP_CARD_EQUIV_TO_2001[drop.itemId]
      if (expFactor !== undefined) {
        if (hasDedicatedLsStage && !isLsStage) continue
        rates[EXP_CARD_BASE_ID] = (rates[EXP_CARD_BASE_ID] ?? 0) + drop.dropRate * expFactor
        drops.push({ itemId: drop.itemId, dropRate: drop.dropRate, expUnits: expFactor })
        continue
      }
      rates[drop.itemId] = (rates[drop.itemId] ?? 0) + drop.dropRate
      drops.push({ itemId: drop.itemId, dropRate: drop.dropRate, expUnits: 1 })
    }
    return { stage, rates, drops }
  })

  // 2. Material crafting model: recipes that build materials upward
  const steps = allowCrafting ? buildCraftSteps(recipes) : new Map<string, CraftStep>()

  const droppedItems = new Set<string>()
  for (const { rates } of stageYields) {
    for (const [itemId, rate] of Object.entries(rates)) {
      if (rate > 0) droppedItems.add(itemId)
    }
  }

  const coverableMemo = new Map<string, boolean>()
  function isCoverable(itemId: string, visiting: Set<string> = new Set()): boolean {
    const memo = coverableMemo.get(itemId)
    if (memo !== undefined) return memo
    if (droppedItems.has(itemId)) {
      coverableMemo.set(itemId, true)
      return true
    }
    if (visiting.has(itemId)) return false
    const step = steps.get(itemId)
    if (!step) {
      coverableMemo.set(itemId, false)
      return false
    }
    visiting.add(itemId)
    const result = step.ingredients.every((ingredient) => isCoverable(ingredient.id, visiting))
    visiting.delete(itemId)
    coverableMemo.set(itemId, result)
    return result
  }

  const uncoveredItems: Array<{ itemId: string; remainingQuantity: number }> = []
  const coverableDemand: Record<string, number> = {}
  for (const [itemId, amount] of Object.entries(demand)) {
    if (!isCoverable(itemId)) {
      uncoveredItems.push({ itemId, remainingQuantity: amount })
      continue
    }
    coverableDemand[itemId] = amount
  }
  demand = coverableDemand
  if (Object.keys(demand).length === 0) {
    return {
      stages: [],
      totalRuns: 0,
      totalSanity: 0,
      naturalRegenDays: 0,
      originitePrimeCost: 0,
      uncoveredItems,
    }
  }

  const activeUniverse = collectCraftUniverse(demand, steps)
  const order = orderForCrafting(activeUniverse, steps)

  // 3. Build the linear program: rows = items, columns = stage runs + crafts
  const rowIds = order.slice().sort()
  const rowIndex = new Map<string, number>()
  rowIds.forEach((id, index) => rowIndex.set(id, index))
  const rhsB = rowIds.map((id) => demand[id] ?? 0)

  const stageColumns: Array<{
    stage: PenguinStageMatrix
    rates: Record<string, number>
    drops: Array<{ itemId: string; dropRate: number; expUnits: number }>
  }> = []
  for (const entry of stageYields) {
    if (rowIds.some((id) => (entry.rates[id] ?? 0) > 0)) stageColumns.push(entry)
  }

  const craftColumns: CraftStep[] = []
  if (allowCrafting) {
    for (const id of rowIds) {
      const step = steps.get(id)
      if (!step) continue
      if (step.ingredients.some((ingredient) => !rowIndex.has(ingredient.id))) continue
      craftColumns.push(step)
    }
  }

  const costs = [...stageColumns.map((entry) => entry.stage.apCost), ...craftColumns.map(() => 0)]
  const matrixA: number[][] = rowIds.map(() => new Array(costs.length).fill(0))

  stageColumns.forEach((entry, col) => {
    for (const [itemId, rate] of Object.entries(entry.rates)) {
      const row = rowIndex.get(itemId)
      if (row === undefined || rate <= 0) continue
      matrixA[row]![col] = rate
    }
  })
  const craftOffset = stageColumns.length
  craftColumns.forEach((step, index) => {
    const col = craftOffset + index
    const resultRow = rowIndex.get(step.resultId)
    if (resultRow !== undefined) matrixA[resultRow]![col] = step.resultCount
    for (const ingredient of step.ingredients) {
      const row = rowIndex.get(ingredient.id)
      if (row === undefined) continue
      matrixA[row]![col] = (matrixA[row]![col] ?? 0) - ingredient.count
    }
  })

  // 4. Solve the continuous relaxation, then round to integer runs
  const xCont = solveContinuousLpDualSimplex(costs, matrixA, rhsB)
  const runs = xCont.map((value, index) =>
    index < craftOffset && value > EPS ? Math.floor(value + 1e-9) : 0,
  )

  const ratesByColumn = stageColumns.map((entry) => entry.rates)

  function expectedDrops(runsForStages: readonly number[]): Record<string, number> {
    const drops: Record<string, number> = {}
    for (let col = 0; col < ratesByColumn.length; col++) {
      const count = runsForStages[col]!
      if (count <= 0) continue
      for (const [itemId, rate] of Object.entries(ratesByColumn[col]!)) {
        if (rate > 0) drops[itemId] = (drops[itemId] ?? 0) + rate * count
      }
    }
    return drops
  }

  function missingFor(runsForStages: readonly number[]): Record<string, number> {
    return evaluateCrafting(demand, expectedDrops(runsForStages), order, steps).missing
  }

  // Greedy integer completion: cover whatever the floored solution still lacks by
  // adding runs of the cheapest stage that drops the missing item directly.
  for (let iteration = 0; iteration < 200; iteration++) {
    const missing = missingFor(runs)
    const entries = Object.entries(missing).filter(([, count]) => count > 1e-6)
    if (entries.length === 0) break
    entries.sort((a, b) => b[1] - a[1])
    const [itemId, amount] = entries[0]!

    let bestCol = -1
    let bestScore = Number.POSITIVE_INFINITY
    for (let col = 0; col < stageColumns.length; col++) {
      const rate = ratesByColumn[col]![itemId] ?? 0
      if (rate <= 0) continue
      const score = stageColumns[col]!.stage.apCost / rate
      if (score < bestScore - 1e-12) {
        bestScore = score
        bestCol = col
      }
    }
    if (bestCol < 0) break
    const bestRate = ratesByColumn[bestCol]![itemId]!
    runs[bestCol] = (runs[bestCol] ?? 0) + Math.max(1, Math.ceil(amount / bestRate))
  }

  // 5. Redundancy pruning: drop runs while the demand stays covered
  const pruneOrder = runs
    .map((count, col) => ({ col, count }))
    .filter((entry) => entry.count > 0)
    .sort(
      (a, b) =>
        (stageColumns[b.col]!.stage.apCost ?? 0) - (stageColumns[a.col]!.stage.apCost ?? 0) ||
        a.col - b.col,
    )
  for (const { col } of pruneOrder) {
    while ((runs[col] ?? 0) > 0) {
      runs[col] = runs[col]! - 1
      if (Object.keys(missingFor(runs)).length > 0) {
        runs[col] = runs[col]! + 1
        break
      }
    }
  }

  // 6. Build the plan
  const evaluation = evaluateCrafting(demand, expectedDrops(runs), order, steps)
  const required = evaluation.required

  const stagePlans: FarmingStagePlan[] = []
  let totalRuns = 0
  let totalSanity = 0

  for (let col = 0; col < stageColumns.length; col++) {
    const count = runs[col] ?? 0
    if (count <= 0) continue
    const entry = stageColumns[col]!
    const stage = entry.stage
    const sanity = count * stage.apCost
    totalRuns += count
    totalSanity += sanity

    const contributingDrops: Array<{
      itemId: string
      dropRate: number
      targetQty: number
    }> = []
    for (const drop of entry.drops) {
      if (drop.dropRate <= 0) continue
      const normalizedId = drop.expUnits > 1 ? EXP_CARD_BASE_ID : drop.itemId
      const needed = (required[normalizedId] ?? 0) > 0 || (rawDemand[drop.itemId] ?? 0) > 0
      if (!needed) continue
      contributingDrops.push({
        itemId: drop.itemId,
        dropRate: drop.dropRate,
        targetQty: Math.ceil(rawDemand[drop.itemId] ?? required[normalizedId] ?? 0),
      })
    }
    contributingDrops.sort((a, b) => b.dropRate - a.dropRate)

    const primaryItemId = contributingDrops[0]?.itemId
    const contributions: FarmedItemContribution[] = contributingDrops.map((drop) => ({
      itemId: drop.itemId,
      expectedQuantity: Math.round(count * drop.dropRate * 10) / 10,
      targetQuantity: drop.targetQty,
      dropRate: drop.dropRate,
    }))

    stagePlans.push({
      stageId: stage.stageId,
      code: stage.code,
      apCost: stage.apCost,
      runs: count,
      sanity,
      contributions,
      primaryItemId,
    })
  }

  stagePlans.sort((a, b) => b.sanity - a.sanity || a.stageId.localeCompare(b.stageId))

  const naturalRegenPerDay = (24 * 60) / regenMinutes
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
