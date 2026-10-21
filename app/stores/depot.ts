import { ref } from 'vue'
import { defineStore } from 'pinia'
import {
  CURRENT_DEPOT_SCHEMA_VERSION,
  createDefaultDepotData,
  migrateDepotData,
  validateDepotImport,
  type DepotCurrencies,
  type DepotData,
} from '~/schemas/depot'
import { createDefaultStorageAdapter, type StorageAdapter } from '~/utils/storage'

export const DEPOT_STORAGE_KEY = 'arkcalc_depot'
export const DEPOT_CORRUPTED_BACKUP_PREFIX = 'arkcalc_depot_corrupted_'

export const useDepotStore = defineStore('depot', () => {
  let adapter: StorageAdapter = createDefaultStorageAdapter()

  const items = ref<Record<string, number>>({})
  const currencies = ref<DepotCurrencies>({
    lmd: 0,
    orundum: 0,
    originitePrime: 0,
  })
  const status = ref<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const error = ref<string | null>(null)
  const isCorrupted = ref<boolean>(false)
  const corruptedBackupKey = ref<string | null>(null)

  function setAdapter(customAdapter: StorageAdapter): void {
    adapter = customAdapter
  }

  function getAdapter(): StorageAdapter {
    return adapter
  }

  async function save(): Promise<void> {
    try {
      const payload: DepotData = {
        schemaVersion: CURRENT_DEPOT_SCHEMA_VERSION,
        updatedAt: new Date().toISOString(),
        currencies: { ...currencies.value },
        items: { ...items.value },
      }
      await adapter.setItem(DEPOT_STORAGE_KEY, payload)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to save depot data'
    }
  }

  async function init(customAdapter?: StorageAdapter): Promise<void> {
    if (customAdapter) {
      adapter = customAdapter
    }
    status.value = 'loading'
    error.value = null

    try {
      const stored = await adapter.getItem<unknown>(DEPOT_STORAGE_KEY)
      if (stored === null || stored === undefined) {
        const initial = createDefaultDepotData()
        items.value = initial.items
        currencies.value = initial.currencies
        await save()
        status.value = 'ready'
        return
      }

      const migration = migrateDepotData(stored)

      if (migration.corrupted) {
        // Data is corrupted - preserve raw copy for safety
        const backupKey = `${DEPOT_CORRUPTED_BACKUP_PREFIX}${Date.now()}`
        await adapter.setItem(backupKey, stored)
        corruptedBackupKey.value = backupKey
        isCorrupted.value = true

        const fallback = createDefaultDepotData()
        items.value = fallback.items
        currencies.value = fallback.currencies
        await save()
        status.value = 'ready'
        return
      }

      items.value = migration.data.items
      currencies.value = migration.data.currencies

      // If schema was migrated from a legacy version, persist the normalized format
      if (migration.migrated) {
        await save()
      }

      status.value = 'ready'
    } catch (err) {
      status.value = 'error'
      error.value = err instanceof Error ? err.message : 'Failed to initialize depot storage'
    }
  }

  function getItemCount(itemId: string): number {
    return items.value[itemId] ?? 0
  }

  async function setItemCount(itemId: string, count: number): Promise<void> {
    const safeCount = Math.max(0, Math.min(999999, Math.floor(count) || 0))
    if (safeCount === 0) {
      // Keep state clean or explicitly 0
      const { [itemId]: _removed, ...rest } = items.value
      items.value = rest
    } else {
      items.value = {
        ...items.value,
        [itemId]: safeCount,
      }
    }
    await save()
  }

  async function setCurrency(currency: keyof DepotCurrencies, amount: number): Promise<void> {
    const safeAmount = Math.max(0, Math.min(999999999, Math.floor(amount) || 0))
    currencies.value = {
      ...currencies.value,
      [currency]: safeAmount,
    }
    await save()
  }

  async function clearDepot(): Promise<void> {
    items.value = {}
    currencies.value = {
      lmd: 0,
      orundum: 0,
      originitePrime: 0,
    }
    await save()
  }

  /**
   * Replaces the whole depot with an external snapshot (e.g. a Yostar sync).
   * The caller is responsible for offering this only after a successful sync.
   */
  async function importSnapshot(snapshot: {
    items: Record<string, number>
    currencies: DepotCurrencies
  }): Promise<void> {
    const nextItems: Record<string, number> = {}
    for (const [itemId, count] of Object.entries(snapshot.items)) {
      const safeCount = Math.max(0, Math.min(999999, Math.floor(count) || 0))
      if (safeCount > 0) nextItems[itemId] = safeCount
    }

    items.value = nextItems
    currencies.value = {
      lmd: Math.max(0, Math.min(999999999, Math.floor(snapshot.currencies.lmd) || 0)),
      orundum: Math.max(0, Math.min(999999999, Math.floor(snapshot.currencies.orundum) || 0)),
      originitePrime: Math.max(
        0,
        Math.min(999999999, Math.floor(snapshot.currencies.originitePrime) || 0),
      ),
    }
    isCorrupted.value = false
    await save()
  }

  function exportJson(): string {
    const data: DepotData = {
      schemaVersion: CURRENT_DEPOT_SCHEMA_VERSION,
      updatedAt: new Date().toISOString(),
      currencies: { ...currencies.value },
      items: { ...items.value },
    }
    return JSON.stringify(data, null, 2)
  }

  async function importJson(jsonString: string): Promise<{ success: boolean; error?: string }> {
    const validated = validateDepotImport(jsonString)
    if (!validated.success || !validated.data) {
      return { success: false, error: validated.error }
    }

    items.value = validated.data.items
    currencies.value = validated.data.currencies
    isCorrupted.value = false
    await save()
    return { success: true }
  }

  function dismissCorruptionAlert(): void {
    isCorrupted.value = false
  }

  return {
    items,
    currencies,
    status,
    error,
    isCorrupted,
    corruptedBackupKey,
    setAdapter,
    getAdapter,
    init,
    getItemCount,
    setItemCount,
    setCurrency,
    clearDepot,
    importSnapshot,
    exportJson,
    importJson,
    dismissCorruptionAlert,
  }
})
