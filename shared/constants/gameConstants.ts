/**
 * Official game constants for Arknights gacha, currency, and recurring rewards.
 * Do not hardcode these numeric values across components or utilities.
 */

// Official: Arknights single headhunting pull cost
export const ORUNDUM_PER_PULL = 600

// Official: Arknights Originite Prime conversion rate (1 OP = 180 Orundum)
export const ORUNDUM_PER_OP = 180

// Official: Arknights weekly Annihilation max reward. Do not hardcode in components.
export const ANNIHILATION_WEEKLY = 1800

// Official: Daily mission rewards (100 Orundum / day)
export const DAILIES_DAILY = 100

// Official: Daily mission rewards (100 Orundum / day * 7 days = 700 / week)
export const DAILIES_WEEKLY = 700

// Official: Weekly mission rewards (500 Orundum / week)
export const WEEKLIES_WEEKLY = 500

// Official: Monthly Card daily login bonus (200 Orundum / day)
export const MONTHLY_CARD_DAILY = 200

// Total baseline F2P recurring weekly income (1800 + 700 + 500 = 3000 Orundum = 5 pulls / week)
export const F2P_WEEKLY_TOTAL = ANNIHILATION_WEEKLY + DAILIES_WEEKLY + WEEKLIES_WEEKLY // = 3000

// Monthly Card bonus weekly income (200 * 7 = 1400 Orundum / week)
export const MONTHLY_CARD_WEEKLY = MONTHLY_CARD_DAILY * 7 // = 1400

/**
 * Sourced recurring gacha income rates for Arknights (official game mechanics & wiki.gg):
 * - Annihilation: 1800 Orundum/week (capped weekly stage clear).
 * - Dailies & Weeklies: 100 Orundum/day (Dailies) + 500 Orundum/week (Weeklies) = 1200 Orundum/week.
 * - Monthly Card: 200 Orundum/day = 1400 Orundum/week.
 * - Conversion: 600 Orundum = 1 Pull; 1 OP = 180 Orundum.
 */
export const GACHA_INCOME_RATES = {
  annihilationWeekly: ANNIHILATION_WEEKLY,
  dailiesDaily: DAILIES_DAILY,
  dailiesWeekly: DAILIES_WEEKLY,
  weekliesWeekly: WEEKLIES_WEEKLY,
  dailiesAndWeekliesWeekly: DAILIES_WEEKLY + WEEKLIES_WEEKLY,
  f2pWeeklyTotal: F2P_WEEKLY_TOTAL,
  monthlyCardDaily: MONTHLY_CARD_DAILY,
  monthlyCardWeekly: MONTHLY_CARD_WEEKLY,
  orundumPerPull: ORUNDUM_PER_PULL,
  orundumPerOp: ORUNDUM_PER_OP,
} as const
