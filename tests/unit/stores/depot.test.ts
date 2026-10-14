import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import {
  useDepotStore,
  DEPOT_STORAGE_KEY,
  DEPOT_CORRUPTED_BACKUP_PREFIX,
} from '../../../app/stores/depot'
import { MemoryStorageAdapter } from '../../../app/utils/storage'

describe('useDepotStore', () => {
  let memoryAdapter: MemoryStorageAdapter

  beforeEach(() => {
    setActivePinia(createPinia())
    memoryAdapter = new MemoryStorageAdapter()
  })

  it('initializes with empty default values when storage is empty', async () => {
    const store = useDepotStore()
    await store.init(memoryAdapter)

    expect(store.status).toBe('ready')
    expect(store.items).toEqual({})
    expect(store.currencies).toEqual({ lmd: 0, orundum: 0, originitePrime: 0 })
    expect(store.isCorrupted).toBe(false)
  })

  it('updates item counts and persists to adapter', async () => {
    const store = useDepotStore()
    await store.init(memoryAdapter)

    await store.setItemCount('30014', 15)
    expect(store.getItemCount('30014')).toBe(15)

    const stored = (await memoryAdapter.getItem(DEPOT_STORAGE_KEY)) as {
      items: Record<string, number>
    }
    expect(stored.items['30014']).toBe(15)

    // Resetting to 0 removes or sets to 0
    await store.setItemCount('30014', 0)
    expect(store.getItemCount('30014')).toBe(0)
  })

  it('updates currencies and clamps values properly', async () => {
    const store = useDepotStore()
    await store.init(memoryAdapter)

    await store.setCurrency('lmd', 50000)
    await store.setCurrency('orundum', 600)
    await store.setCurrency('originitePrime', 10)

    expect(store.currencies.lmd).toBe(50000)
    expect(store.currencies.orundum).toBe(600)
    expect(store.currencies.originitePrime).toBe(10)
  })

  it('clears depot inventory', async () => {
    const store = useDepotStore()
    await store.init(memoryAdapter)

    await store.setItemCount('30011', 100)
    await store.setCurrency('lmd', 1000)
    await store.clearDepot()

    expect(store.getItemCount('30011')).toBe(0)
    expect(store.currencies.lmd).toBe(0)
  })

  it('handles JSON export and import', async () => {
    const store = useDepotStore()
    await store.init(memoryAdapter)

    await store.setItemCount('30013', 25)
    await store.setCurrency('orundum', 1200)

    const exported = store.exportJson()
    expect(exported).toContain('30013')
    expect(exported).toContain('1200')

    // Reset
    await store.clearDepot()
    expect(store.getItemCount('30013')).toBe(0)

    // Re-import
    const importRes = await store.importJson(exported)
    expect(importRes.success).toBe(true)
    expect(store.getItemCount('30013')).toBe(25)
    expect(store.currencies.orundum).toBe(1200)
  })

  it('safely backups corrupted data and resets depot to default', async () => {
    // Put corrupted data in adapter
    await memoryAdapter.setItem(DEPOT_STORAGE_KEY, {
      schemaVersion: 1,
      items: 'not-a-record',
    })

    const store = useDepotStore()
    await store.init(memoryAdapter)

    expect(store.status).toBe('ready')
    expect(store.isCorrupted).toBe(true)
    expect(store.corruptedBackupKey).toMatch(new RegExp(`^${DEPOT_CORRUPTED_BACKUP_PREFIX}`))

    // Verify backup exists in storage
    const backup = await memoryAdapter.getItem(store.corruptedBackupKey!)
    expect(backup).toEqual({ schemaVersion: 1, items: 'not-a-record' })

    // And store was cleanly reset
    expect(store.items).toEqual({})
  })
})
