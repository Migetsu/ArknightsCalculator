import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useRosterStore, ROSTER_STORAGE_KEY } from '../../../app/stores/roster'
import { MemoryStorageAdapter } from '../../../app/utils/storage'
import type { YostarSyncPayload } from '../../../shared/schemas/yostar'

const payload: YostarSyncPayload = {
  doctor: { name: 'Doctor', level: 108, server: 'en' },
  operators: [
    {
      charId: 'char_003_kalts',
      elite: 2,
      level: 90,
      skillLevel: 7,
      potential: 4,
      favor: 150,
      skills: { skchr_kalts_2: 3 },
      modules: { uniequip_002_kalts: 3 },
    },
    {
      charId: 'char_002_amiya',
      elite: 1,
      level: 50,
      skillLevel: 4,
      potential: 0,
      favor: 12,
      skills: {},
      modules: {},
    },
  ],
  depot: {
    currencies: { lmd: 100, orundum: 5, originitePrime: 1 },
    items: { '30115': 4 },
  },
  unknownOperatorIds: [],
  unknownItemCount: 0,
  skippedEntries: 0,
  syncedAt: '2026-10-21T10:00:00.000Z',
}

describe('useRosterStore', () => {
  let memoryAdapter: MemoryStorageAdapter

  beforeEach(() => {
    setActivePinia(createPinia())
    memoryAdapter = new MemoryStorageAdapter()
  })

  it('starts empty and reports no sync', async () => {
    const store = useRosterStore()
    await store.init(memoryAdapter)

    expect(store.status).toBe('ready')
    expect(store.operatorCount).toBe(0)
    expect(store.hasSync).toBe(false)
    expect(store.doctor).toEqual({ name: '', level: 1 })
  })

  it('imports a sync payload and persists gameplay state only', async () => {
    const store = useRosterStore()
    await store.init(memoryAdapter)
    await store.importSync(payload)

    expect(store.operatorCount).toBe(2)
    expect(store.hasSync).toBe(true)
    expect(store.doctor).toEqual({ name: 'Doctor', level: 108 })
    expect(store.getOperator('char_003_kalts')?.modules).toEqual({ uniequip_002_kalts: 3 })

    const stored = (await memoryAdapter.getItem(ROSTER_STORAGE_KEY)) as Record<string, unknown>
    const serialized = JSON.stringify(stored)
    // No account identifiers, e-mail or token may be persisted.
    expect(serialized).not.toContain('@')
    expect(serialized).not.toContain('token')
    expect(serialized).not.toContain('uid')
    expect(stored).toMatchObject({ schemaVersion: 1, server: 'en' })
  })

  it('reloads a previous snapshot on init', async () => {
    const first = useRosterStore()
    await first.init(memoryAdapter)
    await first.importSync(payload)

    setActivePinia(createPinia())
    const second = useRosterStore()
    await second.init(memoryAdapter)

    expect(second.operatorCount).toBe(2)
    expect(second.doctor.name).toBe('Doctor')
    expect(second.syncedAt).toBe('2026-10-21T10:00:00.000Z')
  })

  it('resets a corrupt snapshot instead of crashing', async () => {
    await memoryAdapter.setItem(ROSTER_STORAGE_KEY, { schemaVersion: 99, operators: 'nope' })

    const store = useRosterStore()
    await store.init(memoryAdapter)

    expect(store.status).toBe('ready')
    expect(store.operatorCount).toBe(0)
    expect(store.hasSync).toBe(false)
  })

  it('replaces the previous roster on a new sync and can be cleared', async () => {
    const store = useRosterStore()
    await store.init(memoryAdapter)
    await store.importSync(payload)

    await store.importSync({ ...payload, operators: [payload.operators[1]!] })
    expect(store.operatorCount).toBe(1)
    expect(store.getOperator('char_003_kalts')).toBeNull()

    await store.clear()
    expect(store.operatorCount).toBe(0)
    expect(store.hasSync).toBe(false)
  })
})
