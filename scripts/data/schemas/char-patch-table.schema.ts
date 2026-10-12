import { z } from 'zod'
import { RawCharacterSchema } from './character-table.schema'

/**
 * Raw char patch table schema from Arknights game data (char_patch_table.json).
 * Contains class change variants for characters (e.g., Amiya Guard/Medic variants).
 */
export const RawCharPatchTableSchema = z
  .object({
    infos: z.record(z.string(), z.object({}).passthrough()).optional(),
    patchChars: z.record(z.string(), RawCharacterSchema),
    unlockConds: z.record(z.string(), z.object({}).passthrough()).optional(),
  })
  .passthrough()

export type RawCharPatchTable = z.infer<typeof RawCharPatchTableSchema>
