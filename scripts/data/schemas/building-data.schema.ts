import { z } from 'zod'

/**
 * Raw building data schema from Arknights game data (building_data.json).
 * Used for workshop crafting formulas and recipe decomposition.
 */
export const RawWorkshopCostSchema = z
  .object({
    id: z.string(),
    count: z.number(),
    type: z.string().optional(),
  })
  .passthrough()

export const RawWorkshopFormulaSchema = z
  .object({
    sortId: z.number().optional(),
    formulaId: z.string().optional(),
    itemId: z.string(),
    count: z.number(),
    goldCost: z.number().optional(),
    apCost: z.number().optional(),
    costs: z.array(RawWorkshopCostSchema).optional().default([]),
    extraOutcomeGroup: z
      .array(
        z
          .object({
            weight: z.number().optional(),
            itemId: z.string().optional(),
            itemCount: z.number().optional(),
          })
          .passthrough(),
      )
      .optional(),
  })
  .passthrough()

export const RawBuildingDataSchema = z
  .object({
    workshopFormulas: z.record(z.string(), RawWorkshopFormulaSchema).optional(),
    manufactFormulas: z.record(z.string(), z.object({}).passthrough()).optional(),
  })
  .passthrough()

export type RawWorkshopCost = z.infer<typeof RawWorkshopCostSchema>
export type RawWorkshopFormula = z.infer<typeof RawWorkshopFormulaSchema>
export type RawBuildingData = z.infer<typeof RawBuildingDataSchema>
