import { describe, expect, it } from 'vitest'
import type { GachaBanner } from '../../../../shared/schemas/banner'
import { getEffectiveGlobalWindow } from '../../../../shared/utils/gacha'

const MS_DAY = 86_400_000

function banner(overrides: Partial<GachaBanner>): GachaBanner {
  return {
    id: 'TEST',
    server: 'cn',
    ruleType: 'LINKAGE',
    type: 'limited',
    tag: 'LINKAGE',
    name: { en: 'Test', zh: 'Test' },
    title: { en: 'Test', zh: 'Test' },
    openTime: Math.floor(Date.parse('2026-06-01T03:00:00Z') / 1000),
    endTime: Math.floor(Date.parse('2026-06-14T19:59:59Z') / 1000),
    durationDays: 14,
    isActive: false,
    rateUp6: [],
    rateUp5: [],
    ...overrides,
  } as GachaBanner
}

describe('getEffectiveGlobalWindow', () => {
  it('uses the confirmed Global window and never the CN end timestamp', () => {
    const window = getEffectiveGlobalWindow(
      banner({
        globalStartDate: '2026/11/16 08:00:00',
        globalEndDate: '2026/11/30 03:59:59',
      }),
      163,
    )

    expect(window).not.toBeNull()
    expect(window!.estimated).toBe(false)
    expect(new Date(window!.startMs).toISOString()).toBe('2026-11-16T08:00:00.000Z')
    // Explicit time in the Global end date is used as-is (no extra day).
    expect(new Date(window!.endMs).toISOString()).toBe('2026-11-30T03:59:59.000Z')
  })

  it('adds one day for a date-only Global end date', () => {
    const window = getEffectiveGlobalWindow(
      banner({ globalStartDate: '2026/11/16', globalEndDate: '2026/11/30' }),
      163,
    )

    expect(new Date(window!.endMs).toISOString()).toBe('2026-11-30T23:59:59.999Z')
  })

  it('estimates the window from the CN start plus the median lag', () => {
    const window = getEffectiveGlobalWindow(banner({ globalStartDate: null }), 163)

    expect(window).not.toBeNull()
    expect(window!.estimated).toBe(true)
    expect(window!.endMs - window!.startMs).toBe(14 * MS_DAY)
  })

  it('returns null when there is neither a Global date nor a usable CN start', () => {
    expect(
      getEffectiveGlobalWindow(
        banner({ globalStartDate: null, cnStartDate: null, openTime: 0 }),
        null,
      ),
    ).toBeNull()
  })
})
