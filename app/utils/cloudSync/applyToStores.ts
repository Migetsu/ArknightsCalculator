import type { PlanItem } from '~~/shared/utils/planner/types'
import type { ServerRegion } from '~~/shared/schemas/operator'
import type { DepotCurrencies } from '~~/shared/schemas/depot'
import type { UserDataRow, UserDataPayload } from '~~/shared/schemas/userData'

export interface LocalStoresForCloudSync {
  plannerStore?: {
    plans?: PlanItem[]
    init?: () => Promise<void>
    importPlans?: (plans: PlanItem[], mode: 'replace') => Promise<void>
  } | null
  settingsStore?: {
    dropDataServer?: ServerRegion
    farmingMaxSanity?: number
    farmingRegenMinutes?: number
    farmingAllowCrafting?: boolean
    setDropDataServer?: (s: ServerRegion) => void
    setFarmingMaxSanity?: (n: number) => void
    setFarmingRegenMinutes?: (n: number) => void
    setFarmingAllowCrafting?: (b: boolean) => void
  } | null
  depotStore?: {
    updatedAt?: string
    items?: Record<string, number>
    currencies?: DepotCurrencies
    init?: () => Promise<void>
    importSnapshot?: (s: {
      items: Record<string, number>
      currencies: DepotCurrencies
    }) => Promise<void>
  } | null
  rosterStore?: {
    syncedAt?: string | null
    init?: () => Promise<void>
  } | null
}

export interface BuildPayloadOptions {
  isRosterSync?: boolean
}

export function hasLocalData(stores?: LocalStoresForCloudSync | null): boolean {
  if (!stores) return false

  const hasPlans = Boolean(stores.plannerStore?.plans && stores.plannerStore.plans.length > 0)
  const hasDepotItems = Boolean(
    stores.depotStore?.items && Object.keys(stores.depotStore.items).length > 0,
  )
  const hasDepotCurrencies = Boolean(
    stores.depotStore?.currencies &&
    ((stores.depotStore.currencies.lmd ?? 0) > 0 ||
      (stores.depotStore.currencies.orundum ?? 0) > 0 ||
      (stores.depotStore.currencies.originitePrime ?? 0) > 0),
  )

  return Boolean(hasPlans || hasDepotItems || hasDepotCurrencies)
}

export function hasCloudData(data?: UserDataRow | null): boolean {
  if (!data) return false

  const hasPlans = Array.isArray(data.plans) && data.plans.length > 0
  const hasDepotItems = Boolean(data.depot?.items && Object.keys(data.depot.items).length > 0)
  const hasDepotCurrencies = Boolean(
    data.depot?.currencies &&
    ((data.depot.currencies.lmd ?? 0) > 0 ||
      (data.depot.currencies.orundum ?? 0) > 0 ||
      (data.depot.currencies.originitePrime ?? 0) > 0),
  )
  const hasRoster = Boolean(data.roster_synced_at)

  return Boolean(hasPlans || hasDepotItems || hasDepotCurrencies || hasRoster)
}

export async function applyCloudDataToLocalStores(
  data?: UserDataRow | null,
  stores?: LocalStoresForCloudSync | null,
): Promise<void> {
  if (!data || !stores) return

  if (Array.isArray(data.plans) && stores.plannerStore?.importPlans) {
    await stores.plannerStore.importPlans(data.plans, 'replace')
  }

  if (data.settings && stores.settingsStore) {
    if (data.settings.dropDataServer && stores.settingsStore.setDropDataServer) {
      stores.settingsStore.setDropDataServer(data.settings.dropDataServer)
    }
    if (
      typeof data.settings.farmingMaxSanity === 'number' &&
      stores.settingsStore.setFarmingMaxSanity
    ) {
      stores.settingsStore.setFarmingMaxSanity(data.settings.farmingMaxSanity)
    }
    if (
      typeof data.settings.farmingRegenMinutes === 'number' &&
      stores.settingsStore.setFarmingRegenMinutes
    ) {
      stores.settingsStore.setFarmingRegenMinutes(data.settings.farmingRegenMinutes)
    }
    if (
      typeof data.settings.farmingAllowCrafting === 'boolean' &&
      stores.settingsStore.setFarmingAllowCrafting
    ) {
      stores.settingsStore.setFarmingAllowCrafting(data.settings.farmingAllowCrafting)
    }
  }

  if (data.depot && stores.depotStore?.importSnapshot) {
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

export function buildCurrentPayload(
  stores?: LocalStoresForCloudSync | null,
  options?: BuildPayloadOptions,
): UserDataPayload {
  const rosterSyncedAt = options?.isRosterSync
    ? new Date().toISOString()
    : (stores?.rosterStore?.syncedAt ?? null)

  const plans = stores?.plannerStore?.plans
    ? JSON.parse(JSON.stringify(stores.plannerStore.plans))
    : []

  const settings = {
    dropDataServer: stores?.settingsStore?.dropDataServer ?? 'cn',
    farmingMaxSanity: stores?.settingsStore?.farmingMaxSanity ?? 135,
    farmingRegenMinutes: stores?.settingsStore?.farmingRegenMinutes ?? 6,
    farmingAllowCrafting: stores?.settingsStore?.farmingAllowCrafting ?? true,
  }

  const depot = {
    schemaVersion: 1 as const,
    updatedAt: stores?.depotStore?.updatedAt ?? new Date().toISOString(),
    currencies: {
      lmd: stores?.depotStore?.currencies?.lmd ?? 0,
      orundum: stores?.depotStore?.currencies?.orundum ?? 0,
      originitePrime: stores?.depotStore?.currencies?.originitePrime ?? 0,
    },
    items: stores?.depotStore?.items ? { ...stores.depotStore.items } : {},
  }

  return {
    plans,
    settings,
    depot,
    roster_synced_at: rosterSyncedAt,
  }
}
