import { z } from 'zod'
import { YostarOperatorSchema } from '~~/shared/schemas/yostar'

/**
 * Persisted roster imported from a Yostar sync.
 *
 * Only gameplay state is stored: no e-mail, no uid, no token. The roster is a
 * local snapshot; the next sync replaces it.
 */

export const CURRENT_ROSTER_SCHEMA_VERSION = 1

export const RosterOperatorSchema = YostarOperatorSchema
export type RosterOperator = z.infer<typeof RosterOperatorSchema>

export const RosterDoctorSchema = z.object({
  name: z.string(),
  level: z.number().int().min(1),
})
export type RosterDoctor = z.infer<typeof RosterDoctorSchema>

export const RosterDataSchema = z.object({
  schemaVersion: z.literal(CURRENT_ROSTER_SCHEMA_VERSION),
  updatedAt: z.string(),
  /** Timestamp reported by the sync that produced this snapshot, null when never synced. */
  syncedAt: z.string().nullable().default(null),
  server: z.literal('en'),
  doctor: RosterDoctorSchema,
  /** charId -> owned operator state. */
  operators: z.record(z.string(), RosterOperatorSchema),
})

export type RosterData = z.infer<typeof RosterDataSchema>

export function createEmptyRosterData(): RosterData {
  return {
    schemaVersion: CURRENT_ROSTER_SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
    syncedAt: null,
    server: 'en',
    doctor: { name: '', level: 1 },
    operators: {},
  }
}
