import { describe, it, expect } from 'vitest'

interface NuxtRouteRecord {
  name?: string
  path: string
}

export function filterDevOnlyRoutes(
  routes: NuxtRouteRecord[],
  isProduction: boolean,
): NuxtRouteRecord[] {
  if (!isProduction) return routes
  return routes.filter((route) => route.name !== '_ui' && !route.path.includes('/_ui'))
}

describe('filterDevOnlyRoutes', () => {
  const samplePages: NuxtRouteRecord[] = [
    { name: 'index', path: '/' },
    { name: 'operators', path: '/operators' },
    { name: '_ui', path: '/_ui' },
  ]

  it('keeps _ui showcase routes when not in production environment', () => {
    const result = filterDevOnlyRoutes([...samplePages], false)
    expect(result.some((r) => r.path.includes('_ui'))).toBe(true)
    expect(result.length).toBe(3)
  })

  it('filters out _ui showcase routes when in production environment', () => {
    const result = filterDevOnlyRoutes([...samplePages], true)
    expect(result.some((r) => r.path.includes('_ui'))).toBe(false)
    expect(result.length).toBe(2)
  })
})
