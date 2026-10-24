import { z } from 'zod'
import { ServerRegionSchema } from './operator'

export const SettingsStateSchema = z
  .object({
    dropDataServer: ServerRegionSchema.default('cn'),
    farmingMaxSanity: z.number().int().min(1).max(200).default(135),
    farmingRegenMinutes: z.number().int().min(1).max(60).default(6),
    farmingAllowCrafting: z.boolean().default(true),
  })
  .passthrough()

export type SettingsState = z.infer<typeof SettingsStateSchema>

export const DEFAULT_SETTINGS_STATE: SettingsState = {
  dropDataServer: 'cn',
  farmingMaxSanity: 135,
  farmingRegenMinutes: 6,
  farmingAllowCrafting: true,
}
