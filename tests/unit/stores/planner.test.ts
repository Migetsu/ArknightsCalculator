import { describe, it, expect, beforeEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { setActivePinia, createPinia } from 'pinia'
import {
  usePlannerStore,
  PLANNER_STORAGE_KEY,
  PLANNER_CORRUPTED_BACKUP_PREFIX,
} from '../../../app/stores/planner'
import { useDepotStore } from '../../../app/stores/depot'
import { MemoryStorageAdapter } from '../../../app/utils/storage'

describe('usePlannerStore', () => {
  let memoryAdapter: MemoryStorageAdapter
  let depotAdapter: MemoryStorageAdapter

  beforeEach(async () => {
    setActivePinia(createPinia())
    memoryAdapter = new MemoryStorageAdapter()
    depotAdapter = new MemoryStorageAdapter()

    const depot = useDepotStore()
    await depot.init(depotAdapter)
  })

  it('initializes with empty default values when storage is empty', async () => {
    const store = usePlannerStore()
    await store.init(memoryAdapter)

    expect(store.status).toBe('ready')
    expect(store.plans).toEqual([])
    expect(store.selectedPlanId).toBeNull()
    expect(store.isCorrupted).toBe(false)
  })

  it('adds an operator plan and selects it by default', async () => {
    const store = usePlannerStore()
    await store.init(memoryAdapter)

    const plan = await store.addPlan('char_102_texas')
    expect(plan.operatorId).toBe('char_102_texas')
    expect(store.plans.length).toBe(1)
    expect(store.selectedPlanId).toBe(plan.id)
    expect(store.selectedPlan).not.toBeNull()

    const stored = (await memoryAdapter.getItem(PLANNER_STORAGE_KEY)) as {
      plans: Array<{ operatorId: string }>
    }
    expect(stored.plans[0]?.operatorId).toBe('char_102_texas')
  })

  it('updates plan goals and resets memoized cost', async () => {
    const store = usePlannerStore()
    await store.init(memoryAdapter)

    const plan = await store.addPlan('char_102_texas')
    await store.updatePlan(plan.id, {
      current: { ...plan.current, elite: 1, level: 30 },
      target: { ...plan.target, elite: 2, level: 80 },
    })

    const updated = store.plans.find((p) => p.id === plan.id)
    expect(updated?.current.elite).toBe(1)
    expect(updated?.current.level).toBe(30)
    expect(updated?.target.elite).toBe(2)
    expect(updated?.target.level).toBe(80)
  })

  it('sets target max and next goal steps correctly', async () => {
    const store = usePlannerStore()
    await store.init(memoryAdapter)

    const plan = await store.addPlan('char_102_texas')
    await store.setPlanTargetMax(plan.id)

    let updated = store.plans.find((p) => p.id === plan.id)
    expect(updated?.target.elite).toBe(2)
    expect(updated?.target.level).toBe(80)
    expect(updated?.target.skillLevel).toBe(7)

    // Reset current to E0 L1 and test next goal step
    await store.updatePlan(plan.id, {
      current: { ...plan.current, elite: 0, level: 1 },
    })
    await store.setPlanNextGoal(plan.id)
    updated = store.plans.find((p) => p.id === plan.id)
    expect(updated?.target.elite).toBe(0)
    expect(updated?.target.level).toBe(50) // E0 max level for 5*
  })

  it('calculates aggregate materials, LMD, and EXP requirements', async () => {
    const store = usePlannerStore()
    await store.init(memoryAdapter)

    const plan = await store.addPlan('char_102_texas')
    await store.updatePlan(plan.id, {
      current: { ...plan.current, elite: 0, level: 1 },
      target: { ...plan.target, elite: 1, level: 50 },
    })

    const demand = store.aggregatedDemand
    expect(demand.lmd).toBeGreaterThan(0)
    expect(demand.exp).toBeGreaterThan(0)
    expect(demand.items.length).toBeGreaterThan(0)
  })

  it('calculates material deficit correctly with and without depot crafting', async () => {
    const store = usePlannerStore()
    await store.init(memoryAdapter)
    const depot = useDepotStore()

    const plan = await store.addPlan('char_102_texas')
    await store.updatePlan(plan.id, {
      current: { ...plan.current, elite: 0, level: 1 },
      target: { ...plan.target, elite: 1, level: 50 },
    })

    const initialRows = store.materialRows
    expect(initialRows.length).toBeGreaterThan(0)
    expect(store.missingItemsCount).toBeGreaterThan(0)

    // Fill depot with exact required items
    for (const row of initialRows) {
      await depot.setItemCount(row.id, row.need)
    }

    // Now missing should be 0
    expect(store.missingItemsCount).toBe(0)

    // Switch to direct deficit
    store.includeCrafting = false
    expect(store.missingItemsCount).toBe(0)
  })

  it('handles 35+ plans recalculation within performance budget (<100ms)', async () => {
    const store = usePlannerStore()
    await store.init(memoryAdapter)

    // Add 35 plans
    for (let i = 0; i < 35; i++) {
      await store.addPlan('char_102_texas')
    }
    expect(store.plans.length).toBe(35)

    const bench = store.benchmarkRecalculation(10)
    expect(bench.avgMsPerRun).toBeLessThan(100)
  })

  it('exports and imports planner JSON data', async () => {
    const store = usePlannerStore()
    await store.init(memoryAdapter)

    await store.addPlan('char_102_texas')
    const jsonStr = store.exportJson()
    expect(jsonStr).toContain('char_102_texas')

    await store.clearPlans()
    expect(store.plans.length).toBe(0)

    const importRes = await store.importJson(jsonStr)
    expect(importRes.success).toBe(true)
    expect(store.plans.length).toBe(1)
  })

  it('detects corrupted data and creates recovery backup', async () => {
    const store = usePlannerStore()
    await memoryAdapter.setItem(PLANNER_STORAGE_KEY, { invalid: 'corrupted' })

    await store.init(memoryAdapter)
    expect(store.isCorrupted).toBe(true)
    expect(store.plans.length).toBe(0)
    expect(store.corruptedBackupKey).toContain(PLANNER_CORRUPTED_BACKUP_PREFIX)
  })

  it('removes plan and adjusts selectedPlanId', async () => {
    const store = usePlannerStore()
    await store.init(memoryAdapter)

    const p1 = await store.addPlan('char_102_texas')
    const p2 = await store.addPlan('char_102_texas')
    expect(store.plans.length).toBe(2)

    await store.removePlan(p2.id)
    expect(store.plans.length).toBe(1)
    expect(store.selectedPlanId).toBe(p1.id)
  })

  it('calculates roadmap and applies step progression to plan', async () => {
    const store = usePlannerStore()
    await store.init(memoryAdapter)

    const silverAsh = JSON.parse(
      fs.readFileSync(path.resolve(process.cwd(), 'data/operators/char_172_svrash.json'), 'utf-8'),
    )
    store.operatorDetailsCache.set('char_172_svrash', silverAsh)

    const plan = await store.addPlan(
      'char_172_svrash',
      { elite: 0, level: 1, skillLevel: 1, skills: {}, modules: {} },
      { elite: 1, level: 50, skillLevel: 1, skills: {}, modules: {} },
    )

    expect(store.selectedPlanRoadmap).toBeDefined()
    expect(store.selectedPlanRoadmap?.steps.length).toBeGreaterThan(0)

    const step = store.selectedPlanRoadmap!.steps[0]!
    expect(step.kind).toBe('level')
    expect(step.resultingState.level).toBe(50)

    await store.applyRoadmapStep(plan.id, step)

    const updated = store.plans.find((p) => p.id === plan.id)
    expect(updated?.current.level).toBe(50)
  })
})
