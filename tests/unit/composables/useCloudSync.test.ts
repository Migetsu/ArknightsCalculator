import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import {
  useCloudSync,
  hasLocalData,
  hasCloudData,
  applyCloudDataToLocalStores,
  buildCurrentPayload,
} from '../../../app/composables/useCloudSync'
import type { UserDataRow } from '../../../shared/schemas/userData'

const TEST_USER_ID = '11111111-1111-4111-a111-111111111111'
const mockUserId = ref<string | null>(TEST_USER_ID)

const mockSelect = vi.fn()
const mockSelectEq = vi.fn()
const mockSelectMaybeSingle = vi.fn()

const mockUpsert = vi.fn()
const mockUpsertSelect = vi.fn()
const mockUpsertMaybeSingle = vi.fn()

const mockDelete = vi.fn()
const mockDeleteEq = vi.fn()

const mockSupabase = {
  from: vi.fn((table: string) => {
    if (table === 'user_data') {
      return {
        select: mockSelect,
        upsert: mockUpsert,
        delete: mockDelete,
      }
    }
    return {}
  }),
}

mockNuxtImport('useSupabaseClient', () => () => mockSupabase)
mockNuxtImport('useProfile', () => () => ({
  userId: mockUserId,
  isAuthenticated: ref(true),
  userEmail: ref('doctor@rhodes.island'),
  profile: ref(null),
  loading: ref(false),
  error: ref(null),
  fetchProfile: vi.fn(),
  updateProfile: vi.fn(),
  resetProfile: vi.fn(),
}))

describe('useCloudSync composable', () => {
  const validRow: UserDataRow = {
    user_id: TEST_USER_ID,
    plans: [
      {
        id: 'plan-1',
        operatorId: 'char_002_amiya',
        current: { elite: 0, level: 1, skillLevel: 1, skills: {}, modules: {} },
        target: { elite: 2, level: 50, skillLevel: 7, skills: {}, modules: {} },
        createdAt: '2026-10-24T10:00:00.000Z',
      },
    ],
    settings: {
      dropDataServer: 'global',
      farmingMaxSanity: 135,
      farmingRegenMinutes: 6,
      farmingAllowCrafting: true,
    },
    depot: {
      schemaVersion: 1,
      updatedAt: '2026-10-24T10:00:00.000Z',
      currencies: { lmd: 50000, orundum: 0, originitePrime: 0 },
      items: { '30012': 10 },
    },
    roster_synced_at: '2026-10-24T10:00:00.000Z',
    updated_at: '2026-10-24T12:00:00.000Z',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockUserId.value = TEST_USER_ID

    mockSelect.mockReturnValue({ eq: mockSelectEq })
    mockSelectEq.mockReturnValue({ maybeSingle: mockSelectMaybeSingle })

    mockUpsert.mockReturnValue({ select: mockUpsertSelect })
    mockUpsertSelect.mockReturnValue({ maybeSingle: mockUpsertMaybeSingle })

    mockDelete.mockReturnValue({ eq: mockDeleteEq })
    mockDeleteEq.mockResolvedValue({ error: null })
  })

  it('pull returns "empty" if 0 rows (maybeSingle returns null)', async () => {
    mockSelectMaybeSingle.mockResolvedValueOnce({
      data: null,
      error: null,
    })

    const { pull, error, pulling } = useCloudSync()
    const result = await pull()

    expect(result).toBe('empty')
    expect(error.value).toBeNull()
    expect(pulling.value).toBe(false)
    expect(mockSupabase.from).toHaveBeenCalledWith('user_data')
    expect(mockSelect).toHaveBeenCalledWith('*')
    expect(mockSelectEq).toHaveBeenCalledWith('user_id', TEST_USER_ID)
  })

  it('pull returns "loaded" and parses valid row into state', async () => {
    mockSelectMaybeSingle.mockResolvedValueOnce({
      data: validRow,
      error: null,
    })

    const { pull, error, lastSyncedAt } = useCloudSync()
    const result = await pull()

    expect(result).toBe('loaded')
    expect(error.value).toBeNull()
    expect(lastSyncedAt.value?.toISOString()).toBe(new Date(validRow.updated_at).toISOString())
  })

  it('pull returns "error" when data fails UserDataRowSchema.safeParse', async () => {
    mockSelectMaybeSingle.mockResolvedValueOnce({
      data: {
        user_id: TEST_USER_ID,
        plans: 'not-an-array-or-valid-json', // invalid plans schema (expected array or object)
        settings: 'invalid',
        depot: 'invalid',
        updated_at: 'not-a-date',
      },
      error: null,
    })

    const { pull, error } = useCloudSync()
    const result = await pull()

    expect(result).toBe('error')
    expect(error.value).toContain('Failed to validate cloud user data schema')
  })

  it('push calls upsert with { user_id, ...payload, updated_at }', async () => {
    mockUpsertMaybeSingle.mockResolvedValueOnce({
      data: validRow,
      error: null,
    })

    const { push, error, pushing } = useCloudSync()
    const payload = {
      plans: validRow.plans,
      settings: validRow.settings,
      depot: validRow.depot,
      roster_synced_at: validRow.roster_synced_at,
    }

    const success = await push(payload)

    expect(success).toBe(true)
    expect(error.value).toBeNull()
    expect(pushing.value).toBe(false)
    expect(mockSupabase.from).toHaveBeenCalledWith('user_data')
    expect(mockUpsert).toHaveBeenCalledTimes(1)

    const upsertArg = mockUpsert.mock.calls[0]?.[0]
    expect(upsertArg).toBeDefined()
    expect(upsertArg.user_id).toBe(TEST_USER_ID)
    expect(upsertArg.plans).toEqual(payload.plans)
    expect(upsertArg.settings).toEqual(payload.settings)
    expect(upsertArg.depot).toEqual(payload.depot)
    expect(upsertArg.roster_synced_at).toBe(payload.roster_synced_at)
    expect(typeof upsertArg.updated_at).toBe('string')
  })

  it('forget calls delete().eq("user_id", uid) and clears state', async () => {
    mockDeleteEq.mockResolvedValueOnce({ error: null })

    const { forget, error, lastSyncedAt } = useCloudSync()
    const success = await forget()

    expect(success).toBe(true)
    expect(error.value).toBeNull()
    expect(lastSyncedAt.value).toBeNull()
    expect(mockSupabase.from).toHaveBeenCalledWith('user_data')
    expect(mockDelete).toHaveBeenCalledTimes(1)
    expect(mockDeleteEq).toHaveBeenCalledWith('user_id', TEST_USER_ID)
  })

  it('reset clears state variables', () => {
    const { reset, cloudUserData, lastSyncedAt, error } = useCloudSync()
    cloudUserData.value = validRow
    lastSyncedAt.value = new Date()
    error.value = 'some error'

    reset()

    expect(cloudUserData.value).toBeNull()
    expect(lastSyncedAt.value).toBeNull()
    expect(error.value).toBeNull()
  })

  it('hasLocalData detects empty vs non-empty stores', () => {
    const emptyStores = {
      plannerStore: { plans: [] },
      settingsStore: {
        dropDataServer: 'cn',
        farmingMaxSanity: 135,
        farmingRegenMinutes: 6,
        farmingAllowCrafting: true,
      },
      depotStore: {
        items: {},
        currencies: { lmd: 0, orundum: 0, originitePrime: 0 },
      },
    }
    expect(hasLocalData(emptyStores)).toBe(false)

    const withPlans = {
      ...emptyStores,
      plannerStore: { plans: [{ id: 'plan-1' }] },
    }
    expect(hasLocalData(withPlans)).toBe(true)

    const withDepot = {
      ...emptyStores,
      depotStore: {
        items: { '30012': 1 },
        currencies: { lmd: 0, orundum: 0, originitePrime: 0 },
      },
    }
    expect(hasLocalData(withDepot)).toBe(true)
  })

  it('hasCloudData detects presence of cloud plans, depot or roster', () => {
    expect(hasCloudData(null)).toBe(false)

    const emptyCloud: UserDataRow = {
      user_id: TEST_USER_ID,
      plans: [],
      settings: {
        dropDataServer: 'cn',
        farmingMaxSanity: 135,
        farmingRegenMinutes: 6,
        farmingAllowCrafting: true,
      },
      depot: {
        items: {},
        currencies: { lmd: 0, orundum: 0, originitePrime: 0 },
      },
      roster_synced_at: null,
      updated_at: '2026-10-24T12:00:00.000Z',
    }
    expect(hasCloudData(emptyCloud)).toBe(false)

    expect(hasCloudData(validRow)).toBe(true)
  })

  it('applyCloudDataToLocalStores applies cloud data to stores', async () => {
    const mockPlannerStore = { importPlans: vi.fn().mockResolvedValue(undefined) }
    const mockSettingsStore = {
      setDropDataServer: vi.fn(),
      setFarmingMaxSanity: vi.fn(),
      setFarmingRegenMinutes: vi.fn(),
      setFarmingAllowCrafting: vi.fn(),
    }
    const mockDepotStore = { importSnapshot: vi.fn().mockResolvedValue(undefined) }

    await applyCloudDataToLocalStores(validRow, {
      plannerStore: mockPlannerStore,
      settingsStore: mockSettingsStore,
      depotStore: mockDepotStore,
    })

    expect(mockPlannerStore.importPlans).toHaveBeenCalledWith(validRow.plans, 'replace')
    expect(mockSettingsStore.setDropDataServer).toHaveBeenCalledWith('global')
    expect(mockSettingsStore.setFarmingMaxSanity).toHaveBeenCalledWith(135)
    expect(mockDepotStore.importSnapshot).toHaveBeenCalledWith({
      items: { '30012': 10 },
      currencies: { lmd: 50000, orundum: 0, originitePrime: 0 },
    })
  })

  it('buildCurrentPayload builds valid UserDataPayload from stores', () => {
    const stores = {
      plannerStore: { plans: validRow.plans },
      settingsStore: {
        dropDataServer: 'global' as const,
        farmingMaxSanity: 135,
        farmingRegenMinutes: 6,
        farmingAllowCrafting: true,
      },
      depotStore: {
        updatedAt: '2026-10-24T10:00:00.000Z',
        currencies: { lmd: 50000, orundum: 0, originitePrime: 0 },
        items: { '30012': 10 },
      },
      rosterStore: { syncedAt: '2026-10-24T10:00:00.000Z' },
    }

    const payload = buildCurrentPayload(stores)
    expect(payload.plans).toEqual(validRow.plans)
    expect(payload.settings.dropDataServer).toBe('global')
    expect(payload.depot.items?.['30012']).toBe(10)
    expect(payload.roster_synced_at).toBe('2026-10-24T10:00:00.000Z')
  })
})
