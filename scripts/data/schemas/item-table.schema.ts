import { z } from 'zod'

/**
 * Raw item table schema from Arknights game data (item_table.json).
 * Retains extra fields via passthrough while validating essential fields.
 */
export const RawItemSchema = z
  .object({
    itemId: z.string(),
    name: z.string(),
    description: z.string().nullable().optional(),
    rarity: z.union([z.number(), z.string()]),
    iconId: z.string().optional(),
    overrideBkg: z.string().nullable().optional(),
    classifyType: z.string().optional(),
    itemType: z.string().optional(),
    stageDropList: z
      .array(
        z
          .object({
            stageId: z.string(),
            occPer: z.string().optional(),
          })
          .passthrough(),
      )
      .optional(),
    buildingProductList: z
      .array(
        z
          .object({
            roomType: z.string(),
            formulaId: z.string(),
          })
          .passthrough(),
      )
      .optional(),
  })
  .passthrough()

export const RawItemTableSchema = z
  .object({
    items: z.record(z.string(), RawItemSchema),
  })
  .passthrough()

export type RawItem = z.infer<typeof RawItemSchema>
export type RawItemTable = z.infer<typeof RawItemTableSchema>
