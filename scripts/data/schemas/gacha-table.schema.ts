import { z } from 'zod'

/**
 * Raw gacha table schema from Arknights game data (gacha_table.json).
 * Used for recruitment calculator tags and banners.
 */
export const RawGachaTagSchema = z
  .object({
    tagId: z.number(),
    tagName: z.string(),
    tagGroup: z.number(),
  })
  .passthrough()

export const RawGachaTableSchema = z
  .object({
    gachaTags: z.array(RawGachaTagSchema),
    recruitDetail: z.string().optional(),
    carousel: z.array(z.object({}).passthrough()).optional(),
  })
  .passthrough()

export type RawGachaTag = z.infer<typeof RawGachaTagSchema>
export type RawGachaTable = z.infer<typeof RawGachaTableSchema>
