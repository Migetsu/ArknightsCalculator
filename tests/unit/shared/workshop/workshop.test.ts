import { describe, expect, it } from 'vitest'
import { buildRecipeGraph, resolveDemand } from '../../../../shared/utils/workshop'

describe('Workshop Core Engine (shared/utils/workshop)', () => {
  describe('RecipeGraph', () => {
    it('builds graph with default synthesis and manufacture recipes', () => {
      const graph = buildRecipeGraph()
      const allRecipes = graph.getAllRecipes()

      expect(allRecipes.length).toBeGreaterThan(0)
      // Check canonical T4 Orirock Concentration formula exists
      const orirockT4Recipe = graph.getRecipe('30014')
      expect(orirockT4Recipe).toBeDefined()
      expect(orirockT4Recipe?.kind).toBe('synthesis')
      expect(orirockT4Recipe?.resultId).toBe('30014')

      // Check Vanguard Dualchip formula exists in manufacture
      const dualchipRecipe = graph.getRecipe('3213')
      expect(dualchipRecipe).toBeDefined()
      expect(dualchipRecipe?.kind).toBe('manufacture')
      expect(dualchipRecipe?.resultId).toBe('3213')

      // Conversion recipes should not be present in canonical getRecipe
      expect(graph.getConversions('3211')).toEqual([])
    })

    it('enables conversions when allowConversions is true', () => {
      const graph = buildRecipeGraph(undefined, undefined, { allowConversions: true })
      const vanguardConversions = graph.getConversions('3211')
      expect(vanguardConversions.length).toBe(1)
      expect(vanguardConversions[0]?.id).toBe('wf_43')
      expect(vanguardConversions[0]?.kind).toBe('conversion')
    })

    it('resolves item tiers accurately', () => {
      const graph = buildRecipeGraph()
      expect(graph.getItemTier('30011')).toBe(1) // Orirock (T1)
      expect(graph.getItemTier('30012')).toBe(2) // Orirock Cube (T2)
      expect(graph.getItemTier('30013')).toBe(3) // Orirock Cluster (T3)
      expect(graph.getItemTier('30014')).toBe(4) // Orirock Concentration (T4)
      expect(graph.getItemTier('30135')).toBe(5) // D32 Steel (T5)
      expect(graph.getItemTier('3211')).toBe(3) // Vanguard Chip (T3)
      expect(graph.getItemTier('3212')).toBe(4) // Vanguard Chip Pack (T4)
      expect(graph.getItemTier('3213')).toBe(5) // Vanguard Dualchip (T5)
      expect(graph.getItemTier('32001')).toBe(4) // Chip Catalyst (T4)
    })
  })

  describe('Single-tier and Simple Chains (T2 -> T3, T3 -> T4)', () => {
    it('resolves simple T2 -> T3 craft chain with empty stock', () => {
      // 30013 = Orirock Cluster (T3). Recipe wf_35 requires 5x 30012 (T2 Orirock Cube), gold: 200
      // 30012 = Orirock Cube (T2). Recipe wf_34 requires 3x 30011 (T1 Orirock), gold: 100
      const result = resolveDemand({ '30013': 2 }, {})

      // 2x T3 requires 10x T2.
      // 10x T2 requires 30x T1.
      expect(result.rawDeficit).toEqual({ '30011': 30 })

      // Execution order: lower tier craft first (wf_34 for T2, then wf_35 for T3)
      expect(result.crafts).toEqual([
        { recipeId: 'wf_34', times: 10 },
        { recipeId: 'wf_35', times: 2 },
      ])

      // LMD: (10 * 100) + (2 * 200) = 1000 + 400 = 1400
      expect(result.lmdForCrafting).toBe(1400)
      expect(result.leftoverStock).toEqual({})
    })

    it('respects craftableTiers constraint', () => {
      // If only T3 and above are craftable, T2 items cannot be crafted and become rawDeficit
      const result = resolveDemand({ '30013': 2 }, {}, { craftableTiers: [3, 4, 5] })

      expect(result.rawDeficit).toEqual({ '30012': 10 })
      expect(result.crafts).toEqual([{ recipeId: 'wf_35', times: 2 }])
      expect(result.lmdForCrafting).toBe(400)
    })
  })

  describe('Mixed Stock Scenarios', () => {
    it('uses stock partially and crafts only remaining deficit', () => {
      // Needs 4x Orirock Cluster (30013).
      // Stock: 1x Orirock Cluster (30013), 10x Orirock Cube (30012).
      // Remaining T3 needed: 3.
      // Requires 15x Orirock Cube (30012).
      // Stock has 10x Orirock Cube -> consumed.
      // Remaining T2 deficit: 5x Orirock Cube.
      // 5x T2 requires 15x T1 Orirock (30011).
      const result = resolveDemand({ '30013': 4 }, { '30013': 1, '30012': 10 })

      expect(result.rawDeficit).toEqual({ '30011': 15 })
      expect(result.crafts).toEqual([
        { recipeId: 'wf_34', times: 5 },
        { recipeId: 'wf_35', times: 3 },
      ])
      // LMD: 5 * 100 + 3 * 200 = 500 + 600 = 1100
      expect(result.lmdForCrafting).toBe(1100)
      expect(result.leftoverStock).toEqual({})
    })

    it('handles stock greater than required without executing crafts', () => {
      const result = resolveDemand({ '30013': 2 }, { '30013': 5 })

      expect(result.crafts).toEqual([])
      expect(result.rawDeficit).toEqual({})
      expect(result.lmdForCrafting).toBe(0)
      expect(result.leftoverStock).toEqual({ '30013': 3 })
    })

    it('completely ignores stock when useStock is false', () => {
      const result = resolveDemand({ '30013': 2 }, { '30013': 10 }, { useStock: false })

      expect(result.crafts.length).toBeGreaterThan(0)
      expect(result.rawDeficit).toEqual({ '30011': 30 })
    })

    it('returns surplus stock when recipe produces more items than needed', () => {
      // Furniture Part (3401) recipe wf_10 produces 16x 3401 from 1x 3132 (Carbon Block)
      // Provide 3132 in stock so ingredients are satisfied without sub-crafts
      const result = resolveDemand({ '3401': 10 }, { '3132': 1 })

      expect(result.crafts).toEqual([{ recipeId: 'wf_10', times: 1 }])
      // 16 produced, 10 consumed -> 6 leftover in stock
      expect(result.leftoverStock).toEqual({ '3401': 6 })
    })
  })

  describe('Dualchips and Catalysts', () => {
    it('calculates Dualchip manufacture requirements accurately', () => {
      // 3213 = Vanguard Dualchip. Recipe mf_5 requires:
      // - 2x 3212 (Vanguard Chip Pack)
      // - 1x 32001 (Chip Catalyst)
      // goldCost = 0
      const result = resolveDemand({ '3213': 2 }, {})

      expect(result.crafts).toEqual([{ recipeId: 'mf_5', times: 2 }])
      expect(result.rawDeficit).toEqual({
        '32001': 2,
        '3212': 4,
      })
      expect(result.lmdForCrafting).toBe(0)
    })

    it('satisfies catalysts and chip packs from stock if available', () => {
      const result = resolveDemand({ '3213': 2 }, { '32001': 5, '3212': 3 })

      expect(result.crafts).toEqual([{ recipeId: 'mf_5', times: 2 }])
      // 4 needed, 3 from stock -> 1 deficit
      expect(result.rawDeficit).toEqual({ '3212': 1 })
      // Catalysts: 2 consumed out of 5 -> 3 leftover
      expect(result.leftoverStock).toEqual({ '32001': 3 })
    })
  })

  describe('Chip Conversions & All 8 Cycle Pairs (allowConversions: true)', () => {
    // 8 reciprocal pairs in game data:
    // 1. Vanguard Chip (3211) <-> Supporter Chip (3271)
    // 2. Vanguard Chip Pack (3212) <-> Supporter Chip Pack (3272)
    // 3. Guard Chip (3221) <-> Specialist Chip (3281)
    // 4. Guard Chip Pack (3222) <-> Specialist Chip Pack (3282)
    // 5. Defender Chip (3231) <-> Medic Chip (3261)
    // 6. Defender Chip Pack (3232) <-> Medic Chip Pack (3262)
    // 7. Sniper Chip (3241) <-> Caster Chip (3251)
    // 8. Sniper Chip Pack (3242) <-> Caster Chip Pack (3252)

    const reciprocalPairs: Array<[string, string, string, string]> = [
      ['3211', '3271', 'wf_43', 'wf_44'], // Vanguard Chip <-> Supporter Chip
      ['3212', '3272', 'wf_51', 'wf_52'], // Vanguard Chip Pack <-> Supporter Chip Pack
      ['3221', '3281', 'wf_45', 'wf_46'], // Guard Chip <-> Specialist Chip
      ['3222', '3282', 'wf_53', 'wf_54'], // Guard Chip Pack <-> Specialist Chip Pack
      ['3231', '3261', 'wf_39', 'wf_40'], // Defender Chip <-> Medic Chip
      ['3232', '3262', 'wf_47', 'wf_48'], // Defender Chip Pack <-> Medic Chip Pack
      ['3241', '3251', 'wf_41', 'wf_42'], // Sniper Chip <-> Caster Chip
      ['3242', '3252', 'wf_49', 'wf_50'], // Sniper Chip Pack <-> Caster Chip Pack
    ]

    it.each(reciprocalPairs)(
      'converts chip A from stock of chip B and vice-versa for pair (%s <-> %s)',
      (chipA, chipB, recipeBtoA, recipeAtoB) => {
        // Test A from B: Need 2x chipA, stock has 6x chipB
        // Conversion formula: 3x donor -> 2x target
        const resAfromB = resolveDemand({ [chipA]: 2 }, { [chipB]: 6 }, { allowConversions: true })

        expect(resAfromB.rawDeficit).toEqual({})
        expect(resAfromB.crafts).toEqual([{ recipeId: recipeBtoA, times: 1 }])
        // 3 of 6 chipB consumed -> 3 leftover
        expect(resAfromB.leftoverStock).toEqual({ [chipB]: 3 })

        // Test B from A: Need 2x chipB, stock has 6x chipA
        const resBfromA = resolveDemand({ [chipB]: 2 }, { [chipA]: 6 }, { allowConversions: true })

        expect(resBfromA.rawDeficit).toEqual({})
        expect(resBfromA.crafts).toEqual([{ recipeId: recipeAtoB, times: 1 }])
        expect(resBfromA.leftoverStock).toEqual({ [chipA]: 3 })
      },
    )

    it.each(reciprocalPairs)(
      'terminates gracefully without infinite loop when stock is empty for pair (%s <-> %s)',
      (chipA, chipB) => {
        // When both chips are needed and neither is in stock, engine should not infinitely loop
        const startTime = Date.now()
        const result = resolveDemand({ [chipA]: 2, [chipB]: 2 }, {}, { allowConversions: true })
        const elapsed = Date.now() - startTime

        expect(elapsed).toBeLessThan(1000) // Must resolve in milliseconds
        // Since no donor stock exists, both are raw deficit
        expect(result.rawDeficit).toEqual({
          [chipA]: 2,
          [chipB]: 2,
        })
        expect(result.crafts).toEqual([])
      },
    )

    it('detects cycle in recipe graph for all 8 reciprocal pairs', () => {
      const graph = buildRecipeGraph(undefined, undefined, { allowConversions: true })
      for (const [chipA, chipB] of reciprocalPairs) {
        expect(graph.hasCycle(chipA, chipB)).toBe(true)
        expect(graph.hasCycle(chipB, chipA)).toBe(true)
      }
    })
  })

  describe('Mathematical Properties & Invariants', () => {
    it('satisfies invariant: rawDeficit(no stock) >= rawDeficit(with stock) across all items', () => {
      const testDemands: Array<Record<string, number>> = [
        { '30014': 5 }, // T4 material
        { '30135': 3 }, // T5 D32 Steel (complex multi-tier tree)
        { '3213': 4 }, // T5 Vanguard Dualchip
        { '30013': 10, '30023': 8, '30033': 6 }, // Multi-item demand
      ]

      const testStocks: Array<Record<string, number>> = [
        { '30014': 2, '30013': 5 },
        { '30012': 20, '30011': 50 },
        { '32001': 2, '3212': 3 },
        { '30013': 4, '30023': 2 },
      ]

      for (const demand of testDemands) {
        const withoutStock = resolveDemand(demand, {})

        for (const stock of testStocks) {
          const withStock = resolveDemand(demand, stock)

          // Sum of all raw deficit units
          const totalDeficitWithout = Object.values(withoutStock.rawDeficit).reduce(
            (a, b) => a + b,
            0,
          )
          const totalDeficitWith = Object.values(withStock.rawDeficit).reduce((a, b) => a + b, 0)

          expect(totalDeficitWithout).toBeGreaterThanOrEqual(totalDeficitWith)

          // Item-by-item deficit check
          for (const [itemId, countWith] of Object.entries(withStock.rawDeficit)) {
            const countWithout = withoutStock.rawDeficit[itemId] ?? 0
            expect(countWithout).toBeGreaterThanOrEqual(countWith)
          }
        }
      }
    })

    it('is strictly deterministic across repeated invocations', () => {
      const demand = { '30135': 2, '3213': 3 }
      const stock = { '30013': 5, '32001': 1 }

      const firstRun = resolveDemand(demand, stock)
      for (let i = 0; i < 20; i++) {
        const subsequentRun = resolveDemand(demand, stock)
        expect(subsequentRun).toEqual(firstRun)
      }
    })
  })

  describe('Byproducts Calculations', () => {
    it('computes expected value of byproducts when option is enabled', () => {
      // wf_14 produces T3 Orirock Cluster. It has extraOutcomeRate = 0.1, outcomes with probability
      const withoutByproducts = resolveDemand({ '30013': 10 }, {}, { byproducts: false })
      expect(withoutByproducts.byproducts).toEqual({})

      const withByproducts = resolveDemand({ '30013': 10 }, {}, { byproducts: true })
      expect(Object.keys(withByproducts.byproducts).length).toBeGreaterThan(0)
      for (const expectedCount of Object.values(withByproducts.byproducts)) {
        expect(expectedCount).toBeGreaterThan(0)
      }
    })
  })

  describe('DAG Invariant & Same-Tier Recipe Processing', () => {
    it('correctly processes recipe where product and ingredient share identical tier (3131 and 3112 both T2)', () => {
      // 3131 (Light Building Material, rarity 2) crafts via wf_1 from 2x 3112 (Carbon Stick, rarity 2)
      // Both share tier 2. Top-down ordering must evaluate 3131 BEFORE 3112 so ingredients can be consumed from stock.
      const result = resolveDemand({ '3131': 2 }, { '3131': 1, '3112': 2 })

      // 1x 3131 satisfied from stock, 1x needed
      // 1x 3131 crafted via wf_1 requiring 2x 3112
      // 2x 3112 satisfied from stock -> 0 raw deficit
      expect(result.crafts).toEqual([{ recipeId: 'wf_1', times: 1 }])
      expect(result.rawDeficit).toEqual({})
      expect(result.leftoverStock).toEqual({})
      expect(result.lmdForCrafting).toBe(800)
    })

    it('satisfies DAG invariant: no item is evaluated before all of its consumers', () => {
      const graph = buildRecipeGraph()
      const allRecipes = graph.getAllRecipes()
      const canonicalRecipes = allRecipes.filter(
        (r) => r.kind === 'synthesis' || r.kind === 'manufacture',
      )

      const topoOrder = graph.getTopologicalOrder()
      const indexMap = new Map<string, number>()
      topoOrder.forEach((id, idx) => indexMap.set(id, idx))

      // For every canonical recipe: index(product) must be strictly less than index(ingredient)
      for (const recipe of canonicalRecipes) {
        const productIndex = indexMap.get(recipe.resultId)
        expect(productIndex).toBeDefined()

        for (const ing of recipe.ingredients) {
          const ingredientIndex = indexMap.get(ing.id)
          expect(ingredientIndex).toBeDefined()

          // DAG invariant assertion: Consumer/Product ALWAYS precedes Ingredient
          expect(productIndex!).toBeLessThan(ingredientIndex!)
        }
      }
    })
  })

  describe('Input Shape Flexibility', () => {
    it('accepts array format for demand and Map for stock', () => {
      const arrayDemand = [{ id: '30013', count: 2 }]
      const mapStock = new Map<string, number>([['30013', 1]])

      const result = resolveDemand(arrayDemand, mapStock)
      expect(result.crafts).toEqual([
        { recipeId: 'wf_34', times: 5 },
        { recipeId: 'wf_35', times: 1 },
      ])
      expect(result.rawDeficit).toEqual({ '30011': 15 })
    })

    it('handles empty or zero inputs gracefully', () => {
      const emptyResult = resolveDemand({}, {})
      expect(emptyResult.crafts).toEqual([])
      expect(emptyResult.rawDeficit).toEqual({})
      expect(emptyResult.lmdForCrafting).toBe(0)
      expect(emptyResult.leftoverStock).toEqual({})
    })
  })
})
