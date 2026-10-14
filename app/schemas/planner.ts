import {
  CURRENT_PLANNER_SCHEMA_VERSION,
  PlanItemSchema,
  PlannerDataSchema,
  type PlanItem,
  type PlannerData,
} from '#shared/utils/planner/types'
export {
  CURRENT_PLANNER_SCHEMA_VERSION,
  PlanItemSchema,
  PlannerDataSchema,
  type PlanItem,
  type PlannerData,
} from '#shared/utils/planner/types'

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

export interface PlannerImportPreview {
  plansToAdd: PlanItem[]
  plansToUpdate: PlanItem[]
  totalIncoming: number
}

/**
 * Calculates which plans will be newly added vs existing plans updated.
 */
export function computePlannerImportPreview(
  currentPlans: PlanItem[],
  incomingPlans: PlanItem[],
): PlannerImportPreview {
  const currentMap = new Map<string, PlanItem>()
  for (const p of currentPlans) {
    currentMap.set(p.operatorId, p)
  }

  const plansToAdd: PlanItem[] = []
  const plansToUpdate: PlanItem[] = []

  for (const incoming of incomingPlans) {
    if (currentMap.has(incoming.operatorId)) {
      plansToUpdate.push(incoming)
    } else {
      plansToAdd.push(incoming)
    }
  }

  return {
    plansToAdd,
    plansToUpdate,
    totalIncoming: incomingPlans.length,
  }
}
