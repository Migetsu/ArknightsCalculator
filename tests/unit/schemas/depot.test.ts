import { describe, it, expect } from 'vitest'
import {
  CURRENT_DEPOT_SCHEMA_VERSION,
  createDefaultDepotData,
  migrateDepotData,
  validateDepotImport,
  DepotDataSchema,
} from '../../../app/schemas/depot'

describe('depot schema & migrations', () => {
  it('creates default depot structure matching CURRENT_DEPOT_SCHEMA_VERSION', () => {
    const def = createDefaultDepotData()
    expect(def.schemaVersion).toBe(CURRENT_DEPOT_SCHEMA_VERSION)
    expect(def.currencies).toEqual({ lmd: 0, orundum: 0, originitePrime: 0 })
    expect(def.items).toEqual({})
    expect(typeof def.updatedAt).toBe('string')
    expect(DepotDataSchema.safeParse(def).success).toBe(true)
  })

  it('validates a correct v1 payload directly without migration', () => {
    const valid = {
      schemaVersion: 1,
      updatedAt: '2026-10-14T00:00:00.000Z',
      currencies: { lmd: 500000, orundum: 3000, originitePrime: 15 },
      items: { '30014': 10, '30013': 25 },
    }
    const res = migrateDepotData(valid)
    expect(res.success).toBe(true)
    expect(res.migrated).toBe(false)
    expect(res.data.currencies.lmd).toBe(500000)
    expect(res.data.items['30014']).toBe(10)
  })

  it('migrates legacy v0 flat object structure to v1', () => {
    const legacy = {
      '30011': 42,
      '30012': 7,
      currencies: {
        lmd: 12345,
      },
    }
    const res = migrateDepotData(legacy)
    expect(res.success).toBe(true)
    expect(res.migrated).toBe(true)
    expect(res.data.schemaVersion).toBe(1)
    expect(res.data.items['30011']).toBe(42)
    expect(res.data.items['30012']).toBe(7)
    expect(res.data.currencies.lmd).toBe(12345)
    expect(res.data.currencies.orundum).toBe(0)
    expect(res.data.currencies.originitePrime).toBe(0)
  })

  it('marks corrupted payloads as corrupted: true and returns fallback data', () => {
    const corruptedPrimitives = [null, undefined, 'not an object', 12345]
    for (const primitive of corruptedPrimitives) {
      const res = migrateDepotData(primitive)
      expect(res.success).toBe(false)
      expect(res.corrupted).toBe(true)
      expect(res.data.schemaVersion).toBe(1)
    }

    const corruptedV1 = {
      schemaVersion: 1,
      currencies: { lmd: -50 }, // negative not allowed
    }
    const resV1 = migrateDepotData(corruptedV1)
    expect(resV1.success).toBe(false)
    expect(resV1.corrupted).toBe(true)
  })

  it('validates raw JSON string import correctly', () => {
    const validJson = JSON.stringify({
      schemaVersion: 1,
      updatedAt: new Date().toISOString(),
      currencies: { lmd: 1000, orundum: 50, originitePrime: 5 },
      items: { '30011': 99 },
    })
    const res = validateDepotImport(validJson)
    expect(res.success).toBe(true)
    expect(res.data?.items['30011']).toBe(99)

    const invalidSyntax = '{ not valid json }'
    const syntaxRes = validateDepotImport(invalidSyntax)
    expect(syntaxRes.success).toBe(false)
    expect(syntaxRes.error).toContain('JSON')

    const invalidData = JSON.stringify({ schemaVersion: 1, currencies: 'not-an-object' })
    const dataRes = validateDepotImport(invalidData)
    expect(dataRes.success).toBe(false)
  })
})
