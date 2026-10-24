import { z } from 'zod'

export const CURRENT_DEPOT_SCHEMA_VERSION = 1

/**
 * Currency balances stored in the depot.
 */
export const DepotCurrenciesSchema = z.object({
  lmd: z.number().int().min(0).default(0),
  orundum: z.number().int().min(0).default(0),
  originitePrime: z.number().int().min(0).default(0),
})

export type DepotCurrencies = z.infer<typeof DepotCurrenciesSchema>

/**
 * Map of item ID to quantity stored in inventory.
 */
export const DepotItemsSchema = z.record(z.string(), z.number().int().min(0))

export type DepotItems = z.infer<typeof DepotItemsSchema>

/**
 * Versioned schema for persistent depot state and JSON export/import.
 */
export const DepotDataSchema = z.object({
  schemaVersion: z.literal(CURRENT_DEPOT_SCHEMA_VERSION),
  updatedAt: z.string(),
  currencies: DepotCurrenciesSchema.default({ lmd: 0, orundum: 0, originitePrime: 0 }),
  items: DepotItemsSchema.default({}),
})

export type DepotData = z.infer<typeof DepotDataSchema>

/**
 * Create a fresh, empty depot data payload.
 */
export function createDefaultDepotData(): DepotData {
  return {
    schemaVersion: CURRENT_DEPOT_SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
    currencies: {
      lmd: 0,
      orundum: 0,
      originitePrime: 0,
    },
    items: {},
  }
}
