import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useFarmingStore } from '../../../app/stores/farming'
import { useSettingsStore } from '../../../app/stores/settings'

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
})
