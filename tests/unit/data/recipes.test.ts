import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { CraftRecipeSchema, type CraftRecipe } from '../../../shared/schemas/recipe'
import type { GameItem } from '../../../shared/schemas/item'

const RECIPES_PATH = path.resolve(process.cwd(), 'data/recipes.json')
const ITEMS_PATH = path.resolve(process.cwd(), 'data/items.json')

function loadData(): { recipes: CraftRecipe[]; itemIds: Set<string> } {
  const recipesRaw = fs.readFileSync(RECIPES_PATH, 'utf-8')
  const itemsRaw = fs.readFileSync(ITEMS_PATH, 'utf-8')

  const recipes = JSON.parse(recipesRaw) as CraftRecipe[]
  const items = JSON.parse(itemsRaw) as GameItem[]
  const itemIds = new Set(items.map((it) => it.id))

  return { recipes, itemIds }
}

/**
 * Finds all elementary cycles in a directed graph using DFS.
 * Edges represent: ingredient -> craftedResult.
 */
function findGraphCycles(recipes: CraftRecipe[]): string[][] {
  const adj = new Map<string, string[]>()

  for (const r of recipes) {
    for (const ing of r.ingredients) {
      if (!adj.has(ing.id)) adj.set(ing.id, [])
      adj.get(ing.id)!.push(r.resultId)
    }
  }

  const visited = new Set<string>()
  const recStack = new Set<string>()
  const cycles: string[][] = []

  function dfs(node: string, currentPath: string[]): void {
    visited.add(node)
    recStack.add(node)

    const neighbors = adj.get(node) ?? []
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        dfs(neighbor, [...currentPath, neighbor])
      } else if (recStack.has(neighbor)) {
        // Cycle detected
        const cycleStartIndex = currentPath.indexOf(neighbor)
        if (cycleStartIndex !== -1) {
          cycles.push([...currentPath.slice(cycleStartIndex), neighbor])
        } else {
          cycles.push([node, neighbor])
        }
      }
    }

    recStack.delete(node)
  }

  for (const node of adj.keys()) {
    if (!visited.has(node)) {
      dfs(node, [node])
    }
  }

  return cycles
}

describe('Craft Recipes & Dependency Graph (data/recipes.json)', () => {
  const { recipes, itemIds } = loadData()

  it('validates all recipes against CraftRecipeSchema', () => {
    expect(recipes.length).toBeGreaterThanOrEqual(74)
    for (const recipe of recipes) {
      const parsed = CraftRecipeSchema.safeParse(recipe)
      expect(parsed.success).toBe(true)
    }
  })

  it('ensures all recipe ingredients and results exist in items.json', () => {
    for (const recipe of recipes) {
      expect(
        itemIds.has(recipe.resultId),
        `Recipe ${recipe.id} result ${recipe.resultId} missing in items.json`,
      ).toBe(true)

      for (const ing of recipe.ingredients) {
        expect(
          itemIds.has(ing.id),
          `Recipe ${recipe.id} ingredient ${ing.id} missing in items.json`,
        ).toBe(true)
      }

      for (const ex of recipe.extraOutcomes ?? []) {
        expect(
          itemIds.has(ex.id),
          `Recipe ${recipe.id} extra outcome ${ex.id} missing in items.json`,
        ).toBe(true)
      }
    }
  })

  it('proves that the synthesis craft tree (F_EVOLVE, F_SKILL, F_BUILDING, Dualchips) is a strict DAG with ZERO cycles', () => {
    // Synthesis recipes exclude workshop reciprocal chip conversions
    const synthesisRecipes = recipes.filter(
      (r) => !(r.formulaType === 'F_ASC' && r.roomType === 'WORKSHOP'),
    )

    const cycles = findGraphCycles(synthesisRecipes)
    expect(cycles).toEqual([])
  })

  it('identifies the exact 8 reciprocal chip conversion cycles in Workshop formulas', () => {
    // Workshop chip conversions intentionally allow 3:2 conversions between paired classes
    const chipConversionRecipes = recipes.filter(
      (r) => r.formulaType === 'F_ASC' && r.roomType === 'WORKSHOP',
    )

    const cycles = findGraphCycles(chipConversionRecipes)
    expect(cycles.length).toBe(8)

    // Expected 8 pairs: Vanguard<->Supporter, Guard<->Specialist, Defender<->Medic, Sniper<->Caster (chips & chip packs)
    const cyclePairs = cycles.map((c) => [c[0], c[1]].sort().join('<->'))
    const uniquePairs = Array.from(new Set(cyclePairs)).sort()

    expect(uniquePairs).toEqual([
      '3211<->3271', // Vanguard Chip <-> Supporter Chip
      '3212<->3272', // Vanguard Chip Pack <-> Supporter Chip Pack
      '3221<->3281', // Guard Chip <-> Specialist Chip
      '3222<->3282', // Guard Chip Pack <-> Specialist Chip Pack
      '3231<->3261', // Defender Chip <-> Medic Chip
      '3232<->3262', // Defender Chip Pack <-> Medic Chip Pack
      '3241<->3251', // Sniper Chip <-> Caster Chip
      '3242<->3252', // Sniper Chip Pack <-> Caster Chip Pack
    ])
  })
})
