import { z } from 'zod'
import { I18nStringSchema } from './operator'

/**
 * Localized game terminology description (e.g. Stun, Silence, True Damage, Camouflage).
 */
export const GameTermSchema = z.object({
  id: z.string(),
  name: I18nStringSchema,
  description: I18nStringSchema,
})

export type GameTerm = z.infer<typeof GameTermSchema>

/**
 * Battle record / EXP card metadata.
 */
export const ExpItemSchema = z.object({
  id: z.string(),
  gainExp: z.number().int().positive(),
})

export type ExpItem = z.infer<typeof ExpItemSchema>

/**
 * Master calculation constants for operator leveling, promotions, and terminology.
 */
export const GameConstantsSchema = z.object({
  /** Max level per rarity ('1'..'6') and elite phase (0, 1, 2) */
  maxLevel: z.record(z.string(), z.array(z.number())),
  /** Experience required to advance to the next level by elite phase ('0'..'2') */
  characterExpMap: z.record(z.string(), z.array(z.number())),
  /** LMD cost per level-up by elite phase ('0'..'2') */
  characterUpgradeCostMap: z.record(z.string(), z.array(z.number())),
  /** LMD cost for elite promotions by rarity ('1'..'6') -> [E1 cost, E2 cost] */
  evolveGoldCost: z.record(z.string(), z.array(z.number())),
  /** Skill mastery costs by level if present in constants, else null */
  masteryCost: z.record(z.string(), z.unknown()).nullable().optional(),
  /** Item ID representing Lungmen Dollars (LMD) */
  lmdItemId: z.string(),
  /** EXP card gain values */
  expItems: z.array(ExpItemSchema),
  /** Dictionary of in-game terminology definitions */
  terms: z.record(z.string(), GameTermSchema),
})

export type GameConstants = z.infer<typeof GameConstantsSchema>
