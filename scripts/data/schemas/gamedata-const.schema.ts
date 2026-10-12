import { z } from 'zod'

/**
 * Raw schema for gamedata_const.json.
 * Validates core level cap matrices, cost curves, and term descriptions.
 * Uses .passthrough() for unreferenced fields.
 */
export const RawTermDescriptionSchema = z
  .object({
    termId: z.string(),
    termName: z.string(),
    description: z.string(),
  })
  .passthrough()

export type RawTermDescription = z.infer<typeof RawTermDescriptionSchema>

export const RawGamedataConstSchema = z
  .object({
    maxLevel: z.array(z.array(z.number())),
    characterExpMap: z.union([
      z.array(z.array(z.number())),
      z.record(z.string(), z.array(z.number())),
    ]),
    characterUpgradeCostMap: z.union([
      z.array(z.array(z.number())),
      z.record(z.string(), z.array(z.number())),
    ]),
    evolveGoldCost: z.array(z.array(z.number())),
    termDescriptionDict: z.record(z.string(), RawTermDescriptionSchema),
  })
  .passthrough()

export type RawGamedataConst = z.infer<typeof RawGamedataConstSchema>
