import { z } from 'zod'
import { I18nStringSchema, ServerRegionSchema } from './operator'

export const StageSchema = z.object({
  stageId: z.string().min(1),
  code: z.string().min(1),
  name: I18nStringSchema,
  stageType: z.string(),
  zoneId: z.string().optional(),
  apCost: z.number().optional(),
  matchedGameData: z.boolean(),
  servers: z.array(ServerRegionSchema).min(1),
})

export type Stage = z.infer<typeof StageSchema>

export const StagesDictionarySchema = z.record(z.string(), StageSchema)
export type StagesDictionary = z.infer<typeof StagesDictionarySchema>
