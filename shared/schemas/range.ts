import { z } from 'zod'

/**
 * Coordinate offset relative to operator position (0, 0).
 *
 * In game data:
 * - col: horizontal axis (0 = operator tile, >0 forward/right, <0 behind/left)
 * - row: vertical axis (0 = operator tile, >0 upward/top, <0 downward/bottom)
 */
export const RangeOffsetSchema = z.object({
  row: z.number().int(),
  col: z.number().int(),
})

export type RangeOffset = z.infer<typeof RangeOffsetSchema>

/**
 * 0-indexed anchor coordinates of operator inside normalized bounding matrix.
 */
export const RangeAnchorSchema = z.object({
  row: z.number().int().nonnegative(),
  col: z.number().int().nonnegative(),
})

export type RangeAnchor = z.infer<typeof RangeAnchorSchema>

/**
 * Normalized attack range entry.
 */
export const RangeTableEntrySchema = z.object({
  id: z.string().min(1),
  direction: z.number().int(),
  grids: z.array(RangeOffsetSchema),
  rows: z.number().int().positive(),
  cols: z.number().int().positive(),
  anchor: RangeAnchorSchema,
  matrix: z.array(z.array(z.union([z.literal(0), z.literal(1)]))),
})

export type RangeTableEntry = z.infer<typeof RangeTableEntrySchema>

/**
 * Dictionary of attack ranges indexed by range ID.
 */
export const RangesDictionarySchema = z.record(z.string(), RangeTableEntrySchema)

export type RangesDictionary = z.infer<typeof RangesDictionarySchema>

/**
 * Array of attack ranges.
 */
export const RangesListSchema = z.array(RangeTableEntrySchema)

export type RangesList = z.infer<typeof RangesListSchema>
