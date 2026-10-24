import { ref, watch, getCurrentInstance, onBeforeUnmount, type Ref } from 'vue'
import type { Database, Json } from '~/types/database.types'
import type { PlanItem } from '~~/shared/utils/planner/types'
import type { ServerRegion } from '~~/shared/schemas/operator'
import type { DepotCurrencies } from '~~/shared/schemas/depot'
import {
  UserDataRowSchema,
  type UserDataRow,
  type UserDataPayload,
} from '~~/shared/schemas/userData'

export interface UseCloudSyncReturn {
  cloudUserData: Ref<UserDataRow | null>
  pulling: Ref<boolean>
  pushing: Ref<boolean>
  lastSyncedAt: Ref<Date | null>
  error: Ref<string | null>
  pull: (opts?: { acceptEmpty?: boolean }) => Promise<'loaded' | 'empty' | 'error'>
  push: (payload?: UserDataPayload) => Promise<boolean>
  forget: () => Promise<boolean>
  reset: () => void
  startAutoSync: (sources: () => UserDataPayload, opts?: { debounceMs?: number }) => () => void
}

export function hasLocalData(stores: {
  plannerStore: { plans: Array<unknown> }
  settingsStore: {
    dropDataServer: string
    farmingMaxSanity: number
    farmingRegenMinutes: number
    farmingAllowCrafting: boolean
  }
  depotStore: {
    items: Record<string, number>
    currencies: { lmd: number; orundum: number; originitePrime: number }
  }
}): boolean {
  const hasPlans = stores.plannerStore.plans.length > 0
  const hasDepotItems = Object.keys(stores.depotStore.items).length > 0
  const hasDepotCurrencies =
    stores.depotStore.currencies.lmd > 0 ||
    stores.depotStore.currencies.orundum > 0 ||
    stores.depotStore.currencies.originitePrime > 0
  const hasCustomSettings =
    stores.settingsStore.dropDataServer !== 'cn' ||
    stores.settingsStore.farmingMaxSanity !== 135 ||
    stores.settingsStore.farmingRegenMinutes !== 6 ||
    !stores.settingsStore.farmingAllowCrafting

  return Boolean(hasPlans || hasDepotItems || hasDepotCurrencies || hasCustomSettings)
}

export function hasCloudData(data: UserDataRow | null): boolean {
  if (!data) return false
  const hasPlans = Array.isArray(data.plans) && data.plans.length > 0
  const hasDepotItems = data.depot?.items && Object.keys(data.depot.items).length > 0
  const hasDepotCurrencies =
    data.depot?.currencies &&
    ((data.depot.currencies.lmd ?? 0) > 0 ||
      (data.depot.currencies.orundum ?? 0) > 0 ||
      (data.depot.currencies.originitePrime ?? 0) > 0)
  const hasRoster = data.roster_synced_at !== null

  return Boolean(hasPlans || hasDepotItems || hasDepotCurrencies || hasRoster)
}

export async function applyCloudDataToLocalStores(
  data: UserDataRow,
  stores: {
    plannerStore: { importPlans: (plans: PlanItem[], mode: 'replace') => Promise<void> }
    settingsStore: {
      setDropDataServer: (s: ServerRegion) => void
      setFarmingMaxSanity: (n: number) => void
      setFarmingRegenMinutes: (n: number) => void
      setFarmingAllowCrafting: (b: boolean) => void
    }
    depotStore: {
      importSnapshot: (s: {
        items: Record<string, number>
        currencies: DepotCurrencies
      }) => Promise<void>
    }
  },
): Promise<void> {
  if (Array.isArray(data.plans)) {
    await stores.plannerStore.importPlans(data.plans, 'replace')
  }

  if (data.settings) {
    if (data.settings.dropDataServer) {
      stores.settingsStore.setDropDataServer(data.settings.dropDataServer)
    }
    if (typeof data.settings.farmingMaxSanity === 'number') {
      stores.settingsStore.setFarmingMaxSanity(data.settings.farmingMaxSanity)
    }
    if (typeof data.settings.farmingRegenMinutes === 'number') {
      stores.settingsStore.setFarmingRegenMinutes(data.settings.farmingRegenMinutes)
    }
    if (typeof data.settings.farmingAllowCrafting === 'boolean') {
      stores.settingsStore.setFarmingAllowCrafting(data.settings.farmingAllowCrafting)
    }
  }

  if (data.depot) {
    await stores.depotStore.importSnapshot({
      items: data.depot.items ?? {},
      currencies: {
        lmd: data.depot.currencies?.lmd ?? 0,
        orundum: data.depot.currencies?.orundum ?? 0,
        originitePrime: data.depot.currencies?.originitePrime ?? 0,
      },
    })
  }
}

export function buildCurrentPayload(stores: {
  plannerStore: { plans: PlanItem[] }
  settingsStore: {
    dropDataServer: ServerRegion
    farmingMaxSanity: number
    farmingRegenMinutes: number
    farmingAllowCrafting: boolean
  }
  depotStore: {
    updatedAt?: string
    currencies: DepotCurrencies
    items: Record<string, number>
  }
  rosterStore?: { syncedAt: string | null }
}): UserDataPayload {
  return {
    plans: JSON.parse(JSON.stringify(stores.plannerStore.plans)),
    settings: {
      dropDataServer: stores.settingsStore.dropDataServer,
      farmingMaxSanity: stores.settingsStore.farmingMaxSanity,
      farmingRegenMinutes: stores.settingsStore.farmingRegenMinutes,
      farmingAllowCrafting: stores.settingsStore.farmingAllowCrafting,
    },
    depot: {
      schemaVersion: 1,
      updatedAt: stores.depotStore.updatedAt ?? new Date().toISOString(),
      currencies: { ...stores.depotStore.currencies },
      items: { ...stores.depotStore.items },
    },
    roster_synced_at: stores.rosterStore?.syncedAt ?? null,
  }
}

export function useCloudSync(): UseCloudSyncReturn {
  const supabase = useSupabaseClient<Database>()
  const { userId } = useProfile()

  const cloudUserData = useState<UserDataRow | null>('cloud_user_data', () => null)
  const pulling = ref(false)
  const pushing = ref(false)
  const lastSyncedAt = ref<Date | null>(null)
  const error = ref<string | null>(null)

  async function pull(_opts?: { acceptEmpty?: boolean }): Promise<'loaded' | 'empty' | 'error'> {
    const uid = userId.value
    if (!uid) {
      error.value = 'User not authenticated'
      return 'error'
    }

    pulling.value = true
    error.value = null

    try {
      const { data, error: dbError } = await supabase
        .from('user_data')
        .select('*')
        .eq('user_id', uid)
        .maybeSingle()

      if (dbError) {
        error.value = dbError.message
        return 'error'
      }

      if (!data) {
        return 'empty'
      }

      const parsed = UserDataRowSchema.safeParse(data)
      if (!parsed.success) {
        error.value = `Failed to validate cloud user data schema: ${parsed.error.message}`
        return 'error'
      }

      cloudUserData.value = parsed.data
      lastSyncedAt.value = new Date(parsed.data.updated_at)
      return 'loaded'
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error during pull'
      return 'error'
    } finally {
      pulling.value = false
    }
  }

  async function push(payload?: UserDataPayload): Promise<boolean> {
    const uid = userId.value
    if (!uid) {
      error.value = 'User not authenticated'
      return false
    }

    pushing.value = true
    error.value = null

    try {
      const rowToUpsert = {
        user_id: uid,
        ...(payload
          ? {
              plans: payload.plans as unknown as Json,
              settings: payload.settings as unknown as Json,
              depot: payload.depot as unknown as Json,
              roster_synced_at: payload.roster_synced_at ?? null,
            }
          : {}),
        updated_at: new Date().toISOString(),
      }

      const { data, error: dbError } = await supabase
        .from('user_data')
        .upsert(rowToUpsert)
        .select('*')
        .maybeSingle()

      if (dbError) {
        error.value = dbError.message
        return false
      }

      if (data) {
        const parsed = UserDataRowSchema.safeParse(data)
        if (parsed.success) {
          cloudUserData.value = parsed.data
          lastSyncedAt.value = new Date(parsed.data.updated_at)
        } else {
          lastSyncedAt.value = new Date()
        }
      } else {
        lastSyncedAt.value = new Date()
      }

      return true
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error during push'
      return false
    } finally {
      pushing.value = false
    }
  }

  async function forget(): Promise<boolean> {
    const uid = userId.value
    if (!uid) {
      error.value = 'User not authenticated'
      return false
    }

    error.value = null

    try {
      const { error: dbError } = await supabase.from('user_data').delete().eq('user_id', uid)

      if (dbError) {
        error.value = dbError.message
        return false
      }

      cloudUserData.value = null
      lastSyncedAt.value = null
      return true
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error during forget'
      return false
    }
  }

  function startAutoSync(
    sources: () => UserDataPayload,
    opts?: { debounceMs?: number },
  ): () => void {
    const debounceMs = opts?.debounceMs ?? 2000
    let timer: ReturnType<typeof setTimeout> | null = null

    const unwatch = watch(
      sources,
      (newVal) => {
        if (!userId.value) return
        if (timer) clearTimeout(timer)
        timer = setTimeout(() => {
          void push(newVal)
        }, debounceMs)
      },
      { deep: true },
    )

    const cleanup = () => {
      if (timer) {
        clearTimeout(timer)
        timer = null
      }
      unwatch()
    }

    if (getCurrentInstance()) {
      onBeforeUnmount(cleanup)
    }

    return cleanup
  }

  function reset(): void {
    cloudUserData.value = null
    lastSyncedAt.value = null
    error.value = null
    pulling.value = false
    pushing.value = false
  }

  return {
    cloudUserData,
    pulling,
    pushing,
    lastSyncedAt,
    error,
    pull,
    push,
    forget,
    reset,
    startAutoSync,
  }
}
