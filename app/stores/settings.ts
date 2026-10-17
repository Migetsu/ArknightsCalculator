import { computed } from 'vue'
import { defineStore } from 'pinia'
import { useLocalStorage } from '@vueuse/core'
import type { ServerRegion } from '~/../shared/schemas/operator'

export const useSettingsStore = defineStore('settings', () => {
  // Drop data server controls Penguin Stats source (CN or Global) for farming drop rate calculations.
  // Defaults to 'cn' per spec.
  const dropDataServer = useLocalStorage<ServerRegion>('arkcalc_drop_data_server', 'cn')
  const farmingMaxSanity = useLocalStorage<number>('arkcalc_farming_max_sanity', 135)
  const farmingRegenMinutes = useLocalStorage<number>('arkcalc_farming_regen_minutes', 6)
  const farmingAllowCrafting = useLocalStorage<boolean>('arkcalc_farming_allow_crafting', true)

  function setDropDataServer(server: ServerRegion): void {
    dropDataServer.value = server
  }

  function setFarmingMaxSanity(val: number): void {
    farmingMaxSanity.value = Math.max(1, Math.min(200, Math.round(val)))
  }

  function setFarmingRegenMinutes(val: number): void {
    farmingRegenMinutes.value = Math.max(1, Math.min(60, Math.round(val)))
  }

  function setFarmingAllowCrafting(val: boolean): void {
    farmingAllowCrafting.value = Boolean(val)
  }

  function resetAllSettings(): void {
    dropDataServer.value = 'cn'
    farmingMaxSanity.value = 135
    farmingRegenMinutes.value = 6
    farmingAllowCrafting.value = true
  }

  return {
    dropDataServer,
    setDropDataServer,
    farmingMaxSanity,
    setFarmingMaxSanity,
    farmingRegenMinutes,
    setFarmingRegenMinutes,
    farmingAllowCrafting,
    setFarmingAllowCrafting,
    // Backward compatibility aliases
    defaultServer: computed(() => dropDataServer.value),
    setDefaultServer: setDropDataServer,
    resetAllSettings,
  }
})
