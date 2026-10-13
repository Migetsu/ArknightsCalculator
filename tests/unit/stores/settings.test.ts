import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useSettingsStore } from '../../../app/stores/settings'

describe('useSettingsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  it('initializes defaultServer to global', () => {
    const store = useSettingsStore()
    expect(store.defaultServer).toBe('global')
  })

  it('updates defaultServer and persists to localStorage', () => {
    const store = useSettingsStore()
    store.setDefaultServer('cn')
    expect(store.defaultServer).toBe('cn')
  })

  it('resets all settings back to default', () => {
    const store = useSettingsStore()
    store.setDefaultServer('cn')
    store.resetAllSettings()
    expect(store.defaultServer).toBe('global')
  })
})
