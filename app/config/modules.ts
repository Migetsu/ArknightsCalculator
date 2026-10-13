export type ModuleStatus = 'ready' | 'soon'

export interface AppModuleConfig {
  id: string
  route: string
  code: string
  icon: string
  nameKey: string
  descriptionKey: string
  status: ModuleStatus
}

export const APP_MODULES: readonly AppModuleConfig[] = [
  {
    id: 'dashboard',
    route: '/',
    code: 'DSH-00',
    icon: '⊞',
    nameKey: 'navigation.dashboard',
    descriptionKey: 'navigation.dashboardDesc',
    status: 'ready',
  },
  {
    id: 'planner',
    route: '/planner',
    code: 'PLN-01',
    icon: '📋',
    nameKey: 'navigation.planner',
    descriptionKey: 'navigation.plannerDesc',
    status: 'soon',
  },
  {
    id: 'gacha',
    route: '/gacha',
    code: 'GCH-02',
    icon: '✦',
    nameKey: 'navigation.gacha',
    descriptionKey: 'navigation.gachaDesc',
    status: 'soon',
  },
  {
    id: 'recruit',
    route: '/recruit',
    code: 'RCR-03',
    icon: '🔍',
    nameKey: 'navigation.recruit',
    descriptionKey: 'navigation.recruitDesc',
    status: 'soon',
  },
  {
    id: 'operators',
    route: '/operators',
    code: 'OPS-04',
    icon: '👥',
    nameKey: 'navigation.operators',
    descriptionKey: 'navigation.operatorsDesc',
    status: 'ready',
  },
  {
    id: 'depot',
    route: '/depot',
    code: 'INV-05',
    icon: '📦',
    nameKey: 'navigation.depot',
    descriptionKey: 'navigation.depotDesc',
    status: 'soon',
  },
  {
    id: 'settings',
    route: '/settings',
    code: 'SET-06',
    icon: '⚙',
    nameKey: 'navigation.settings',
    descriptionKey: 'navigation.settingsDesc',
    status: 'ready',
  },
] as const

export function getModuleById(id: string): AppModuleConfig | undefined {
  return APP_MODULES.find((m) => m.id === id)
}

export function getModuleByRoute(route: string): AppModuleConfig | undefined {
  return APP_MODULES.find((m) => m.route === route)
}
