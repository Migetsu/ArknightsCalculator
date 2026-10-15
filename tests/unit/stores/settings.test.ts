import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useSettingsStore } from '../../../app/stores/settings'

import { nextTick } from 'vue'

describe('useSettingsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  it('initializes dropDataServer to cn', () => {
    const store = useSettingsStore()
    expect(store.dropDataServer).toBe('cn')
  })

  it('updates dropDataServer and persists to localStorage', async () => {
    const store = useSettingsStore()
    store.setDropDataServer('global')
    expect(store.dropDataServer).toBe('global')
    await nextTick()
    expect(localStorage.getItem('arkcalc_drop_data_server')).toBe('global')
  })

  it('resets all settings back to default', () => {
    const store = useSettingsStore()
    store.setDropDataServer('global')
    store.setFarmingMaxSanity(120)
    store.setFarmingRegenMinutes(8)
    store.resetAllSettings()
    expect(store.dropDataServer).toBe('cn')
    expect(store.farmingMaxSanity).toBe(135)
    expect(store.farmingRegenMinutes).toBe(6)
  })

  it('updates farming sanity parameters within bounds', () => {
    const store = useSettingsStore()
    store.setFarmingMaxSanity(140)
    expect(store.farmingMaxSanity).toBe(140)
    store.setFarmingRegenMinutes(5)
    expect(store.farmingRegenMinutes).toBe(5)
  })
})
