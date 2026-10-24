import { z } from 'zod'
import { PlanItemSchema } from '../utils/planner/types'
import { SettingsStateSchema, DEFAULT_SETTINGS_STATE } from './settings'
import { DepotDataSchema } from './depot'

export const UserDataRowSchema = z.object({
  user_id: z.string().uuid(),
  plans: z.array(PlanItemSchema).default([]),
  settings: SettingsStateSchema.default(DEFAULT_SETTINGS_STATE),
  depot: DepotDataSchema.partial().default({}),
  roster_synced_at: z.string().datetime().nullable(),
  updated_at: z.string().datetime(),
})

export type UserDataRow = z.infer<typeof UserDataRowSchema>

export const UserDataPayloadSchema = UserDataRowSchema.omit({
  user_id: true,
  updated_at: true,
})

export type UserDataPayload = z.infer<typeof UserDataPayloadSchema>
