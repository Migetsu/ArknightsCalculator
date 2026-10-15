import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { useSettingsStore } from './settings'
import { usePlannerStore } from './planner'
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

export const useFarmingStore = defineStore('farming', () => {
  const settingsStore = useSettingsStore()
  const plannerStore = usePlannerStore()

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

  // Raw deficit from planner or custom override
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
