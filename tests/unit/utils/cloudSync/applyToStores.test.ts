import { describe, it, expect, vi } from 'vitest'
import {
  applyCloudDataToLocalStores,
  buildCurrentPayload,
  hasLocalData,
  hasCloudData,
} from '../../../../app/utils/cloudSync/applyToStores'
import type { UserDataRow } from '../../../../shared/schemas/userData'

describe('applyToStores utils', () => {
  const sampleRow: UserDataRow = {
    user_id: '11111111-1111-4111-a111-111111111111',
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

  it('applyCloudDataToLocalStores применяет plans/settings/depot в сторы', async () => {
    const mockPlannerStore = { importPlans: vi.fn().mockResolvedValue(undefined) }
    const mockSettingsStore = {
      setDropDataServer: vi.fn(),
      setFarmingMaxSanity: vi.fn(),
      setFarmingRegenMinutes: vi.fn(),
      setFarmingAllowCrafting: vi.fn(),
    }
    const mockDepotStore = { importSnapshot: vi.fn().mockResolvedValue(undefined) }

    await applyCloudDataToLocalStores(sampleRow, {
      plannerStore: mockPlannerStore,
      settingsStore: mockSettingsStore,
      depotStore: mockDepotStore,
    })

    expect(mockPlannerStore.importPlans).toHaveBeenCalledWith(sampleRow.plans, 'replace')
    expect(mockSettingsStore.setDropDataServer).toHaveBeenCalledWith('global')
    expect(mockSettingsStore.setFarmingMaxSanity).toHaveBeenCalledWith(135)
    expect(mockSettingsStore.setFarmingRegenMinutes).toHaveBeenCalledWith(6)
    expect(mockSettingsStore.setFarmingAllowCrafting).toHaveBeenCalledWith(true)
    expect(mockDepotStore.importSnapshot).toHaveBeenCalledWith({
      items: { '30012': 10 },
      currencies: { lmd: 50000, orundum: 0, originitePrime: 0 },
    })
  })

  it('buildCurrentPayload собирает из сторов в правильной форме', () => {
    const stores = {
      plannerStore: { plans: sampleRow.plans },
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
    expect(payload.plans).toEqual(sampleRow.plans)
    expect(payload.settings.dropDataServer).toBe('global')
    expect(payload.depot.currencies?.lmd).toBe(50000)
    expect(payload.depot.items?.['30012']).toBe(10)
    expect(payload.roster_synced_at).toBe('2026-10-24T10:00:00.000Z')
  })

  it('roster_synced_at ставится при явном push после Yostar sync', () => {
    const stores = {
      plannerStore: { plans: [] },
      settingsStore: {
        dropDataServer: 'cn' as const,
        farmingMaxSanity: 135,
        farmingRegenMinutes: 6,
        farmingAllowCrafting: true,
      },
      depotStore: {
        currencies: { lmd: 0, orundum: 0, originitePrime: 0 },
        items: {},
      },
      rosterStore: { syncedAt: null },
    }

    const before = new Date().toISOString()
    const payload = buildCurrentPayload(stores, { isRosterSync: true })
    const after = new Date().toISOString()

    expect(payload.roster_synced_at).toBeTruthy()
    expect(typeof payload.roster_synced_at).toBe('string')
    expect(payload.roster_synced_at! >= before).toBe(true)
    expect(payload.roster_synced_at! <= after).toBe(true)
  })

  it('пустые данные не ломают (null/undefined)', async () => {
    // Should not throw on null / undefined parameters
    await expect(applyCloudDataToLocalStores(null, null)).resolves.not.toThrow()
    await expect(applyCloudDataToLocalStores(undefined, undefined)).resolves.not.toThrow()

    const emptyPayload = buildCurrentPayload(null)
    expect(emptyPayload.plans).toEqual([])
    expect(emptyPayload.settings.dropDataServer).toBe('cn')
    expect(emptyPayload.depot.items).toEqual({})
    expect(emptyPayload.roster_synced_at).toBeNull()

    const emptyUndefinedPayload = buildCurrentPayload(undefined)
    expect(emptyUndefinedPayload.plans).toEqual([])

    expect(hasLocalData(null)).toBe(false)
    expect(hasLocalData(undefined)).toBe(false)
    expect(hasCloudData(null)).toBe(false)
    expect(hasCloudData(undefined)).toBe(false)
  })
})
