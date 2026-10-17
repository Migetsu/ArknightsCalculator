import { z } from 'zod'

export const PenguinDropItemSchema = z.object({
  itemId: z.string(),
  quantity: z.number().int().nonnegative(),
  times: z.number().int().positive(),
  dropRate: z.number().nonnegative(),
  stdDev: z.number().optional(),
})

export type PenguinDropItem = z.infer<typeof PenguinDropItemSchema>

export const PenguinStageMatrixSchema = z.object({
  stageId: z.string(),
  code: z.string(),
  apCost: z.number().nonnegative(),
  exist: z.boolean().optional(),
  openTime: z.number().optional(),
  closeTime: z.number().nullable().optional(),
  drops: z.array(PenguinDropItemSchema),
})

export type PenguinStageMatrix = z.infer<typeof PenguinStageMatrixSchema>

export const PenguinMatrixSnapshotSchema = z.object({
  server: z.enum(['CN', 'US']),
  fetchedAt: z.string(),
  minSampleSize: z.number().int().positive(),
  stages: z.record(z.string(), PenguinStageMatrixSchema),
})

export type PenguinMatrixSnapshot = z.infer<typeof PenguinMatrixSnapshotSchema>

export const FarmedItemContributionSchema = z.object({
  itemId: z.string(),
  expectedQuantity: z.number().nonnegative(),
  targetQuantity: z.number().nonnegative(),
  dropRate: z.number().nonnegative().optional(),
})

export type FarmedItemContribution = z.infer<typeof FarmedItemContributionSchema>

export const FarmingStagePlanSchema = z.object({
  stageId: z.string(),
  code: z.string(),
  apCost: z.number().nonnegative(),
  runs: z.number().int().nonnegative(),
  sanity: z.number().nonnegative(),
  contributions: z.array(FarmedItemContributionSchema),
  primaryItemId: z.string().optional(),
})

export type FarmingStagePlan = z.infer<typeof FarmingStagePlanSchema>

export const FarmingOptimizationResultSchema = z.object({
  stages: z.array(FarmingStagePlanSchema),
  totalRuns: z.number().int().nonnegative(),
  totalSanity: z.number().nonnegative(),
  naturalRegenDays: z.number().nonnegative(),
  originitePrimeCost: z.number().int().nonnegative(),
  uncoveredItems: z.array(
    z.object({
      itemId: z.string(),
      remainingQuantity: z.number().nonnegative(),
    }),
  ),
})

export type FarmingOptimizationResult = z.infer<typeof FarmingOptimizationResultSchema>

export const SupplyStageGroupSchema = z.object({
  zoneId: z.string(),
  name: z.string(),
  codePrefix: z.string(),
  daysOfWeek: z.array(z.number().int().min(1).max(7)),
  type: z.enum(['EVOLVE', 'MATERIAL', 'SPECIAL']),
  classes: z.array(z.string()).optional(),
  rewardDescription: z.string(),
  stages: z.array(
    z.object({
      stageId: z.string(),
      code: z.string(),
      apCost: z.number().nonnegative(),
    }),
  ),
})

export type SupplyStageGroup = z.infer<typeof SupplyStageGroupSchema>
