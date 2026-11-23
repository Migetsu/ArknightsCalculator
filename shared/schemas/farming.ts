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

export const FarmingItemDetailSchema = z.object({
  itemId: z.string(),
  /** Total requirement: plan demand plus the amount consumed by workshop crafts. */
  required: z.number().nonnegative(),
  /** How much of the requirement is covered by depot stock of the item itself. */
  fromStock: z.number().nonnegative(),
  /** How much is produced by planned workshop crafts. */
  crafted: z.number().nonnegative(),
  /** How much is directly dropped by the selected stages and consumed by the plan. */
  farmed: z.number().nonnegative(),
  /** Requirement that no stage and no craft can cover. */
  missing: z.number().nonnegative(),
})

export type FarmingItemDetail = z.infer<typeof FarmingItemDetailSchema>

export const FarmingOptimizationResultSchema = z.object({
  stages: z.array(FarmingStagePlanSchema),
  totalRuns: z.number().int().nonnegative(),
  totalSanity: z.number().nonnegative(),
  naturalRegenDays: z.number().nonnegative(),
  originitePrimeCost: z.number().int().nonnegative(),
  /** Per-demand-item explanation of where the quantity comes from. */
  itemDetails: z.record(z.string(), FarmingItemDetailSchema).default({}),
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
