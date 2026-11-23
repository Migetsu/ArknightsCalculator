import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { useFarmingStore } from '../../../app/stores/farming'
import { useSettingsStore } from '../../../app/stores/settings'
import { usePlannerStore } from '../../../app/stores/planner'
import { useDepotStore } from '../../../app/stores/depot'
import { readOperatorDataFixture } from '../support/operatorDataFixture'

const mockFetch = vi.hoisted(() => vi.fn())

mockNuxtImport('$fetch', () => mockFetch)

mockFetch.mockImplementation((url: string) => readOperatorDataFixture(url))

describe('useFarmingStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('initializes and detects current server day', async () => {
    const farming = useFarmingStore()
    await farming.init()

    expect(farming.status).toBe('ready')
    expect(farming.selectedDay).toBeGreaterThanOrEqual(1)
    expect(farming.selectedDay).toBeLessThanOrEqual(7)
    expect(farming.openSupplyGroups.length).toBeGreaterThan(0)
  })

  it('switches server snapshot when settings change', async () => {
    const settings = useSettingsStore()
    const farming = useFarmingStore()
    await farming.init()

    settings.setDropDataServer('cn')
    await farming.loadData('cn')
    expect(farming.activeServer).toBe('cn')
    expect(farming.activeSnapshot.server).toBe('CN')

    settings.setDropDataServer('global')
    expect(farming.activeServer).toBe('global')
    expect(farming.activeSnapshot.server).toBe('US')
  })

  it('runs optimization on custom or planner deficit', async () => {
    const farming = useFarmingStore()
    await farming.init()
    // Rock T2 (30012)
    farming.setCustomDeficit({ '30012': 10 })

    expect(farming.hasDeficit).toBe(true)
    const result = farming.optimizationResult
    expect(result.stages.length).toBeGreaterThan(0)
    expect(result.totalSanity).toBeGreaterThan(0)
  })

  it('allows selecting day of week for supply schedule', async () => {
    const farming = useFarmingStore()
    await farming.init()
    farming.setSelectedDay(3) // Wednesday
    expect(farming.selectedDay).toBe(3)
    const prefixes = farming.openSupplyGroups.map((g) => g.codePrefix).sort()
    expect(prefixes).toEqual(['CA', 'LS', 'PR-C', 'PR-D', 'SK'])
  })

  it('toggles allowCrafting: crafting builds higher-tier demand upward from cheap base stages', async () => {
    const settings = useSettingsStore()
    const farming = useFarmingStore()
    await farming.init()
    farming.setCustomDeficit({ '30013': 10 }) // 10 Orirock Clusters (T3)

    settings.setFarmingAllowCrafting(true)
    const withCrafting = farming.optimizationResult
    expect(withCrafting.stages.map((s) => s.code)).toContain('1-7')

    settings.setFarmingAllowCrafting(false)
    const withoutCrafting = farming.optimizationResult
    expect(withoutCrafting.totalSanity).toBeGreaterThan(withCrafting.totalSanity)
    expect(withoutCrafting.stages.map((s) => s.code)).not.toContain('1-7')
  })

  it('includes LMD (4001) and EXP (2001-2004) deficits from planner minus depot stock and recommends CE-6 and LS-6', async () => {
    const planner = usePlannerStore()
    const depot = useDepotStore()
    const settings = useSettingsStore()
    const farming = useFarmingStore()
    await farming.init()

    await planner.addPlan('char_003_kalts')
    settings.setFarmingAllowCrafting(true)

    // Default Kal'tsit plan (0 modules): 1,334,796 LMD + 225,900 craft LMD = 1,560,696 LMD; 1,111,400 EXP
    expect(farming.activeDeficit['4001']).toBe(1560696)
    const stageCodes = farming.optimizationResult.stages.map((s) => s.code)
    expect(stageCodes).toContain('CE-6')
    expect(stageCodes).toContain('LS-6')

    // Deduct depot LMD and EXP cards
    await depot.setCurrency('lmd', 560696)
    await depot.setItemCount('2004', 500) // 1,000,000 EXP
    expect(farming.activeDeficit['4001']).toBe(1000000)
    const ce6 = farming.optimizationResult.stages.find((s) => s.code === 'CE-6')
    const ls6 = farming.optimizationResult.stages.find((s) => s.code === 'LS-6')
    expect(ce6?.runs).toBe(100) // 1,000,000 / 10,000 = 100 runs
    expect(ls6?.runs).toBe(12) // ceil(111,400 / 10,000) = 12 runs
  })

  it('keeps gross demand and passes depot stock to the optimizer', async () => {
    const planner = usePlannerStore()
    const depot = useDepotStore()
    const settings = useSettingsStore()
    const farming = useFarmingStore()
    await farming.init()

    await planner.addPlan('char_003_kalts')
    settings.setFarmingAllowCrafting(true)

    const rawDeficitKeys = Object.keys(farming.activeDeficit).filter(
      (k) => k !== '4001' && !k.startsWith('200'),
    )
    expect(rawDeficitKeys.length).toBeGreaterThan(0)
    const targetItemId = rawDeficitKeys[0]!
    const initialDemand = farming.activeDeficit[targetItemId]!
    expect(initialDemand).toBeGreaterThan(1)

    const stockToAdd = Math.floor(initialDemand / 2)
    await depot.setItemCount(targetItemId, stockToAdd)

    // The store no longer shrinks the demand: stock is handed to the optimizer so it
    // can also cover crafting ingredients, not only the final materials.
    expect(farming.activeDeficit[targetItemId]).toBe(initialDemand)
    expect(farming.depotStock[targetItemId]).toBe(stockToAdd)

    const targets = farming.optimizationResult.stages
      .flatMap((stage) => stage.contributions)
      .filter((contribution) => contribution.itemId === targetItemId)
      .map((contribution) => contribution.targetQuantity)
    for (const target of targets) {
      expect(target).toBeLessThanOrEqual(initialDemand - stockToAdd + 1)
    }
  })
})
