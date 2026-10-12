// TODO: Replace demo data with real user account and game sync data from Supabase/Penguin Stats/Yostar
export interface DemoDoctorProfile {
  name: string
  level: number
  server: string
  isSynced: boolean
}

export interface DemoRateUpOperator {
  id: string
  name: string
  rarity: 1 | 2 | 3 | 4 | 5 | 6
}

export interface DemoUpcomingBanner {
  id: string
  tag: string
  title: string
  startDate: string
  endDate: string
  targetTimestamp: number
  operators: DemoRateUpOperator[]
}

export interface DemoGachaTreasury {
  totalPulls: number
  sparkGoal: number
  orundum: number
  originitePrime: number
  permitsSingle: number
  permitsTen: number
  monthlyCardActive: boolean
  monthlyCardDailyOrundum: number
}

export interface DemoPromotionGoal {
  id: string
  name: string
  rarity: 1 | 2 | 3 | 4 | 5 | 6
}

export interface DemoDashboardData {
  doctor: DemoDoctorProfile
  stats: {
    availablePulls: number
    activeTargets: number
    sparkCurrent: number
    sparkGoal: number
    monthlyCardActive: boolean
    monthlyCardRate: string
  }
  nextBanner: DemoUpcomingBanner
  treasury: DemoGachaTreasury
  quickOperators: DemoPromotionGoal[]
}

// 24 days, 19 hours, 7 minutes, 31 seconds from now for demo countdown
const DEMO_FUTURE_TIME = Date.now() + (24 * 24 * 60 * 60 + 19 * 60 * 60 + 7 * 60 + 31) * 1000

export const DEMO_DASHBOARD_DATA: DemoDashboardData = {
  doctor: {
    name: 'Doctor',
    level: 1,
    server: 'EN',
    isSynced: false,
  },
  stats: {
    availablePulls: 0,
    activeTargets: 0,
    sparkCurrent: 0,
    sparkGoal: 300,
    monthlyCardActive: true,
    monthlyCardRate: '+200/D',
  },
  nextBanner: {
    id: 'banner-orienteering-7',
    tag: 'ORIENTEERING',
    title: '[Standard Headhunting] Orienteering #7',
    startDate: '06.11.2026',
    endDate: '20.11.2026',
    targetTimestamp: DEMO_FUTURE_TIME,
    operators: [
      { id: 'blaze_alt', name: 'Blaze the Igniting Spark', rarity: 6 },
      { id: 'entelechia', name: 'Entelechia', rarity: 6 },
      { id: 'leizi_alt', name: 'Leizi the Thunderbringer', rarity: 5 },
      { id: 'pramanix_alt', name: 'Pramanix the Prerita', rarity: 5 },
    ],
  },
  treasury: {
    totalPulls: 0,
    sparkGoal: 300,
    orundum: 0,
    originitePrime: 0,
    permitsSingle: 0,
    permitsTen: 0,
    monthlyCardActive: true,
    monthlyCardDailyOrundum: 200,
  },
  quickOperators: [
    { id: 'aak', name: 'Aak', rarity: 6 },
    { id: 'angelina', name: 'Angelina', rarity: 6 },
    { id: 'angelina_alt', name: 'Angelina the Mellow', rarity: 6 },
    { id: 'aphris', name: 'Aphris', rarity: 6 },
  ],
}
