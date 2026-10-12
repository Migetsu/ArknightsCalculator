import { z } from 'zod'

/**
 * Options required to calculate operator battle statistics.
 */
export const CalculateStatsOptionsSchema = z.object({
  /** Elite promotion phase: 0 (E0), 1 (E1), or 2 (E2) */
  elite: z.union([z.literal(0), z.literal(1), z.literal(2)]),
  /** Operator level within current elite phase (1 .. maxLevel) */
  level: z.number().int().min(1),
  /** Trust / favor percentage (0 .. 100), defaults to 100 */
  trust: z.number().min(0).max(100).optional().default(100),
  /** Potential level (1 .. 6), defaults to 1 (no potential buffs applied) */
  potential: z.number().int().min(1).max(6).optional().default(1),
  /** Optional module selection and stage upgrade (1 .. 3) */
  module: z
    .object({
      id: z.string(),
      stage: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
    })
    .optional(),
})

export type CalculateStatsOptions = z.infer<typeof CalculateStatsOptionsSchema>

/**
 * Individual source contribution to combat attributes.
 */
export const StatBreakdownSchema = z.object({
  hp: z.number(),
  atk: z.number(),
  def: z.number(),
  res: z.number(),
  cost: z.number(),
  block: z.number(),
  baseAttackTime: z.number(),
  attackSpeed: z.number().default(0),
  respawnTime: z.number(),
})

export type StatBreakdown = z.infer<typeof StatBreakdownSchema>

/**
 * Complete calculated combat statistics with totals and source breakdowns.
 */
export const CalculatedStatsResultSchema = z.object({
  /** Final total HP */
  hp: z.number().int(),
  /** Final total Attack Power (ATK) */
  atk: z.number().int(),
  /** Final total Physical Defense (DEF) */
  def: z.number().int(),
  /** Final total Arts / Magic Resistance (RES) */
  res: z.number(),
  /** Final deployment cost (DP) */
  cost: z.number().int(),
  /** Final block count */
  block: z.number().int(),
  /** Base attack interval in seconds (before ASPD modifiers) */
  baseAttackTime: z.number(),
  /** Final effective attack interval in seconds (scaled by ASPD: baseAttackTime * 100 / (100 + aspdMod)) */
  attackInterval: z.number(),
  /** Total Attack Speed modifier (baseline 0 bonus, e.g. +5 ASPD) */
  attackSpeed: z.number(),
  /** Redeployment timer in seconds */
  respawnTime: z.number().int(),
  /** Granular attribute contributions per source */
  breakdown: z.object({
    base: StatBreakdownSchema,
    trust: StatBreakdownSchema,
    potential: StatBreakdownSchema,
    module: StatBreakdownSchema,
  }),
})

export type CalculatedStatsResult = z.infer<typeof CalculatedStatsResultSchema>
