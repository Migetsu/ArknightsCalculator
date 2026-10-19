import { z } from 'zod'

export const ProfileSchema = z.object({
  id: z.string(),
  displayName: z.string().nullable().default(null),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type Profile = z.infer<typeof ProfileSchema>

export const RawProfileSchema = z.object({
  id: z.string(),
  display_name: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
})

export type RawProfile = z.infer<typeof RawProfileSchema>

export function mapRawProfile(raw: RawProfile): Profile {
  return {
    id: raw.id,
    displayName: raw.display_name ?? null,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  }
}
