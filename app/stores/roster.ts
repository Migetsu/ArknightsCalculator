import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { YostarSyncPayload } from '~~/shared/schemas/yostar'
import {
  CURRENT_ROSTER_SCHEMA_VERSION,
  RosterDataSchema,
  createEmptyRosterData,
  type RosterData,
  type RosterDoctor,
  type RosterOperator,
} from '~/schemas/roster'
import { createDefaultStorageAdapter, type StorageAdapter } from '~/utils/storage'

export const ROSTER_STORAGE_KEY = 'arkcalc_roster'

/**
 * Local roster snapshot imported from a Yostar sync. Stores gameplay state only;
 * account identifiers and tokens never reach this store.
 */
export const useRosterStore = defineStore('roster', () => {
  let adapter: StorageAdapter = createDefaultStorageAdapter()

  const status = ref<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const error = ref<string | null>(null)
  const doctor = ref<RosterDoctor>({ name: '', level: 1 })
  const server = ref<'en'>('en')
  const syncedAt = ref<string | null>(null)
  const operators = ref<Record<string, RosterOperator>>({})

  const operatorCount = computed(() => Object.keys(operators.value).length)
  const hasSync = computed(() => syncedAt.value !== null)

  function snapshot(): RosterData {
    return {
      schemaVersion: CURRENT_ROSTER_SCHEMA_VERSION,
      updatedAt: new Date().toISOString(),
      syncedAt: syncedAt.value,
      server: server.value,
      doctor: { ...doctor.value },
      operators: { ...operators.value },
    }
  }

  async function save(): Promise<void> {
    try {
      await adapter.setItem(ROSTER_STORAGE_KEY, snapshot())
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to save roster'
    }
  }

  async function init(customAdapter?: StorageAdapter): Promise<void> {
    if (customAdapter) adapter = customAdapter
    status.value = 'loading'
    error.value = null

    try {
      const stored = await adapter.getItem<unknown>(ROSTER_STORAGE_KEY)
      const parsed = RosterDataSchema.safeParse(stored)
      if (parsed.success) {
        // The stored snapshot may carry its own timestamp; keep it for honesty.
        server.value = parsed.data.server
        doctor.value = parsed.data.doctor
        operators.value = parsed.data.operators
        syncedAt.value = parsed.data.syncedAt ?? null
      } else {
        const empty = createEmptyRosterData()
        doctor.value = empty.doctor
        operators.value = empty.operators
        syncedAt.value = null
      }
      status.value = 'ready'
    } catch (err) {
      status.value = 'error'
      error.value = err instanceof Error ? err.message : 'Failed to initialize roster storage'
    }
  }

  /**
   * Replaces the local roster with a fresh sync result. Called only after a
   * successful login response, so a failed sync never wipes existing data.
   */
  async function importSync(payload: YostarSyncPayload): Promise<void> {
    const next: Record<string, RosterOperator> = {}
    for (const operator of payload.operators) {
      next[operator.charId] = { ...operator }
    }
    operators.value = next
    doctor.value = { name: payload.doctor.name, level: payload.doctor.level }
    server.value = payload.doctor.server
    syncedAt.value = payload.syncedAt
    await save()
  }

  async function clear(): Promise<void> {
    const empty = createEmptyRosterData()
    doctor.value = empty.doctor
    operators.value = empty.operators
    syncedAt.value = null
    await save()
  }

  function getOperator(charId: string): RosterOperator | null {
    return operators.value[charId] ?? null
  }

  return {
    status,
    error,
    doctor,
    server,
    syncedAt,
    operators,
    operatorCount,
    hasSync,
    init,
    importSync,
    clear,
    getOperator,
  }
})
