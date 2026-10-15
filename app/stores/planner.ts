import { ref, computed, shallowRef } from 'vue'
import { defineStore } from 'pinia'
import {
  CURRENT_PLANNER_SCHEMA_VERSION,
  createDefaultPlannerData,
  migratePlannerData,
  validatePlannerImport,
  type PlanItem,
  type PlannerData,
} from '~/schemas/planner'
import type { OperatorDetail } from '~/../shared/schemas/operator'
import type { GameConstants } from '~/../shared/schemas/gameConstants'
import type { CraftRecipe } from '~/../shared/schemas/recipe'
import type {
  CalculatedCost,
  OperatorState,
  RoadmapPlan,
  RoadmapStep,
} from '~/../shared/utils/planner/types'
import { calculateCost } from '~/../shared/utils/planner/calculateCost'
import { calculateRoadmap } from '~/../shared/utils/planner/calculateRoadmap'
import { planExpCards } from '~/../shared/utils/planner/planExpCards'
import { resolveDemand } from '~/../shared/utils/workshop/resolveDemand'
import { encodeShareCode, decodeShareCode } from '~/../shared/utils/planner/shareCode'
import { getPlannerModules } from '~/../shared/utils/planner/modules'
import { fetchOperatorDetail } from '~/composables/useOperatorDetail'
import { useDepotStore } from '~/stores/depot'
import { createDefaultStorageAdapter, type StorageAdapter } from '~/utils/storage'
import rawConstantsData from '~/../data/constants.json'
import rawRecipesData from '~/../data/recipes.json'

export const PLANNER_STORAGE_KEY = 'arkcalc_planner'
export const PLANNER_CORRUPTED_BACKUP_PREFIX = 'arkcalc_planner_corrupted_'

const constants = rawConstantsData as unknown as GameConstants
const recipes = rawRecipesData as unknown as CraftRecipe[]

export interface AggregatedPlannerDemand {
  lmd: number
  exp: number
  items: Array<{ id: string; count: number }>
}

export interface MaterialRow {
  id: string
  need: number
  have: number
  missing: number
  isCraftable?: boolean
}

export interface RoadmapHistoryEntry {
  planId: string
  stepId: string
  previousCurrent: OperatorState
  deductedLmd: number
  deductedItems: Array<{ id: string; count: number }>
}

export const usePlannerStore = defineStore('planner', () => {
  let adapter: StorageAdapter = createDefaultStorageAdapter()

  const plans = ref<PlanItem[]>([])
  const selectedPlanId = ref<string | null>(null)
  const includeCrafting = ref<boolean>(true)

  const status = ref<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const error = ref<string | null>(null)
  const isCorrupted = ref<boolean>(false)
  const corruptedBackupKey = ref<string | null>(null)
  const roadmapHistory = ref<RoadmapHistoryEntry[]>([])

  // In-memory cache for operator details to avoid repeated network/JSON chunks fetching
  const operatorDetailsCache = shallowRef<Map<string, OperatorDetail>>(new Map())

  // Memoization cache for plan cost calculations (key -> cost)
  const costMemoCache = new Map<string, { hash: string; cost: CalculatedCost }>()

  function setAdapter(customAdapter: StorageAdapter): void {
    adapter = customAdapter
  }

  function getAdapter(): StorageAdapter {
    return adapter
  }

  async function save(): Promise<void> {
    try {
      const payload: PlannerData = {
        schemaVersion: CURRENT_PLANNER_SCHEMA_VERSION,
        updatedAt: new Date().toISOString(),
        plans: JSON.parse(JSON.stringify(plans.value)),
      }
      await adapter.setItem(PLANNER_STORAGE_KEY, payload)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to save planner data'
    }
  }

  async function init(customAdapter?: StorageAdapter): Promise<void> {
    if (customAdapter) {
      adapter = customAdapter
    }
    status.value = 'loading'
    error.value = null

    try {
      const stored = await adapter.getItem<unknown>(PLANNER_STORAGE_KEY)
      if (stored === null || stored === undefined) {
        const initial = createDefaultPlannerData()
        plans.value = initial.plans
        await save()
        status.value = 'ready'
        return
      }

      const migration = migratePlannerData(stored)

      if (migration.corrupted) {
        const backupKey = `${PLANNER_CORRUPTED_BACKUP_PREFIX}${Date.now()}`
        await adapter.setItem(backupKey, stored)
        corruptedBackupKey.value = backupKey
        isCorrupted.value = true

        const fallback = createDefaultPlannerData()
        plans.value = fallback.plans
        await save()
        status.value = 'ready'
        return
      }

      plans.value = migration.data.plans

      // Select first plan by default if available and none selected
      if (plans.value.length > 0 && !selectedPlanId.value) {
        selectedPlanId.value = plans.value[0]?.id ?? null
      }

      // Preload operator details for saved plans
      for (const plan of plans.value) {
        void ensureOperatorDetail(plan.operatorId)
      }

      if (migration.migrated) {
        await save()
      }

      status.value = 'ready'
    } catch (err) {
      status.value = 'error'
      error.value = err instanceof Error ? err.message : 'Failed to initialize planner storage'
    }
  }

  async function ensureOperatorDetail(operatorId: string): Promise<OperatorDetail | null> {
    if (!operatorId) return null
    const existing = operatorDetailsCache.value.get(operatorId)
    if (existing) return existing

    const loaded = await fetchOperatorDetail(operatorId)
    if (loaded) {
      const nextMap = new Map(operatorDetailsCache.value)
      nextMap.set(operatorId, loaded)
      operatorDetailsCache.value = nextMap
    }
    return loaded
  }

  const selectedPlan = computed<PlanItem | null>(() => {
    if (!selectedPlanId.value) return null
    return plans.value.find((p) => p.id === selectedPlanId.value) ?? null
  })

  function selectPlan(id: string | null): void {
    selectedPlanId.value = id
    if (id) {
      const plan = plans.value.find((p) => p.id === id)
      if (plan) {
        void ensureOperatorDetail(plan.operatorId)
      }
    }
  }

  async function addPlan(
    operatorId: string,
    customCurrent?: Partial<OperatorState>,
    customTarget?: Partial<OperatorState>,
  ): Promise<PlanItem> {
    const detail = await ensureOperatorDetail(operatorId)
    const maxElite = detail ? Math.max(0, detail.phases.length - 1) : 2
    const maxLevel = detail?.phases[maxElite]?.maxLevel ?? 90

    const defaultSkills: Record<string, number> = {}
    if (detail?.skills) {
      for (const sk of detail.skills) {
        defaultSkills[sk.skillId] = 0
      }
    }

    const defaultModules: Record<string, number> = {}
    const targetModules: Record<string, number> = {}
    if (detail?.modules) {
      const plannerMods = getPlannerModules(detail.modules)
      for (const md of plannerMods) {
        defaultModules[md.id] = 0
        targetModules[md.id] = 0 // By default 0: user selects desired modules
      }
    }

    const current: OperatorState = {
      elite: 0,
      level: 1,
      skillLevel: 1,
      skills: { ...defaultSkills },
      modules: { ...defaultModules },
      ...customCurrent,
    }

    const targetSkills: Record<string, number> = {}
    if (detail?.skills) {
      for (const sk of detail.skills) {
        targetSkills[sk.skillId] = 3
      }
    }

    const target: OperatorState = {
      elite: maxElite,
      level: maxLevel,
      skillLevel: 7,
      skills: targetSkills,
      modules: targetModules,
      ...customTarget,
    }

    const newPlan: PlanItem = {
      id: `plan_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      operatorId,
      current,
      target,
      priority: plans.value.length + 1,
      note: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    plans.value.push(newPlan)
    selectedPlanId.value = newPlan.id
    await save()
    return newPlan
  }

  async function updatePlan(id: string, updates: Partial<PlanItem>): Promise<void> {
    const index = plans.value.findIndex((p) => p.id === id)
    if (index === -1) return

    const existing = plans.value[index]
    if (!existing) return

    plans.value[index] = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    }

    // Invalidate cost memoization cache for this plan
    costMemoCache.delete(id)
    await save()
  }

  async function removePlan(id: string): Promise<void> {
    plans.value = plans.value.filter((p) => p.id !== id)
    costMemoCache.delete(id)

    if (selectedPlanId.value === id) {
      selectedPlanId.value = plans.value[0]?.id ?? null
    }

    await save()
  }

  async function clearPlans(): Promise<void> {
    plans.value = []
    selectedPlanId.value = null
    costMemoCache.clear()
    await save()
  }

  async function setPlanTargetMax(planId: string): Promise<void> {
    const plan = plans.value.find((p) => p.id === planId)
    if (!plan) return

    const detail = await ensureOperatorDetail(plan.operatorId)
    if (!detail) return

    const maxElite = Math.max(0, detail.phases.length - 1)
    const maxLevel = detail.phases[maxElite]?.maxLevel ?? 90

    const maxSkills: Record<string, number> = {}
    for (const sk of detail.skills ?? []) {
      maxSkills[sk.skillId] = 3
    }

    const plannerMods = getPlannerModules(detail.modules ?? [])
    const maxModules: Record<string, number> = {}

    // Find modules explicitly selected by user (either current > 0 or target > 0)
    const selectedIds = plannerMods
      .map((m) => m.id)
      .filter((id) => (plan.target.modules[id] ?? 0) > 0 || (plan.current.modules[id] ?? 0) > 0)

    if (selectedIds.length > 0) {
      for (const m of plannerMods) {
        maxModules[m.id] = selectedIds.includes(m.id) ? 3 : 0
      }
    } else if (plannerMods.length > 0) {
      // None selected: pick the first main combat module
      const firstMain = plannerMods[0]
      if (firstMain) {
        maxModules[firstMain.id] = 3
      }
      for (let i = 1; i < plannerMods.length; i++) {
        const m = plannerMods[i]
        if (m) maxModules[m.id] = 0
      }
    }

    await updatePlan(planId, {
      target: {
        elite: maxElite,
        level: maxLevel,
        skillLevel: 7,
        skills: maxSkills,
        modules: maxModules,
      },
    })
  }

  async function setPlanNextGoal(planId: string): Promise<void> {
    const plan = plans.value.find((p) => p.id === planId)
    if (!plan) return

    const detail = await ensureOperatorDetail(plan.operatorId)
    if (!detail) return

    const maxElite = Math.max(0, detail.phases.length - 1)
    const currentPhase = detail.phases[plan.current.elite]
    const curMaxLevel = currentPhase?.maxLevel ?? 50

    const nextTarget: OperatorState = {
      elite: plan.target.elite,
      level: plan.target.level,
      skillLevel: plan.target.skillLevel,
      skills: { ...plan.target.skills },
      modules: { ...plan.target.modules },
    }

    // Progression step logic
    if (plan.current.elite < maxElite && plan.current.level < curMaxLevel) {
      // Step: max out current elite
      nextTarget.elite = plan.current.elite
      nextTarget.level = curMaxLevel
    } else if (plan.current.elite < maxElite) {
      // Step: promote to next elite
      nextTarget.elite = plan.current.elite + 1
      nextTarget.level = 1
    } else if (plan.current.level < curMaxLevel) {
      // Step: reach max level at max elite
      nextTarget.elite = maxElite
      nextTarget.level = curMaxLevel
    } else if (plan.target.skillLevel < 7) {
      // Step: skill level 7
      nextTarget.skillLevel = 7
    } else {
      // Step: find first skill below M3
      let advancedSkill = false
      for (const sk of detail.skills ?? []) {
        const curM = nextTarget.skills[sk.skillId] ?? 0
        if (curM < 3) {
          nextTarget.skills[sk.skillId] = curM + 1
          advancedSkill = true
          break
        }
      }

      // Step: if all skills maxed, find first module below Stage 3
      if (!advancedSkill) {
        const plannerMods = getPlannerModules(detail.modules ?? [])
        for (const md of plannerMods) {
          const curSt = nextTarget.modules[md.id] ?? 0
          if (curSt < 3) {
            nextTarget.modules[md.id] = curSt + 1
            break
          }
        }
      }
    }

    await updatePlan(planId, { target: nextTarget })
  }

  /**
   * Fast calculation with caching for a single plan.
   */
  function calculateSinglePlanCost(plan: PlanItem): CalculatedCost | null {
    const detail = operatorDetailsCache.value.get(plan.operatorId)
    if (!detail) return null

    const hash = `${plan.current.elite}-${plan.current.level}-${plan.current.skillLevel}-${JSON.stringify(
      plan.current.skills,
    )}-${JSON.stringify(plan.current.modules)}->${plan.target.elite}-${plan.target.level}-${
      plan.target.skillLevel
    }-${JSON.stringify(plan.target.skills)}-${JSON.stringify(plan.target.modules)}`

    const cached = costMemoCache.get(plan.id)
    if (cached && cached.hash === hash) {
      return cached.cost
    }

    try {
      const cost = calculateCost(detail, plan.current, plan.target, constants)
      costMemoCache.set(plan.id, { hash, cost })
      return cost
    } catch {
      return null
    }
  }

  /**
   * Total aggregated materials, LMD, and EXP needed across all plans.
   */
  const aggregatedDemand = computed<AggregatedPlannerDemand>(() => {
    let totalLmd = 0
    let totalExp = 0
    const itemsMap = new Map<string, number>()

    for (const plan of plans.value) {
      const cost = calculateSinglePlanCost(plan)
      if (!cost) continue

      totalLmd += cost.lmd
      totalExp += cost.exp

      for (const it of cost.items) {
        itemsMap.set(it.id, (itemsMap.get(it.id) ?? 0) + it.count)
      }
    }

    const items = Array.from(itemsMap.entries()).map(([id, count]) => ({ id, count }))
    return { lmd: totalLmd, exp: totalExp, items }
  })

  /**
   * Set of all item IDs currently required across all active plans.
   */
  const planRequiredItemIds = computed<Set<string>>(() => {
    return new Set(aggregatedDemand.value.items.map((i) => i.id))
  })

  /**
   * Workshop resolution for active aggregated demand.
   */
  const workshopResolution = computed(() => {
    const depotStore = useDepotStore()
    const demand = aggregatedDemand.value.items
    return resolveDemand(demand, depotStore.items, {
      recipes,
      useStock: true,
    })
  })

  /**
   * List of crafts to run in the Workshop.
   */
  const resolvedCrafts = computed(() => workshopResolution.value.crafts)

  /**
   * Raw materials required to be farmed after all possible crafts are executed.
   */
  const resolvedRawDeficit = computed<Array<{ id: string; count: number }>>(() => {
    return Object.entries(workshopResolution.value.rawDeficit)
      .filter(([_, count]) => count > 0)
      .map(([id, count]) => ({ id, count }))
  })

  /**
   * Total LMD required for workshop crafts.
   */
  const resolvedCraftLmdCost = computed(() => workshopResolution.value.lmdForCrafting)

  /**
   * Set of items that can be crafted in the workshop.
   */
  const craftableItemIds = computed<Set<string>>(() => {
    const set = new Set<string>()
    for (const r of recipes) {
      if (r.resultId) {
        set.add(r.resultId)
      }
    }
    return set
  })

  /**
   * Materials breakdown compared against depot inventory.
   * Under crafting included mode: shows direct Need, Have, Missing for THIS item before crafting,
   * along with isCraftable tag.
   */
  const materialRows = computed<MaterialRow[]>(() => {
    const depotStore = useDepotStore()
    const demand = aggregatedDemand.value.items

    return demand.map((it) => {
      const have = depotStore.getItemCount(it.id)
      const missing = Math.max(0, it.count - have)
      return {
        id: it.id,
        need: it.count,
        have,
        missing,
        isCraftable: craftableItemIds.value.has(it.id),
      }
    })
  })

  /**
   * Set of item IDs that have a positive deficit (>0).
   * In crafting mode: tracks raw materials that need farming.
   * In direct mode: tracks directly missing items.
   */
  const missingItemIds = computed<Set<string>>(() => {
    const set = new Set<string>()
    if (includeCrafting.value) {
      for (const item of resolvedRawDeficit.value) {
        set.add(item.id)
      }
    } else {
      for (const row of materialRows.value) {
        if (row.missing > 0) {
          set.add(row.id)
        }
      }
    }
    return set
  })

  /**
   * Total number of distinct missing item types (only raw deficit when crafting included).
   */
  const missingItemsCount = computed<number>(() => {
    if (includeCrafting.value) {
      return resolvedRawDeficit.value.length
    }
    return materialRows.value.filter((r) => r.missing > 0).length
  })

  /**
   * Recommended battle records (EXP cards) plan based on total EXP demand and depot inventory.
   */
  const plannedExpCards = computed(() => {
    const depotStore = useDepotStore()
    const stockMap: Record<string, number> = {}
    for (const card of constants.expItems) {
      stockMap[card.id] = depotStore.getItemCount(card.id)
    }

    return planExpCards(aggregatedDemand.value.exp, constants.expItems, {
      stock: stockMap,
      strategy: 'min_cards',
    })
  })

  /**
   * Benchmark utility for 30+ plans recalculation speed.
   */
  function benchmarkRecalculation(iterations = 10): { totalMs: number; avgMsPerRun: number } {
    const start = performance.now()
    for (let i = 0; i < iterations; i++) {
      // Clear memo to force recalculation
      costMemoCache.clear()
      for (const p of plans.value) {
        calculateSinglePlanCost(p)
      }
    }
    const end = performance.now()
    const totalMs = end - start
    return {
      totalMs,
      avgMsPerRun: totalMs / iterations,
    }
  }

  /**
   * Roadmap milestones and ordered steps for the currently selected operator plan.
   */
  const selectedPlanRoadmap = computed<RoadmapPlan | null>(() => {
    const plan = selectedPlan.value
    if (!plan) return null
    const detail = operatorDetailsCache.value.get(plan.operatorId)
    if (!detail) return null

    const depotStore = useDepotStore()
    const depotSnapshot = {
      items: depotStore.items,
      lmd: depotStore.currencies.lmd,
    }

    return calculateRoadmap(detail, plan.current, plan.target, constants, depotSnapshot)
  })

  /**
   * Applies a roadmap step by updating the plan current state to the step resulting state.
   * Optionally deducts materials and LMD from depot inventory (defaults to true).
   */
  async function applyRoadmapStep(
    planId: string,
    step: RoadmapStep,
    options: { deductStock?: boolean } = { deductStock: true },
  ): Promise<void> {
    const plan = plans.value.find((p) => p.id === planId)
    if (!plan) return

    const previousCurrent: OperatorState = JSON.parse(JSON.stringify(plan.current))
    let deductedLmd = 0
    const deductedItems: Array<{ id: string; count: number }> = []

    if (options.deductStock !== false) {
      const depotStore = useDepotStore()
      if (step.costs.lmd > 0) {
        deductedLmd = Math.min(depotStore.currencies.lmd, step.costs.lmd)
        if (deductedLmd > 0) {
          await depotStore.setCurrency('lmd', depotStore.currencies.lmd - deductedLmd)
        }
      }
      if (step.costs.items.length > 0) {
        for (const item of step.costs.items) {
          const curStock = depotStore.getItemCount(item.id)
          const toDeduct = Math.min(curStock, item.count)
          if (toDeduct > 0) {
            await depotStore.setItemCount(item.id, curStock - toDeduct)
            deductedItems.push({ id: item.id, count: toDeduct })
          }
        }
      }
    }

    roadmapHistory.value.push({
      planId,
      stepId: step.id,
      previousCurrent,
      deductedLmd,
      deductedItems,
    })

    await updatePlan(planId, {
      current: {
        elite: step.resultingState.elite,
        level: step.resultingState.level,
        skillLevel: step.resultingState.skillLevel,
        skills: { ...step.resultingState.skills },
        modules: { ...step.resultingState.modules },
      },
    })
  }

  /**
   * Reverts the most recent roadmap step applied to the specified plan,
   * restoring previous state and refunding deducted materials back to the depot.
   */
  async function undoRoadmapStep(planId: string): Promise<boolean> {
    const lastIndex = roadmapHistory.value.findLastIndex((h) => h.planId === planId)
    if (lastIndex === -1) return false

    const [entry] = roadmapHistory.value.splice(lastIndex, 1)
    if (!entry) return false

    const plan = plans.value.find((p) => p.id === planId)
    if (!plan) return false

    if (entry.deductedLmd > 0 || entry.deductedItems.length > 0) {
      const depotStore = useDepotStore()
      if (entry.deductedLmd > 0) {
        await depotStore.setCurrency('lmd', depotStore.currencies.lmd + entry.deductedLmd)
      }
      for (const item of entry.deductedItems) {
        const curStock = depotStore.getItemCount(item.id)
        await depotStore.setItemCount(item.id, curStock + item.count)
      }
    }

    await updatePlan(planId, {
      current: entry.previousCurrent,
    })
    return true
  }

  function canUndoRoadmapStep(planId: string): boolean {
    return roadmapHistory.value.some((h) => h.planId === planId)
  }

  function dismissCorruptionAlert(): void {
    isCorrupted.value = false
  }

  function exportJson(): string {
    const data: PlannerData = {
      schemaVersion: CURRENT_PLANNER_SCHEMA_VERSION,
      updatedAt: new Date().toISOString(),
      plans: plans.value,
    }
    return JSON.stringify(data, null, 2)
  }

  async function importPlans(
    incomingPlans: PlanItem[],
    mode: 'replace' | 'merge' = 'merge',
  ): Promise<void> {
    if (mode === 'replace') {
      plans.value = [...incomingPlans]
    } else {
      const existingIndexMap = new Map<string, number>()
      plans.value.forEach((p, idx) => {
        existingIndexMap.set(p.operatorId, idx)
      })

      const merged = [...plans.value]
      for (const inc of incomingPlans) {
        const idx = existingIndexMap.get(inc.operatorId)
        if (idx !== undefined) {
          merged[idx] = { ...inc }
        } else {
          merged.push({ ...inc })
          existingIndexMap.set(inc.operatorId, merged.length - 1)
        }
      }
      plans.value = merged
    }

    if (plans.value.length > 0 && !selectedPlanId.value) {
      selectedPlanId.value = plans.value[0]?.id ?? null
    }

    costMemoCache.clear()
    isCorrupted.value = false

    for (const plan of plans.value) {
      void ensureOperatorDetail(plan.operatorId)
    }

    await save()
  }

  async function importJson(
    jsonString: string,
    mode: 'replace' | 'merge' = 'merge',
  ): Promise<{ success: boolean; error?: string }> {
    const validated = validatePlannerImport(jsonString)
    if (!validated.success || !validated.data) {
      return { success: false, error: validated.error }
    }

    await importPlans(validated.data.plans, mode)
    return { success: true }
  }

  async function exportShareCode(selectedOnly = false): Promise<string> {
    const targetPlans = selectedOnly && selectedPlan.value ? [selectedPlan.value] : plans.value
    if (targetPlans.length === 0) {
      throw new Error('No plans available to export')
    }
    return await encodeShareCode({ plans: targetPlans })
  }

  async function importShareCode(
    code: string,
    mode: 'replace' | 'merge' = 'merge',
  ): Promise<{ success: boolean; error?: string }> {
    const decoded = await decodeShareCode(code)
    if (!decoded.success) {
      return { success: false, error: decoded.message }
    }

    await importPlans(decoded.payload.plans, mode)
    return { success: true }
  }

  return {
    plans,
    selectedPlanId,
    selectedPlan,
    includeCrafting,
    status,
    error,
    isCorrupted,
    corruptedBackupKey,
    operatorDetailsCache,
    setAdapter,
    getAdapter,
    init,
    ensureOperatorDetail,
    selectPlan,
    addPlan,
    updatePlan,
    removePlan,
    clearPlans,
    setPlanTargetMax,
    setPlanNextGoal,
    calculateSinglePlanCost,
    aggregatedDemand,
    planRequiredItemIds,
    materialRows,
    missingItemIds,
    missingItemsCount,
    plannedExpCards,
    workshopResolution,
    resolvedCrafts,
    resolvedRawDeficit,
    resolvedCraftLmdCost,
    craftableItemIds,
    selectedPlanRoadmap,
    applyRoadmapStep,
    undoRoadmapStep,
    canUndoRoadmapStep,
    roadmapHistory,
    benchmarkRecalculation,
    dismissCorruptionAlert,
    exportJson,
    importJson,
    importPlans,
    exportShareCode,
    importShareCode,
  }
})
