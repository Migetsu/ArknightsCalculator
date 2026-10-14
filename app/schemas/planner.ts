import { z } from 'zod'
import { OperatorStateSchema } from '~/../shared/utils/planner/types'

export const CURRENT_PLANNER_SCHEMA_VERSION = 1

/**
 * Single operator training goal plan.
 */
export const PlanItemSchema = z.object({
  id: z.string(),
  operatorId: z.string(),
  current: OperatorStateSchema,
  target: OperatorStateSchema,
  priority: z.number().int().default(1),
  note: z.string().default(''),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
})

export type PlanItem = z.infer<typeof PlanItemSchema>

/**
 * Root versioned schema for persistent operator planner state.
 */
export const PlannerDataSchema = z.object({
  schemaVersion: z.literal(CURRENT_PLANNER_SCHEMA_VERSION),
  updatedAt: z.string(),
  plans: z.array(PlanItemSchema).default([]),
})

export type PlannerData = z.infer<typeof PlannerDataSchema>

/**
 * Create a fresh, empty planner data payload.
 */
export function createDefaultPlannerData(): PlannerData {
  return {
    schemaVersion: CURRENT_PLANNER_SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
    plans: [],
  }
}

export interface PlannerMigrationResult {
  success: boolean
  data: PlannerData
  migrated: boolean
  corrupted?: boolean
  error?: string
}

/**
 * Migrate and validate raw stored data to current schema version.
 */
export function migratePlannerData(raw: unknown): PlannerMigrationResult {
  if (!raw || typeof raw !== 'object') {
    return {
      success: false,
      data: createDefaultPlannerData(),
      migrated: false,
      corrupted: true,
      error: 'Stored planner data is not a valid JSON object',
    }
  }

  const obj = raw as Record<string, unknown>

  // Version 1 check
  if (obj.schemaVersion === CURRENT_PLANNER_SCHEMA_VERSION) {
    const parseResult = PlannerDataSchema.safeParse(obj)
    if (parseResult.success) {
      return {
        success: true,
        data: parseResult.data,
        migrated: false,
      }
    }
    return {
      success: false,
      data: createDefaultPlannerData(),
      migrated: false,
      corrupted: true,
      error: parseResult.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', '),
    }
  }

  // If schemaVersion is explicitly set to an unsupported version or object is not recognizable as legacy plans container
  const isLegacyArray = Array.isArray(raw)
  const isLegacyObjectWithPlans = Array.isArray(obj.plans)

  if (!isLegacyArray && !isLegacyObjectWithPlans) {
    return {
      success: false,
      data: createDefaultPlannerData(),
      migrated: false,
      corrupted: true,
      error: 'Unrecognized planner data structure or unknown schemaVersion',
    }
  }

  try {
    const plansArray = isLegacyArray ? raw : (obj.plans as unknown[])
    const validPlans: PlanItem[] = []
    for (const item of plansArray) {
      const parsed = PlanItemSchema.safeParse(item)
      if (parsed.success) {
        validPlans.push(parsed.data)
      }
    }

    const migrated: PlannerData = {
      schemaVersion: CURRENT_PLANNER_SCHEMA_VERSION,
      updatedAt: new Date().toISOString(),
      plans: validPlans,
    }

    return {
      success: true,
      data: migrated,
      migrated: true,
    }
  } catch (err) {
    return {
      success: false,
      data: createDefaultPlannerData(),
      migrated: false,
      corrupted: true,
      error: err instanceof Error ? err.message : 'Planner migration failed',
    }
  }
}

/**
 * Validate imported JSON string against PlannerData schema.
 */
export function validatePlannerImport(jsonString: string): {
  success: boolean
  data?: PlannerData
  error?: string
} {
  try {
    const parsed = JSON.parse(jsonString)
    const migration = migratePlannerData(parsed)
    if (migration.success) {
      return { success: true, data: migration.data }
    }
    return { success: false, error: migration.error || 'Invalid planner data format' }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? `JSON syntax error: ${err.message}` : 'Failed to parse JSON',
    }
  }
}
