import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { useSettingsStore } from './settings'
import { usePlannerStore } from './planner'
import { useDepotStore } from './depot'
import type { PenguinMatrixSnapshot } from '~/../shared/schemas/farming'
import type { Stage } from '~/../shared/schemas/stage'
import { optimizeFarming, getServerDayOfWeek, getOpenSupplyGroups } from '~/../shared/utils/farming'

// Local static snapshots (offline-first, no runtime network queries to Penguin)
import cnDataRaw from '~/../data/penguin/cn.json'
import usDataRaw from '~/../data/penguin/us.json'
import benchmarkDataRaw from '~/../data/penguin/benchmark.json'
import stagesDataRaw from '~/../data/stages.json'

const cnSnapshot = cnDataRaw as PenguinMatrixSnapshot
const usSnapshot = usDataRaw as PenguinMatrixSnapshot
const benchmarkSnapshot = benchmarkDataRaw as PenguinMatrixSnapshot
const stagesMap = stagesDataRaw as Record<string, Stage>

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

export const useFarmingStore = defineStore('farming', () => {
  const settingsStore = useSettingsStore()
  const plannerStore = usePlannerStore()
  const depotStore = useDepotStore()

  const status = ref<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const error = ref<string | null>(null)
  const customDeficit = ref<Record<string, number> | null>(null)
  const selectedDay = ref<number>(getServerDayOfWeek(new Date(), settingsStore.dropDataServer))

  const activeServer = computed<'cn' | 'global'>(() => settingsStore.dropDataServer)

  const activeSnapshot = computed<PenguinMatrixSnapshot>(() => {
    if (activeServer.value === 'cn') {
      return cnSnapshot || benchmarkSnapshot
    }
    return usSnapshot || benchmarkSnapshot
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
    if (plannerStore.resolvedRawDeficit) {
      for (const item of plannerStore.resolvedRawDeficit) {
        if (item.count > 0) {
          def[item.id] = item.count
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
      stagesMap,
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

  async function init(): Promise<void> {
    status.value = 'loading'
    error.value = null
    try {
      selectedDay.value = currentServerDay.value
      status.value = 'ready'
    } catch (err) {
      status.value = 'error'
      error.value = (err as Error).message
    }
  }

  return {
    status,
    error,
    selectedDay,
    activeServer,
    activeSnapshot,
    currentServerDay,
    isSnapshotOutdated,
    activeDeficit,
    hasDeficit,
    optimizationResult,
    openSupplyGroups,
    setSelectedDay,
    setCustomDeficit,
    init,
  }
})
