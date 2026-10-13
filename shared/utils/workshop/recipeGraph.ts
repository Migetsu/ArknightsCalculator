import type { CraftRecipe, RecipeKind } from '../../schemas/recipe'
import type { GameItem } from '../../schemas/item'
import type { RecipeGraph, RecipeGraphOptions } from './types'
import defaultRecipesData from '../../../data/recipes.json'
import defaultItemsData from '../../../data/items.json'

const defaultRecipes = defaultRecipesData as CraftRecipe[]
const defaultItems = defaultItemsData as GameItem[]

/**
 * Construct and index a crafting recipe graph with cycle-aware dependency analysis.
 */
export function buildRecipeGraph(
  recipesInput?: CraftRecipe[],
  itemsInput?: GameItem[],
  options?: RecipeGraphOptions,
): RecipeGraph {
  const recipes = recipesInput ?? defaultRecipes
  const items = itemsInput ?? defaultItems
  const maxDepth = options?.maxDepth ?? 15

  const allowConversions =
    options?.allowConversions ?? options?.allowedKinds?.includes('conversion') ?? false

  const allowedKinds = new Set<RecipeKind>(
    options?.allowedKinds ??
      (allowConversions
        ? ['synthesis', 'manufacture', 'conversion']
        : ['synthesis', 'manufacture']),
  )

  const itemMap = new Map<string, GameItem>()
  for (const item of items) {
    itemMap.set(item.id, item)
  }

  // Canonical craft recipe for each result item (synthesis or manufacture)
  const canonicalRecipes = new Map<string, CraftRecipe>()
  // Conversion recipes indexed by result item ID
  const conversionRecipes = new Map<string, CraftRecipe[]>()

  for (const recipe of recipes) {
    if (!allowedKinds.has(recipe.kind)) {
      continue
    }

    if (recipe.kind === 'conversion') {
      const list = conversionRecipes.get(recipe.resultId) ?? []
      list.push(recipe)
      conversionRecipes.set(recipe.resultId, list)
    } else {
      // For items with multiple recipes (like Furniture Part), retain the first canonical formula
      if (!canonicalRecipes.has(recipe.resultId)) {
        canonicalRecipes.set(recipe.resultId, recipe)
      }
    }
  }

  function getItemTier(itemId: string): number {
    const item = itemMap.get(itemId)
    if (item?.rarity !== undefined) {
      return item.rarity
    }
    // Fallback: if item is produced by a recipe, check ingredients max tier + 1
    const recipe = canonicalRecipes.get(itemId)
    if (recipe && recipe.ingredients.length > 0) {
      let maxIngTier = 1
      for (const ing of recipe.ingredients) {
        const ingTier = itemMap.get(ing.id)?.rarity ?? 1
        if (ingTier > maxIngTier) {
          maxIngTier = ingTier
        }
      }
      return Math.min(5, maxIngTier + 1)
    }
    return 0
  }

  /**
   * Depth-first search to check whether a path exists from startItemId to targetItemId.
   */
  function hasPath(fromId: string, toId: string, visited: Set<string>, depth: number): boolean {
    if (fromId === toId) {
      return true
    }
    if (depth >= maxDepth) {
      return false
    }

    visited.add(fromId)

    const outgoingRecipes: CraftRecipe[] = []
    const canonical = canonicalRecipes.get(fromId)
    if (canonical) {
      outgoingRecipes.push(canonical)
    }
    const convs = conversionRecipes.get(fromId)
    if (convs) {
      outgoingRecipes.push(...convs)
    }

    for (const r of outgoingRecipes) {
      for (const ing of r.ingredients) {
        if (!visited.has(ing.id)) {
          if (hasPath(ing.id, toId, visited, depth + 1)) {
            return true
          }
        }
      }
    }

    return false
  }

  function hasCycle(startItemId: string, targetItemId: string): boolean {
    // If target already leads back to start, linking start -> target creates a cycle
    const visited = new Set<string>()
    return hasPath(targetItemId, startItemId, visited, 0)
  }

  function getRecipe(itemId: string): CraftRecipe | undefined {
    return canonicalRecipes.get(itemId)
  }

  function getConversions(itemId: string): CraftRecipe[] {
    return conversionRecipes.get(itemId) ?? []
  }

  function getAllRecipes(): CraftRecipe[] {
    const all: CraftRecipe[] = []
    for (const r of canonicalRecipes.values()) {
      all.push(r)
    }
    for (const list of conversionRecipes.values()) {
      all.push(...list)
    }
    return all
  }

  return {
    getRecipe,
    getConversions,
    getItemTier,
    hasCycle,
    getAllRecipes,
  }
}
