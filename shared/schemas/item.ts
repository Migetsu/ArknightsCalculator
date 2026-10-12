import { z } from 'zod'
import { I18nStringSchema } from './operator'

/**
 * Item category classification for calculator and depot planning.
 */
export const ItemTypeSchema = z.enum([
  'material',
  'chip',
  'chip_pack',
  'catalyst',
  'exp_card',
  'currency',
  'other',
])

export type ItemType = z.infer<typeof ItemTypeSchema>

/**
 * Functional flags for planner filtering and recipe derivation.
 */
export const ItemFlagsSchema = z.object({
  /** Obtainable via regular stage drops */
  canDrop: z.boolean(),
  /** Craftable in workshop or factory formulas */
  canCraft: z.boolean(),
  /** Dedicated module upgrade token (data block/stick/instrument) */
  isModuleToken: z.boolean().optional(),
})

export type ItemFlags = z.infer<typeof ItemFlagsSchema>

/**
 * Standard game item schema for depot, planner, and craft trees.
 */
export const GameItemSchema = z.object({
  id: z.string(),
  name: I18nStringSchema,
  rarity: z.number().int().min(1).max(6),
  type: ItemTypeSchema,
  sortId: z.number().int(),
  iconId: z.string(),
  flags: ItemFlagsSchema,
})

export type GameItem = z.infer<typeof GameItemSchema>
