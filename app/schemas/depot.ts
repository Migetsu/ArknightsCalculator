import {
  CURRENT_DEPOT_SCHEMA_VERSION,
  DepotCurrenciesSchema,
  type DepotCurrencies,
  DepotItemsSchema,
  type DepotItems,
  DepotDataSchema,
  type DepotData,
  createDefaultDepotData,
} from '~~/shared/schemas/depot'

export {
  CURRENT_DEPOT_SCHEMA_VERSION,
  DepotCurrenciesSchema,
  type DepotCurrencies,
  DepotItemsSchema,
  type DepotItems,
  DepotDataSchema,
  type DepotData,
  createDefaultDepotData,
}

export interface MigrationResult {
  success: boolean
  data: DepotData
  migrated: boolean
  corrupted?: boolean
  error?: string
}

/**
 * Migrate and validate raw stored data to current schema version.
 * If data is corrupted and cannot be repaired, preserves the raw payload for backup.
 */
export function migrateDepotData(raw: unknown): MigrationResult {
  if (!raw || typeof raw !== 'object') {
    return {
      success: false,
      data: createDefaultDepotData(),
      migrated: false,
      corrupted: true,
      error: 'Stored data is not a valid JSON object',
    }
  }

  const obj = raw as Record<string, unknown>

  // Version 1 check
  if (obj.schemaVersion === CURRENT_DEPOT_SCHEMA_VERSION) {
    const parseResult = DepotDataSchema.safeParse(obj)
    if (parseResult.success) {
      return {
        success: true,
        data: parseResult.data,
        migrated: false,
      }
    }
    return {
      success: false,
      data: createDefaultDepotData(),
      migrated: false,
      corrupted: true,
      error: parseResult.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', '),
    }
  }

  // Legacy format (v0) where raw was either flat item dictionary or partial object without schemaVersion
  try {
    const migratedItems: Record<string, number> = {}
    const rawItems = (
      typeof obj.items === 'object' && obj.items !== null ? obj.items : obj
    ) as Record<string, unknown>

    for (const [id, count] of Object.entries(rawItems)) {
      if (
        typeof count === 'number' &&
        Number.isFinite(count) &&
        count >= 0 &&
        id !== 'currencies' &&
        id !== 'schemaVersion'
      ) {
        migratedItems[id] = Math.floor(count)
      }
    }

    const rawCurrencies = (
      typeof obj.currencies === 'object' && obj.currencies !== null ? obj.currencies : {}
    ) as Record<string, unknown>
    const lmd =
      typeof rawCurrencies.lmd === 'number' && rawCurrencies.lmd >= 0
        ? Math.floor(rawCurrencies.lmd)
        : 0
    const orundum =
      typeof rawCurrencies.orundum === 'number' && rawCurrencies.orundum >= 0
        ? Math.floor(rawCurrencies.orundum)
        : 0
    const originitePrime =
      typeof rawCurrencies.originitePrime === 'number' && rawCurrencies.originitePrime >= 0
        ? Math.floor(rawCurrencies.originitePrime)
        : 0

    const migrated: DepotData = {
      schemaVersion: CURRENT_DEPOT_SCHEMA_VERSION,
      updatedAt: new Date().toISOString(),
      currencies: { lmd, orundum, originitePrime },
      items: migratedItems,
    }

    return {
      success: true,
      data: migrated,
      migrated: true,
    }
  } catch (err) {
    return {
      success: false,
      data: createDefaultDepotData(),
      migrated: false,
      corrupted: true,
      error: err instanceof Error ? err.message : 'Migration failed',
    }
  }
}

/**
 * Validate imported JSON string against DepotData schema.
 */
export function validateDepotImport(jsonString: string): {
  success: boolean
  data?: DepotData
  error?: string
} {
  try {
    const parsed = JSON.parse(jsonString)
    const migration = migrateDepotData(parsed)
    if (migration.success) {
      return { success: true, data: migration.data }
    }
    return { success: false, error: migration.error || 'Invalid depot data format' }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? `JSON syntax error: ${err.message}` : 'Failed to parse JSON',
    }
  }
}
