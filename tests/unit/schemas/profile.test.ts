import { describe, it, expect } from 'vitest'
import { ProfileSchema, RawProfileSchema, mapRawProfile } from '../../../shared/schemas/profile'

describe('Profile schema and mapping', () => {
  it('validates a valid Profile object', () => {
    const validProfile = {
      id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      displayName: 'Doctor Kaltsit',
      createdAt: '2026-10-19T10:00:00Z',
      updatedAt: '2026-10-19T10:00:00Z',
    }

    const result = ProfileSchema.safeParse(validProfile)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.displayName).toBe('Doctor Kaltsit')
    }
  })

  it('allows null displayName in Profile schema', () => {
    const profileNullName = {
      id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      displayName: null,
      createdAt: '2026-10-19T10:00:00Z',
      updatedAt: '2026-10-19T10:00:00Z',
    }

    const result = ProfileSchema.safeParse(profileNullName)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.displayName).toBeNull()
    }
  })

  it('parses raw database profile and maps to camelCase Profile', () => {
    const raw = {
      id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      display_name: 'Amiya',
      created_at: '2026-10-19T12:00:00Z',
      updated_at: '2026-10-19T12:30:00Z',
    }

    const parsedRaw = RawProfileSchema.parse(raw)
    const mapped = mapRawProfile(parsedRaw)

    expect(mapped.id).toBe('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11')
    expect(mapped.displayName).toBe('Amiya')
    expect(mapped.createdAt).toBe('2026-10-19T12:00:00Z')
    expect(mapped.updatedAt).toBe('2026-10-19T12:30:00Z')
  })

  it('maps missing/undefined display_name to null', () => {
    const rawWithoutName = {
      id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      created_at: '2026-10-19T12:00:00Z',
      updated_at: '2026-10-19T12:00:00Z',
    }

    const parsed = RawProfileSchema.parse(rawWithoutName)
    const mapped = mapRawProfile(parsed)
    expect(mapped.displayName).toBeNull()
  })
})
