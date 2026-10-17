import type { SupplyStageGroup } from '../../schemas/farming'

/**
 * Server time offsets in milliseconds relative to UTC.
 * CN: UTC+8 (Beijing/Shanghai)
 * Global: UTC-7 (Pacific Standard without daylight saving shift, canonical Yostar reset)
 */
export const SERVER_TIMEZONE_OFFSETS: Record<'cn' | 'global', number> = {
  cn: 8 * 3600 * 1000,
  global: -7 * 3600 * 1000,
}

/**
 * Daily reset occurs at 04:00:00 local server time.
 */
export const DAILY_RESET_HOUR = 4

/**
 * Calculates in-game day of the week (1 = Monday, ..., 7 = Sunday)
 * taking into account server timezone and 04:00 daily reset.
 *
 * Example:
 * Wednesday 03:59:59 server time is still Tuesday (Day 2).
 * Wednesday 04:00:00 server time becomes Wednesday (Day 3).
 */
export function getServerDayOfWeek(
  date: Date = new Date(),
  server: 'cn' | 'global' = 'global',
): number {
  const offsetMs = SERVER_TIMEZONE_OFFSETS[server]
  const resetOffsetMs = DAILY_RESET_HOUR * 3600 * 1000

  // Effective timestamp shifted by server offset and 4 hours reset delay
  const effectiveMs = date.getTime() + offsetMs - resetOffsetMs
  const effectiveDate = new Date(effectiveMs)

  // getUTCDay: 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const day = effectiveDate.getUTCDay()
  return day === 0 ? 7 : day
}

/**
 * Official supply schedule based on zone_table.json (weeklyAdditionInfo).
 * Days of week: 1 = Mon, 2 = Tue, 3 = Wed, 4 = Thu, 5 = Fri, 6 = Sat, 7 = Sun.
 */
export const SUPPLY_STAGE_GROUPS: SupplyStageGroup[] = [
  {
    zoneId: 'weekly_1',
    name: 'Solid Defense',
    codePrefix: 'PR-A',
    daysOfWeek: [1, 4, 5, 7],
    type: 'EVOLVE',
    classes: ['DEFENDER', 'MEDIC'],
    rewardDescription: 'Defender & Medic Chips',
    stages: [
      { stageId: 'pro_a_1', code: 'PR-A-1', apCost: 9 },
      { stageId: 'pro_a_2', code: 'PR-A-2', apCost: 18 },
    ],
  },
  {
    zoneId: 'weekly_2',
    name: 'Fierce Attack',
    codePrefix: 'PR-B',
    daysOfWeek: [1, 2, 5, 6],
    type: 'EVOLVE',
    classes: ['SNIPER', 'CASTER'],
    rewardDescription: 'Sniper & Caster Chips',
    stages: [
      { stageId: 'pro_b_1', code: 'PR-B-1', apCost: 9 },
      { stageId: 'pro_b_2', code: 'PR-B-2', apCost: 18 },
    ],
  },
  {
    zoneId: 'weekly_3',
    name: 'Unstoppable Charge',
    codePrefix: 'PR-C',
    daysOfWeek: [3, 4, 6, 7],
    type: 'EVOLVE',
    classes: ['VANGUARD', 'SUPPORTER'],
    rewardDescription: 'Vanguard & Supporter Chips',
    stages: [
      { stageId: 'pro_c_1', code: 'PR-C-1', apCost: 9 },
      { stageId: 'pro_c_2', code: 'PR-C-2', apCost: 18 },
    ],
  },
  {
    zoneId: 'weekly_4',
    name: 'Fearless Protection',
    codePrefix: 'PR-D',
    daysOfWeek: [2, 3, 6, 7],
    type: 'EVOLVE',
    classes: ['GUARD', 'SPECIALIST'],
    rewardDescription: 'Guard & Specialist Chips',
    stages: [
      { stageId: 'pro_d_1', code: 'PR-D-1', apCost: 9 },
      { stageId: 'pro_d_2', code: 'PR-D-2', apCost: 18 },
    ],
  },
  {
    zoneId: 'weekly_9',
    name: 'Cargo Escort',
    codePrefix: 'CE',
    daysOfWeek: [2, 4, 6, 7],
    type: 'MATERIAL',
    rewardDescription: 'Lungmen Dollars (LMD)',
    stages: [
      { stageId: 'wk_melee_1', code: 'CE-1', apCost: 10 },
      { stageId: 'wk_melee_2', code: 'CE-2', apCost: 15 },
      { stageId: 'wk_melee_3', code: 'CE-3', apCost: 20 },
      { stageId: 'wk_melee_4', code: 'CE-4', apCost: 25 },
      { stageId: 'wk_melee_5', code: 'CE-5', apCost: 30 },
      { stageId: 'wk_melee_6', code: 'CE-6', apCost: 36 },
    ],
  },
  {
    zoneId: 'weekly_7',
    name: 'Tactical Drill',
    codePrefix: 'LS',
    daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
    type: 'SPECIAL',
    rewardDescription: 'Battle Records (EXP)',
    stages: [
      { stageId: 'wk_kc_1', code: 'LS-1', apCost: 10 },
      { stageId: 'wk_kc_2', code: 'LS-2', apCost: 15 },
      { stageId: 'wk_kc_3', code: 'LS-3', apCost: 20 },
      { stageId: 'wk_kc_4', code: 'LS-4', apCost: 25 },
      { stageId: 'wk_kc_5', code: 'LS-5', apCost: 30 },
      { stageId: 'wk_kc_6', code: 'LS-6', apCost: 36 },
    ],
  },
  {
    zoneId: 'weekly_6',
    name: 'Aerial Threat',
    codePrefix: 'CA',
    daysOfWeek: [2, 3, 5, 7],
    type: 'MATERIAL',
    rewardDescription: 'Skill Summaries',
    stages: [
      { stageId: 'wk_fly_1', code: 'CA-1', apCost: 10 },
      { stageId: 'wk_fly_2', code: 'CA-2', apCost: 15 },
      { stageId: 'wk_fly_3', code: 'CA-3', apCost: 20 },
      { stageId: 'wk_fly_4', code: 'CA-4', apCost: 25 },
      { stageId: 'wk_fly_5', code: 'CA-5', apCost: 30 },
    ],
  },
  {
    zoneId: 'weekly_8',
    name: 'Resource Search',
    codePrefix: 'SK',
    daysOfWeek: [1, 3, 5, 6],
    type: 'MATERIAL',
    rewardDescription: 'Building Materials (Carbon)',
    stages: [
      { stageId: 'wk_armor_1', code: 'SK-1', apCost: 10 },
      { stageId: 'wk_armor_2', code: 'SK-2', apCost: 15 },
      { stageId: 'wk_armor_3', code: 'SK-3', apCost: 20 },
      { stageId: 'wk_armor_4', code: 'SK-4', apCost: 25 },
      { stageId: 'wk_armor_5', code: 'SK-5', apCost: 30 },
    ],
  },
  {
    zoneId: 'weekly_5',
    name: 'Tough Siege',
    codePrefix: 'AP',
    daysOfWeek: [1, 4, 6, 7],
    type: 'MATERIAL',
    rewardDescription: 'Purchase Certificates (Red Certs)',
    stages: [
      { stageId: 'wk_toxic_1', code: 'AP-1', apCost: 10 },
      { stageId: 'wk_toxic_2', code: 'AP-2', apCost: 15 },
      { stageId: 'wk_toxic_3', code: 'AP-3', apCost: 20 },
      { stageId: 'wk_toxic_4', code: 'AP-4', apCost: 25 },
      { stageId: 'wk_toxic_5', code: 'AP-5', apCost: 30 },
    ],
  },
]

/**
 * Returns all supply groups open on the given day of the week (1–7).
 */
export function getOpenSupplyGroups(dayOfWeek: number): SupplyStageGroup[] {
  return SUPPLY_STAGE_GROUPS.filter((g) => g.daysOfWeek.includes(dayOfWeek))
}

/**
 * Checks if a supply stage group is open on the specified day of week.
 */
export function isSupplyZoneOpen(zoneId: string, dayOfWeek: number): boolean {
  const group = SUPPLY_STAGE_GROUPS.find((g) => g.zoneId === zoneId)
  return group ? group.daysOfWeek.includes(dayOfWeek) : false
}
