import { z } from 'zod'

/**
 * Raw handbook info table schema from Arknights game data (handbook_info_table.json).
 * Used for operator lore, artist, and voice actor credits.
 */
export const RawHandbookItemSchema = z
  .object({
    charID: z.string(),
    infoName: z.string().optional(),
    storyTextAudio: z.array(z.object({}).passthrough()).optional(),
    handbookAvgList: z.array(z.object({}).passthrough()).optional(),
    drawName: z.string().optional(),
    voiceName: z.string().optional(),
  })
  .passthrough()

export const RawHandbookInfoTableSchema = z
  .object({
    handbookDict: z.record(z.string(), RawHandbookItemSchema),
  })
  .passthrough()

export type RawHandbookItem = z.infer<typeof RawHandbookItemSchema>
export type RawHandbookInfoTable = z.infer<typeof RawHandbookInfoTableSchema>
