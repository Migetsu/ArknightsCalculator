import { describe, it, expect } from 'vitest'
import {
  APP_MODULES,
  getModuleById,
  getModuleByRoute,
  type AppModuleConfig,
} from '../../../app/config/modules'
import enLocale from '../../../i18n/locales/en.json'
import ruLocale from '../../../i18n/locales/ru.json'

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, part) => {
    if (acc && typeof acc === 'object') {
      return (acc as Record<string, unknown>)[part]
    }
    return undefined
  }, obj)
}

describe('modules registry', () => {
  it('contains expected modules with unique identifiers, routes, and codes', () => {
    expect(APP_MODULES.length).toBeGreaterThanOrEqual(7)

    const ids = APP_MODULES.map((m: AppModuleConfig) => m.id)
    const routes = APP_MODULES.map((m: AppModuleConfig) => m.route)
    const codes = APP_MODULES.map((m: AppModuleConfig) => m.code)

    expect(new Set(ids).size).toBe(ids.length)
    expect(new Set(routes).size).toBe(routes.length)
    expect(new Set(codes).size).toBe(codes.length)
  })

  it('validates module code format (e.g. DSH-00, PLN-01)', () => {
    const codePattern = /^[A-Z]{3}-\d{2}$/
    for (const module of APP_MODULES) {
      expect(module.code).toMatch(codePattern)
    }
  })

  it('ensures all nameKey, descriptionKey, and navKey exist in both en.json and ru.json', () => {
    for (const module of APP_MODULES) {
      const enName = getNestedValue(enLocale as Record<string, unknown>, module.nameKey)
      const ruName = getNestedValue(ruLocale as Record<string, unknown>, module.nameKey)
      const enDesc = getNestedValue(enLocale as Record<string, unknown>, module.descriptionKey)
      const ruDesc = getNestedValue(ruLocale as Record<string, unknown>, module.descriptionKey)
      const enNav = getNestedValue(enLocale as Record<string, unknown>, module.navKey)
      const ruNav = getNestedValue(ruLocale as Record<string, unknown>, module.navKey)

      expect(typeof enName).toBe('string')
      expect(typeof ruName).toBe('string')
      expect(typeof enDesc).toBe('string')
      expect(typeof ruDesc).toBe('string')
      expect(typeof enNav).toBe('string')
      expect(typeof ruNav).toBe('string')
    }
  })

  it('matches design spec module order: Home, Operators, Planner, Depot, Farming, Recruit, Gacha, Settings', () => {
    const expectedOrder = [
      'dashboard',
      'operators',
      'planner',
      'depot',
      'farming',
      'recruit',
      'gacha',
      'settings',
    ]
    expect(APP_MODULES.map((m) => m.id)).toEqual(expectedOrder)
  })

  it('validates farming module configuration', () => {
    const farming = getModuleById('farming')
    expect(farming).toBeDefined()
    expect(farming?.code).toBe('FRM-07')
    expect(farming?.route).toBe('/farming')
    expect(farming?.status).toBe('soon')
  })

  it('finds module by id via getModuleById', () => {
    const planner = getModuleById('planner')
    expect(planner).toBeDefined()
    expect(planner?.code).toBe('PLN-01')
    expect(planner?.route).toBe('/planner')

    const unknown = getModuleById('non-existent')
    expect(unknown).toBeUndefined()
  })

  it('finds module by route via getModuleByRoute', () => {
    const gacha = getModuleByRoute('/gacha')
    expect(gacha).toBeDefined()
    expect(gacha?.code).toBe('GCH-02')
    expect(gacha?.id).toBe('gacha')

    const unknown = getModuleByRoute('/unknown-route')
    expect(unknown).toBeUndefined()
  })
})
