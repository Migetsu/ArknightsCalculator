import { ref, computed, watch } from 'vue'
import { defineStore } from 'pinia'
import { useSettingsStore } from './settings'
import { usePlannerStore } from './planner'
import { useDepotStore } from './depot'
import type { PenguinMatrixSnapshot } from '~/../shared/schemas/farming'
import type { Stage } from '~/../shared/schemas/stage'
import type { FarmingDataResponse, FarmingItemMeta } from '~/../shared/utils/farming/farmingData'
import { optimizeFarming, getServerDayOfWeek, getOpenSupplyGroups } from '~/../shared/utils/farming'
import { fetchFarmingData } from '~/composables/useFarmingData'
import { asJsonFetcher, fetchJson } from '~/utils/fetchJson'
import type { JsonFetcher } from '~/utils/fetchJson'

const EXP_CARD_VALUES: Readonly<Record<string, number>> = {
  '2001': 200,
  '2002': 400,
  '2003': 1000,
  '2004': 2000,
}

const SORTED_EXP_CARDS: ReadonlyArray<readonly [string, number]> = [
  ['2004', 2000],
  ['2003', 1000],
  ['2002', 400],
  ['2001', 200],
]

const EMPTY_SNAPSHOT: PenguinMatrixSnapshot = {
  server: 'US',
  fetchedAt: '',
  minSampleSize: 300,
  stages: {},
}

export const useFarmingStore = defineStore('farming', () => {
  const settingsStore = useSettingsStore()
  const plannerStore = usePlannerStore()
  const depotStore = useDepotStore()

  const status = ref<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const error = ref<string | null>(null)
  const customDeficit = ref<Record<string, number> | null>(null)
  const selectedDay = ref<number>(getServerDayOfWeek(new Date(), settingsStore.dropDataServer))

  const snapshots = ref<Record<string, PenguinMatrixSnapshot>>({})
  const stagesMap = ref<Record<string, Stage>>({})
  const itemsMap = ref<Record<string, FarmingItemMeta>>({})

  const activeServer = computed<'cn' | 'global'>(() => settingsStore.dropDataServer)

  const activeSnapshot = computed<PenguinMatrixSnapshot>(() => {
    const key = activeServer.value === 'cn' ? 'cn' : 'global'
    return (
      snapshots.value[key] ?? {
        ...EMPTY_SNAPSHOT,
        server: key === 'cn' ? 'CN' : 'US',
      }
    )
  })

  const currentServerDay = computed<number>(() => {
    return getServerDayOfWeek(new Date(), activeServer.value)
  })

  const isSnapshotOutdated = computed<boolean>(() => {
    const fetchedAt = activeSnapshot.value?.fetchedAt
    if (!fetchedAt) return false
    const snapshotTime = new Date(fetchedAt).getTime()
    const thirtyDaysMs = 30 * 24 * 3600 * 1000
    return Date.now() - snapshotTime > thirtyDaysMs
  })

  // Raw deficit from planner (materials + LMD + EXP) or custom override
  const activeDeficit = computed<Record<string, number>>(() => {
    if (customDeficit.value) return customDeficit.value
    const def: Record<string, number> = {}
    if (settingsStore.farmingAllowCrafting) {
      if (plannerStore.resolvedRawDeficit) {
        for (const item of plannerStore.resolvedRawDeficit) {
          if (item.count > 0) {
            def[item.id] = item.count
          }
        }
      }
    } else {
      for (const item of plannerStore.aggregatedDemand?.items ?? []) {
        const have = depotStore.getItemCount(item.id)
        const missing = Math.max(0, item.count - have)
        if (missing > 0) {
          def[item.id] = missing
        }
      }
    }

    // LMD deficit ('4001', including workshop crafting LMD when farmingAllowCrafting is enabled)
    const baseLmd = plannerStore.aggregatedDemand?.lmd ?? 0
    const craftLmd = settingsStore.farmingAllowCrafting
      ? (plannerStore.resolvedCraftLmdCost ?? 0)
      : 0
    const missingLmd = Math.max(0, baseLmd + craftLmd - (depotStore.currencies?.lmd ?? 0))
    if (missingLmd > 0) {
      def['4001'] = missingLmd
    }

    // Total EXP deficit from planned EXP cards ('2001'–'2004') minus depot stock in EXP-equivalent
    let plannedExp = 0
    const plannedCards = plannerStore.plannedExpCards?.cards ?? {}
    for (const [cardId, expVal] of Object.entries(EXP_CARD_VALUES)) {
      plannedExp += (plannedCards[cardId] ?? 0) * expVal
    }
    if (plannedExp === 0 && (plannerStore.aggregatedDemand?.exp ?? 0) > 0) {
      plannedExp = plannerStore.aggregatedDemand.exp
    }

    let depotExp = 0
    for (const [cardId, expVal] of Object.entries(EXP_CARD_VALUES)) {
      depotExp += depotStore.getItemCount(cardId) * expVal
    }

    let remainingExp = Math.max(0, plannedExp - depotExp)
    if (remainingExp > 0) {
      for (let i = 0; i < SORTED_EXP_CARDS.length; i++) {
        const [cardId, expVal] = SORTED_EXP_CARDS[i]!
        if (remainingExp <= 0) break
        const isSmallest = i === SORTED_EXP_CARDS.length - 1
        const count = isSmallest
          ? Math.ceil(remainingExp / expVal)
          : Math.floor(remainingExp / expVal)
        if (count > 0) {
          def[cardId] = (def[cardId] ?? 0) + count
          remainingExp -= count * expVal
        }
      }
    }

    return def
  })

  const hasDeficit = computed<boolean>(() => {
    return Object.values(activeDeficit.value).some((qty) => qty > 0)
  })

  const optimizationResult = computed(() => {
    return optimizeFarming(activeDeficit.value, activeSnapshot.value, {
      server: activeServer.value,
      maxSanity: settingsStore.farmingMaxSanity,
      regenMinutes: settingsStore.farmingRegenMinutes,
      allowCrafting: settingsStore.farmingAllowCrafting,
      stagesMap: stagesMap.value,
    })
  })

  const openSupplyGroups = computed(() => {
    return getOpenSupplyGroups(selectedDay.value)
  })

  function setSelectedDay(day: number): void {
    if (day >= 1 && day <= 7) {
      selectedDay.value = day
    }
  }

  function setCustomDeficit(deficit: Record<string, number> | null): void {
    customDeficit.value = deficit
  }

  function setData(data: FarmingDataResponse): void {
    const key = data.server === 'CN' ? 'cn' : 'global'
    snapshots.value[key] = data.snapshot
    stagesMap.value = { ...stagesMap.value, ...data.stagesMap }
    itemsMap.value = { ...itemsMap.value, ...data.itemsMap }
    status.value = 'ready'
  }

  function getItemName(itemId: string): string {
    return itemsMap.value[itemId]?.name ?? itemId
  }

  function getItemRarity(itemId: string): 1 | 2 | 3 | 4 | 5 {
    return itemsMap.value[itemId]?.rarity ?? 1
  }

  function getItemIconId(itemId: string): string | undefined {
    return itemsMap.value[itemId]?.iconId
  }

  async function loadData(
    server: 'global' | 'cn' = activeServer.value,
    fetcher: JsonFetcher = fetchJson,
  ): Promise<void> {
    const key = server === 'cn' ? 'cn' : 'global'
    if (snapshots.value[key]) return

    status.value = 'loading'
    error.value = null
    try {
      const data = await fetchFarmingData(server, fetcher)
      setData(data)
    } catch (err) {
      status.value = 'error'
      error.value = (err as Error).message
    }
  }

  watch(
    () => activeServer.value,
    (newServer) => {
      if (status.value !== 'idle') {
        const fetcher = import.meta.server ? asJsonFetcher(useRequestFetch()) : fetchJson
        void loadData(newServer, fetcher)
      }
    },
  )

  async function init(): Promise<void> {
    selectedDay.value = currentServerDay.value
    const fetcher = import.meta.server ? asJsonFetcher(useRequestFetch()) : fetchJson
    await loadData(activeServer.value, fetcher)
  }

  return {
    status,
    error,
    selectedDay,
    activeServer,
    activeSnapshot,
    stagesMap,
    itemsMap,
    currentServerDay,
    isSnapshotOutdated,
    activeDeficit,
    hasDeficit,
    optimizationResult,
    openSupplyGroups,
    setSelectedDay,
    setCustomDeficit,
    setData,
    loadData,
    getItemName,
    getItemRarity,
    getItemIconId,
    init,
  }
})
