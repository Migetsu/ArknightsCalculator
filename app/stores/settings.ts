import { defineStore } from 'pinia'
import { useLocalStorage } from '@vueuse/core'
import type { ServerRegion } from '~/../shared/schemas/operator'

export const useSettingsStore = defineStore('settings', () => {
  const defaultServer = useLocalStorage<ServerRegion>('arkcalc_default_server', 'global')

  function setDefaultServer(server: ServerRegion): void {
    defaultServer.value = server
  }

  function resetAllSettings(): void {
    defaultServer.value = 'global'
  }

  return {
    defaultServer,
    setDefaultServer,
    resetAllSettings,
  }
})
