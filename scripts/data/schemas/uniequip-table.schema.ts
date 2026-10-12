import { z } from 'zod'

/**
 * Raw uniequip table schema from Arknights game data (uniequip_table.json).
 */
export const RawEquipDictItemSchema = z
  .object({
    uniEquipId: z.string(),
    uniEquipName: z.string(),
    uniEquipIcon: z.string().optional(),
    uniEquipDesc: z.string().optional(),
    type: z.string().optional(),
    typeName2: z.string().nullable().optional(),
    charId: z.string(),
    itemCost: z
      .record(
        z.string(),
        z.array(
          z
            .object({
              id: z.string(),
              count: z.number(),
              type: z.string().optional(),
            })
            .passthrough(),
        ),
      )
      .nullable()
      .optional(),
  })
  .passthrough()

export const RawUniequipTableSchema = z
  .object({
    equipDict: z.record(z.string(), RawEquipDictItemSchema),
    charEquip: z.record(z.string(), z.array(z.string())).optional(),
  })
  .passthrough()

export type RawEquipDictItem = z.infer<typeof RawEquipDictItemSchema>
export type RawUniequipTable = z.infer<typeof RawUniequipTableSchema>
