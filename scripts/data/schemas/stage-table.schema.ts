import { z } from 'zod'

/**
 * Raw stage table schema from Arknights game data (stage_table.json).
 * Used for stages, sanity costs, drops, and farming benchmarks.
 */
export const RawStageSchema = z
  .object({
    stageId: z.string(),
    stageType: z.string().optional(),
    difficulty: z.string().optional(),
    zoneId: z.string().optional(),
    code: z.string().nullable().optional(),
    name: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    apCost: z.number().default(0),
    stageDropInfo: z
      .object({
        displayDetailRewards: z
          .array(
            z
              .object({
                id: z.string(),
                dropType: z.union([z.number(), z.string()]).optional(),
                type: z.string().optional(),
              })
              .passthrough(),
          )
          .optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough()

export const RawStageTableSchema = z
  .object({
    stages: z.record(z.string(), RawStageSchema),
  })
  .passthrough()

export type RawStage = z.infer<typeof RawStageSchema>
export type RawStageTable = z.infer<typeof RawStageTableSchema>
