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
    store.resetAllSettings()
    expect(store.dropDataServer).toBe('cn')
  })
})
