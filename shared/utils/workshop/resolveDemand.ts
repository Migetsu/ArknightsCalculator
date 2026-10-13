import type { CraftRecipe } from '../../schemas/recipe'
import type {
  DemandInput,
  StockInput,
  ResolveDemandOptions,
  ResolveDemandResult,
  WorkshopWarning,
} from './types'
import { buildRecipeGraph } from './recipeGraph'

/**
 * Normalize different demand input shapes into a mutable Map of positive counts.
 */
function normalizeDemand(input: DemandInput): Map<string, number> {
  const map = new Map<string, number>()
  if (Array.isArray(input)) {
    for (const item of input) {
      if (item && item.count > 0) {
        map.set(item.id, (map.get(item.id) ?? 0) + item.count)
      }
    }
  } else if (input && typeof input === 'object') {
    for (const [id, count] of Object.entries(input)) {
      if (typeof count === 'number' && count > 0) {
        map.set(id, (map.get(id) ?? 0) + count)
      }
    }
  }
  return map
}

/**
 * Normalize stock inventory into a mutable Map of positive quantities.
 */
function normalizeStock(input?: StockInput): Map<string, number> {
  const map = new Map<string, number>()
  if (!input) {
    return map
  }
  if (input instanceof Map) {
    for (const [id, count] of input.entries()) {
      if (typeof count === 'number' && count > 0) {
        map.set(id, count)
      }
    }
  } else if (typeof input === 'object') {
    for (const [id, count] of Object.entries(input)) {
      if (typeof count === 'number' && count > 0) {
        map.set(id, count)
      }
    }
  }
  return map
}

/**
 * Top-down hierarchical workshop demand resolution.
 *
 * Algorithm details:
 * 1. Traverses items tier by tier from highest (T5) down to T1.
 * 2. Deducts demand directly from available warehouse stock first.
 * 3. Any remaining deficit is crafted using recipe graph if tier is craftable.
 * 4. Surplus from batch crafts (resultCount > 1) is returned to stock for downstream reuse.
 * 5. Ingredients propagate down to their respective lower tier demands.
 * 6. Bottom-tier items without recipes or excluded from craftableTiers form rawDeficit.
 */
export function resolveDemand(
  required: DemandInput,
  stock?: StockInput,
  options?: ResolveDemandOptions,
): ResolveDemandResult {
  const useStock = options?.useStock !== false
  const allowConversions = Boolean(options?.allowConversions)
  const calculateByproducts = Boolean(options?.byproducts)
  const maxDepth = options?.maxDepth ?? 15
  const craftableTiers = new Set<number>(options?.craftableTiers ?? [2, 3, 4, 5])

  const graph = buildRecipeGraph(options?.recipes, options?.items, {
    allowConversions,
    maxDepth,
  })

  const pendingDemand = normalizeDemand(required)
  const currentStock = useStock ? normalizeStock(stock) : new Map<string, number>()

  const craftsAggregated = new Map<string, { recipe: CraftRecipe; times: number }>()
  const rawDeficitMap = new Map<string, number>()
  const byproductsMap = new Map<string, number>()
  const warnings: WorkshopWarning[] = []

  let lmdForCrafting = 0

  // Track item chain to detect mutual conversion recursion
  const activeChain = new Set<string>()

  // Continue decomposing tier-by-tier until all demands are fully resolved
  // Maximum possible tier in Arknights is 5 (Dualchips, T5 materials)
  const maxTier = 5

  for (let currentTier = maxTier; currentTier >= 1; currentTier--) {
    // Collect all pending items at the current tier
    let tierIterations = 0

    while (true) {
      tierIterations++
      if (tierIterations > 50) {
        warnings.push({
          code: 'MAX_DEPTH_EXCEEDED',
          message: `Exceeded tier iteration limit at tier ${currentTier}`,
          details: { tier: currentTier },
        })
        break
      }

      const itemsAtTier: string[] = []
      for (const [id, count] of pendingDemand.entries()) {
        if (count > 0 && graph.getItemTier(id) === currentTier) {
          itemsAtTier.push(id)
        }
      }

      if (itemsAtTier.length === 0) {
        break
      }

      // Sort items deterministically
      itemsAtTier.sort()

      for (const itemId of itemsAtTier) {
        let needed = pendingDemand.get(itemId) ?? 0
        if (needed <= 0) {
          pendingDemand.delete(itemId)
          continue
        }

        // Step 1: Satisfy from stock first
        if (useStock) {
          const availableStock = currentStock.get(itemId) ?? 0
          if (availableStock > 0) {
            const used = Math.min(needed, availableStock)
            needed -= used
            const remainingStock = availableStock - used
            if (remainingStock > 0) {
              currentStock.set(itemId, remainingStock)
            } else {
              currentStock.delete(itemId)
            }
          }
        }

        if (needed === 0) {
          pendingDemand.delete(itemId)
          continue
        }

        // Step 2: Check craftability
        const canCraftTier = craftableTiers.has(currentTier)
        const canonicalRecipe = graph.getRecipe(itemId)

        if (canCraftTier && canonicalRecipe) {
          // Standard synthesis or manufacture craft
          const times = Math.ceil(needed / canonicalRecipe.resultCount)
          const totalProduced = times * canonicalRecipe.resultCount
          const surplus = totalProduced - needed

          // Surplus becomes stock
          if (surplus > 0) {
            currentStock.set(itemId, (currentStock.get(itemId) ?? 0) + surplus)
          }

          // Record craft
          const existing = craftsAggregated.get(canonicalRecipe.id)
          if (existing) {
            existing.times += times
          } else {
            craftsAggregated.set(canonicalRecipe.id, { recipe: canonicalRecipe, times })
          }

          lmdForCrafting += times * canonicalRecipe.goldCost

          // Accumulate byproducts if enabled
          if (calculateByproducts && canonicalRecipe.extraOutcomes) {
            for (const extra of canonicalRecipe.extraOutcomes) {
              const expectedVal = times * extra.count * extra.probability
              byproductsMap.set(extra.id, (byproductsMap.get(extra.id) ?? 0) + expectedVal)
            }
          }

          // Add ingredients to pending demand
          for (const ing of canonicalRecipe.ingredients) {
            const ingCount = times * ing.count
            pendingDemand.set(ing.id, (pendingDemand.get(ing.id) ?? 0) + ingCount)
          }

          pendingDemand.delete(itemId)
        } else if (canCraftTier && allowConversions && graph.getConversions(itemId).length > 0) {
          // Chip conversion branch
          const conversionRecipes = graph.getConversions(itemId)
          const convRecipe = conversionRecipes[0]

          if (!convRecipe || convRecipe.ingredients.length === 0) {
            rawDeficitMap.set(itemId, (rawDeficitMap.get(itemId) ?? 0) + needed)
            pendingDemand.delete(itemId)
            continue
          }

          const donorIng = convRecipe.ingredients[0]
          if (!donorIng) {
            rawDeficitMap.set(itemId, (rawDeficitMap.get(itemId) ?? 0) + needed)
            pendingDemand.delete(itemId)
            continue
          }
          const donorId = donorIng.id

          // Cycle detection in conversion chain
          if (activeChain.has(itemId) || activeChain.has(donorId)) {
            warnings.push({
              code: 'CYCLE_DETECTED',
              message: `Reciprocal conversion cycle detected between ${itemId} and ${donorId}`,
              details: { itemId, donorId, recipeId: convRecipe.id },
            })
            rawDeficitMap.set(itemId, (rawDeficitMap.get(itemId) ?? 0) + needed)
            pendingDemand.delete(itemId)
            continue
          }

          // Conversion uses available donor stock
          const donorStock = currentStock.get(donorId) ?? 0
          const timesNeeded = Math.ceil(needed / convRecipe.resultCount)
          const timesPossible = Math.floor(donorStock / donorIng.count)
          const timesToRun = Math.min(timesNeeded, timesPossible)

          if (timesToRun > 0) {
            activeChain.add(itemId)
            activeChain.add(donorId)

            const consumedDonors = timesToRun * donorIng.count
            const remDonorStock = donorStock - consumedDonors
            if (remDonorStock > 0) {
              currentStock.set(donorId, remDonorStock)
            } else {
              currentStock.delete(donorId)
            }

            const produced = timesToRun * convRecipe.resultCount
            const satisfied = Math.min(produced, needed)
            needed -= satisfied
            const surplus = produced - satisfied

            if (surplus > 0) {
              currentStock.set(itemId, (currentStock.get(itemId) ?? 0) + surplus)
            }

            const existing = craftsAggregated.get(convRecipe.id)
            if (existing) {
              existing.times += timesToRun
            } else {
              craftsAggregated.set(convRecipe.id, { recipe: convRecipe, times: timesToRun })
            }

            lmdForCrafting += timesToRun * convRecipe.goldCost

            if (calculateByproducts && convRecipe.extraOutcomes) {
              for (const extra of convRecipe.extraOutcomes) {
                const expectedVal = timesToRun * extra.count * extra.probability
                byproductsMap.set(extra.id, (byproductsMap.get(extra.id) ?? 0) + expectedVal)
              }
            }

            activeChain.delete(itemId)
            activeChain.delete(donorId)
          }

          // Remaining deficit that could not be converted from stock becomes raw deficit
          if (needed > 0) {
            rawDeficitMap.set(itemId, (rawDeficitMap.get(itemId) ?? 0) + needed)
          }

          pendingDemand.delete(itemId)
        } else {
          // Uncraftable item or tier not craftable
          rawDeficitMap.set(itemId, (rawDeficitMap.get(itemId) ?? 0) + needed)
          pendingDemand.delete(itemId)
        }
      }
    }
  }

  // Any remaining unhandled items across untracked tiers
  for (const [id, count] of pendingDemand.entries()) {
    if (count > 0) {
      rawDeficitMap.set(id, (rawDeficitMap.get(id) ?? 0) + count)
    }
  }

  // Build sorted, execution-ready crafts list (bottom-up by tier, then recipeId)
  const craftsList = Array.from(craftsAggregated.values())
  craftsList.sort((a, b) => {
    const tierA = graph.getItemTier(a.recipe.resultId)
    const tierB = graph.getItemTier(b.recipe.resultId)
    if (tierA !== tierB) {
      return tierA - tierB // Ascending: lower tier crafts execute first
    }
    return a.recipe.id.localeCompare(b.recipe.id)
  })

  const crafts = craftsList.map((c) => ({
    recipeId: c.recipe.id,
    times: c.times,
  }))

  // Format rawDeficit deterministically
  const rawDeficit: Record<string, number> = {}
  const sortedDeficitKeys = Array.from(rawDeficitMap.keys()).sort()
  for (const key of sortedDeficitKeys) {
    const val = rawDeficitMap.get(key)
    if (val && val > 0) {
      rawDeficit[key] = val
    }
  }

  // Format leftover stock deterministically
  const leftoverStock: Record<string, number> = {}
  const sortedStockKeys = Array.from(currentStock.keys()).sort()
  for (const key of sortedStockKeys) {
    const val = currentStock.get(key)
    if (val && val > 0) {
      leftoverStock[key] = val
    }
  }

  // Format byproducts with rounding
  const byproducts: Record<string, number> = {}
  if (calculateByproducts) {
    const sortedByproductKeys = Array.from(byproductsMap.keys()).sort()
    for (const key of sortedByproductKeys) {
      const val = byproductsMap.get(key)
      if (val && val > 0) {
        // Round to 6 decimal places to prevent IEEE 754 precision noise
        byproducts[key] = Math.round(val * 1e6) / 1e6
      }
    }
  }

  return {
    crafts,
    rawDeficit,
    lmdForCrafting,
    leftoverStock,
    byproducts,
    warnings,
  }
}
