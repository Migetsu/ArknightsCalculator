import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useFarmingStore } from '../../../app/stores/farming'
import { useSettingsStore } from '../../../app/stores/settings'
import { usePlannerStore } from '../../../app/stores/planner'
import { useDepotStore } from '../../../app/stores/depot'

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

  it('switches server snapshot when settings change', () => {
    const settings = useSettingsStore()
    const farming = useFarmingStore()

    settings.setDropDataServer('cn')
    expect(farming.activeServer).toBe('cn')
    expect(farming.activeSnapshot.server).toBe('CN')

    settings.setDropDataServer('global')
    expect(farming.activeServer).toBe('global')
    expect(farming.activeSnapshot.server).toBe('US')
  })

  it('runs optimization on custom or planner deficit', () => {
    const farming = useFarmingStore()
    // Rock T2 (30012)
    farming.setCustomDeficit({ '30012': 10 })

    expect(farming.hasDeficit).toBe(true)
    const result = farming.optimizationResult
    expect(result.stages.length).toBeGreaterThan(0)
    expect(result.totalSanity).toBeGreaterThan(0)
  })

  it('allows selecting day of week for supply schedule', () => {
    const farming = useFarmingStore()
    farming.setSelectedDay(3) // Wednesday
    expect(farming.selectedDay).toBe(3)
    const prefixes = farming.openSupplyGroups.map((g) => g.codePrefix).sort()
    expect(prefixes).toEqual(['CA', 'LS', 'PR-C', 'PR-D', 'SK'])
  })

  it('toggles allowCrafting to switch between crafting substitution (1-7) and direct drop (S2-5)', () => {
    const settings = useSettingsStore()
    const farming = useFarmingStore()
    farming.setCustomDeficit({ '30011': 90 }) // 90 Orirock T1

    settings.setFarmingAllowCrafting(true)
    expect(farming.optimizationResult.stages[0]?.code).toBe('1-7')

    settings.setFarmingAllowCrafting(false)
    expect(farming.optimizationResult.stages[0]?.code).toBe('S2-5')
  })

  it('includes LMD (4001) and EXP (2001-2004) deficits from planner minus depot stock and recommends CE-6 and LS-6', async () => {
    const planner = usePlannerStore()
    const depot = useDepotStore()
    const settings = useSettingsStore()
    const farming = useFarmingStore()

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
})
