import { describe, it, expect } from 'vitest'
import {
  UserDataRowSchema,
  UserDataPayloadSchema,
  type UserDataRow,
} from '../../../../shared/schemas/userData'

describe('UserData schemas (UserDataRowSchema & UserDataPayloadSchema)', () => {
  const validRow: UserDataRow = {
    user_id: '11111111-1111-4111-a111-111111111111',
    plans: [
      {
        id: 'plan-1',
        operatorId: 'char_002_amiya',
        current: { elite: 0, level: 1, skillLevel: 1, skills: {}, modules: {} },
        target: { elite: 2, level: 50, skillLevel: 7, skills: {}, modules: {} },
        priority: 1,
        note: '',
        createdAt: '2026-10-24T10:00:00.000Z',
      },
    ],
    settings: {
      dropDataServer: 'global',
      farmingMaxSanity: 135,
      farmingRegenMinutes: 6,
      farmingAllowCrafting: true,
    },
    depot: {
      schemaVersion: 1,
      updatedAt: '2026-10-24T10:00:00.000Z',
      currencies: { lmd: 50000, orundum: 0, originitePrime: 0 },
      items: { '30012': 10 },
    },
    roster_synced_at: '2026-10-24T10:00:00.000Z',
    updated_at: '2026-10-24T12:00:00.000Z',
  }

  it('validates a completely correct UserDataRow payload', () => {
    const parsed = UserDataRowSchema.safeParse(validRow)
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.user_id).toBe('11111111-1111-4111-a111-111111111111')
      expect(parsed.data.plans.length).toBe(1)
      expect(parsed.data.settings.dropDataServer).toBe('global')
      expect(parsed.data.depot.items?.['30012']).toBe(10)
    }
  })

  it('fails validation when plans contains invalid plan structure', () => {
    const invalidPlansRow = {
      ...validRow,
      plans: [
        {
          id: 'plan-invalid',
          operatorId: 'char_002_amiya',
          // missing current, target, createdAt
        },
      ],
    }

    const parsed = UserDataRowSchema.safeParse(invalidPlansRow)
    expect(parsed.success).toBe(false)
  })

  it('fails validation when depot contains invalid items data', () => {
    const invalidDepotRow = {
      ...validRow,
      depot: {
        items: {
          '30012': -5, // negative count violates depot schema min(0)
        },
      },
    }

    const parsed = UserDataRowSchema.safeParse(invalidDepotRow)
    expect(parsed.success).toBe(false)
  })

  it('applies defaults when optional fields are empty or omitted', () => {
    const minimalRow = {
      user_id: '22222222-2222-4222-a222-222222222222',
      updated_at: '2026-10-24T12:00:00.000Z',
      roster_synced_at: null,
    }

    const parsed = UserDataRowSchema.safeParse(minimalRow)
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.plans).toEqual([])
      expect(parsed.data.settings.dropDataServer).toBe('cn')
      expect(parsed.data.settings.farmingMaxSanity).toBe(135)
      expect(parsed.data.depot).toEqual({})
    }
  })

  it('validates UserDataRow with Postgres timestamptz timezone offset and microseconds', () => {
    const postgresRow = {
      user_id: '48bdc6c4-da62-472f-931a-2605e26d3f3c',
      updated_at: '2026-10-25T07:26:58.577316+00:00',
      roster_synced_at: '2026-10-25 07:26:56.35+00',
    }

    const parsed = UserDataRowSchema.safeParse(postgresRow)
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.updated_at).toBe('2026-10-25T07:26:58.577316+00:00')
      expect(parsed.data.roster_synced_at).toBe('2026-10-25 07:26:56.35+00')
    }
  })

  it('fails validation when updated_at is not a valid datetime string', () => {
    const invalidDateRow = {
      user_id: '48bdc6c4-da62-472f-931a-2605e26d3f3c',
      updated_at: 'not-a-datetime',
      roster_synced_at: null,
    }

    const parsed = UserDataRowSchema.safeParse(invalidDateRow)
    expect(parsed.success).toBe(false)
  })

  it('validates UserDataPayloadSchema (omits user_id and updated_at)', () => {
    const payload = {
      plans: validRow.plans,
      settings: validRow.settings,
      depot: validRow.depot,
      roster_synced_at: validRow.roster_synced_at,
    }

    const parsed = UserDataPayloadSchema.safeParse(payload)
    expect(parsed.success).toBe(true)
  })
})
