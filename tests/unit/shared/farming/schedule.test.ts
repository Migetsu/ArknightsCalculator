import { describe, it, expect } from 'vitest'
import {
  getServerDayOfWeek,
  getOpenSupplyGroups,
  isSupplyZoneOpen,
} from '../../../../shared/utils/farming/schedule'

describe('Farming Supply Schedule & Server Reset', () => {
  describe('getServerDayOfWeek boundaries (03:59:59 vs 04:00:00)', () => {
    it('Global server (UTC-7): before 04:00 server time (10:59 UTC) belongs to previous day', () => {
      // Wednesday 2026-10-14 03:59:59 UTC-7 = 10:59:59 UTC
      const date = new Date('2026-10-14T10:59:59.000Z')
      const day = getServerDayOfWeek(date, 'global')
      // Server local is 03:59 on Wednesday -> in-game day is Tuesday (2)
      expect(day).toBe(2)
    })

    it('Global server (UTC-7): at exactly 04:00 server time (11:00 UTC) rolls over to new day', () => {
      // Wednesday 2026-10-14 04:00:00 UTC-7 = 11:00:00 UTC
      const date = new Date('2026-10-14T11:00:00.000Z')
      const day = getServerDayOfWeek(date, 'global')
      // Server local is 04:00 on Wednesday -> in-game day is Wednesday (3)
      expect(day).toBe(3)
    })

    it('CN server (UTC+8): before 04:00 server time (2026-10-13 19:59 UTC) belongs to previous day', () => {
      // Wednesday 2026-10-14 03:59:59 UTC+8 = Tuesday 2026-10-13 19:59:59 UTC
      const date = new Date('2026-10-13T19:59:59.000Z')
      const day = getServerDayOfWeek(date, 'cn')
      // Server local is 03:59 on Wednesday -> in-game day is Tuesday (2)
      expect(day).toBe(2)
    })

    it('CN server (UTC+8): at exactly 04:00 server time (2026-10-13 20:00 UTC) rolls over to new day', () => {
      // Wednesday 2026-10-14 04:00:00 UTC+8 = Tuesday 2026-10-13 20:00:00 UTC
      const date = new Date('2026-10-13T20:00:00.000Z')
      const day = getServerDayOfWeek(date, 'cn')
      // Server local is 04:00 on Wednesday -> in-game day is Wednesday (3)
      expect(day).toBe(3)
    })

    it('handles Sunday into Monday rollover: Sunday 03:59 server time is Saturday', () => {
      // Sunday 2026-10-18 03:59:00 UTC-7 = 10:59:00 UTC
      const date = new Date('2026-10-18T10:59:00.000Z')
      const day = getServerDayOfWeek(date, 'global')
      expect(day).toBe(6) // Saturday
    })

    it('handles Monday 03:59 server time as Sunday (Day 7)', () => {
      // Monday 2026-10-19 03:59:00 UTC-7 = 10:59:00 UTC
      const date = new Date('2026-10-19T10:59:00.000Z')
      const day = getServerDayOfWeek(date, 'global')
      expect(day).toBe(7) // Sunday
    })

    it('handles Monday 04:00 server time as Monday (Day 1)', () => {
      // Monday 2026-10-19 04:00:00 UTC-7 = 11:00:00 UTC
      const date = new Date('2026-10-19T11:00:00.000Z')
      const day = getServerDayOfWeek(date, 'global')
      expect(day).toBe(1) // Monday
    })
  })

  describe('Supply Schedule Groups', () => {
    it('Tactical Drill (LS) is open all 7 days of the week', () => {
      for (let day = 1; day <= 7; day++) {
        expect(isSupplyZoneOpen('weekly_7', day)).toBe(true)
      }
    })

    it('Solid Defense (PR-A: Defender/Medic) is open Mon, Thu, Fri, Sun', () => {
      expect(isSupplyZoneOpen('weekly_1', 1)).toBe(true) // Mon
      expect(isSupplyZoneOpen('weekly_1', 2)).toBe(false) // Tue
      expect(isSupplyZoneOpen('weekly_1', 3)).toBe(false) // Wed
      expect(isSupplyZoneOpen('weekly_1', 4)).toBe(true) // Thu
      expect(isSupplyZoneOpen('weekly_1', 5)).toBe(true) // Fri
      expect(isSupplyZoneOpen('weekly_1', 6)).toBe(false) // Sat
      expect(isSupplyZoneOpen('weekly_1', 7)).toBe(true) // Sun
    })

    it('Cargo Escort (CE: LMD) is open Tue, Thu, Sat, Sun', () => {
      expect(isSupplyZoneOpen('weekly_9', 1)).toBe(false) // Mon
      expect(isSupplyZoneOpen('weekly_9', 2)).toBe(true) // Tue
      expect(isSupplyZoneOpen('weekly_9', 3)).toBe(false) // Wed
      expect(isSupplyZoneOpen('weekly_9', 4)).toBe(true) // Thu
      expect(isSupplyZoneOpen('weekly_9', 5)).toBe(false) // Fri
      expect(isSupplyZoneOpen('weekly_9', 6)).toBe(true) // Sat
      expect(isSupplyZoneOpen('weekly_9', 7)).toBe(true) // Sun
    })

    it('getOpenSupplyGroups returns correct set of stages for Wednesday (Day 3)', () => {
      const openGroups = getOpenSupplyGroups(3)
      const prefixes = openGroups.map((g) => g.codePrefix).sort()
      // Wednesday: PR-C (Vanguard/Supporter), PR-D (Guard/Specialist), CA (Aerial Threat), SK (Resource Search), LS (Tactical Drill)
      expect(prefixes).toEqual(['CA', 'LS', 'PR-C', 'PR-D', 'SK'])
    })
  })
})
