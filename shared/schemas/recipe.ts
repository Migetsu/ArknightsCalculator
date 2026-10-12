import { z } from 'zod'

/**
 * Single input ingredient in a crafting recipe.
 */
export const RecipeIngredientSchema = z.object({
  id: z.string(),
  count: z.number().int().positive(),
})

export type RecipeIngredient = z.infer<typeof RecipeIngredientSchema>

/**
 * Extra byproduct / secondary outcome from crafting in Workshop.
 */
export const RecipeExtraOutcomeSchema = z.object({
  id: z.string(),
  count: z.number().int().positive(),
  weight: z.number().positive(),
  probability: z.number().min(0).max(1),
})

export type RecipeExtraOutcome = z.infer<typeof RecipeExtraOutcomeSchema>

/**
 * Game formula classification.
 */
export const RecipeFormulaTypeSchema = z.enum(['F_EVOLVE', 'F_SKILL', 'F_BUILDING', 'F_ASC'])

/**
 * Formula process kind:
 * - synthesis: standard Workshop material / skill / building item craft
 * - conversion: reciprocal chip conversion (e.g. Vanguard <-> Supporter)
 * - manufacture: Factory production (e.g. dualchip formulas)
 */
export const RecipeKindSchema = z.enum(['synthesis', 'conversion', 'manufacture'])

export type RecipeKind = z.infer<typeof RecipeKindSchema>

/**
 * Normalized crafting formula schema for Workshop and Factory.
 */
export const CraftRecipeSchema = z.object({
  id: z.string(),
  kind: RecipeKindSchema,
  resultId: z.string(),
  resultCount: z.number().int().positive(),
  ingredients: z.array(RecipeIngredientSchema),
  goldCost: z.number().int().min(0),
  formulaType: RecipeFormulaTypeSchema,
  roomType: z.enum(['WORKSHOP', 'MANUFACTURE']),
  extraOutcomeRate: z.number().min(0).max(1).optional(),
  extraOutcomes: z.array(RecipeExtraOutcomeSchema).optional(),
})

export type CraftRecipe = z.infer<typeof CraftRecipeSchema>
