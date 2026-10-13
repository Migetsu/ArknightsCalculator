import { computed } from 'vue'
import { defineStore } from 'pinia'
import { useLocalStorage } from '@vueuse/core'
import type { ServerRegion } from '~/../shared/schemas/operator'

export const useSettingsStore = defineStore('settings', () => {
  // Drop data server controls Penguin Stats source (CN or Global) for farming drop rate calculations.
  // Defaults to 'cn' per spec.
  const dropDataServer = useLocalStorage<ServerRegion>('arkcalc_drop_data_server', 'cn')

  function setDropDataServer(server: ServerRegion): void {
    dropDataServer.value = server
  }

  function resetAllSettings(): void {
    dropDataServer.value = 'cn'
  }

  return {
    dropDataServer,
    setDropDataServer,
    // Backward compatibility aliases
    defaultServer: computed(() => dropDataServer.value),
    setDefaultServer: setDropDataServer,
    resetAllSettings,
  }
})
