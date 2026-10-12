import type { CalculatedCost, CostCategoryBreakdown } from './types'

/**
 * Merges items list by summing counts of matching item IDs.
 */
function mergeItems(
  existing: Array<{ id: string; count: number }>,
  additions: Array<{ id: string; count: number }>,
): Array<{ id: string; count: number }> {
  const map = new Map<string, number>()
  for (const item of existing) {
    map.set(item.id, (map.get(item.id) ?? 0) + item.count)
  }
  for (const item of additions) {
    map.set(item.id, (map.get(item.id) ?? 0) + item.count)
  }
  return Array.from(map.entries())
    .map(([id, count]) => ({ id, count }))
    .filter((it) => it.count > 0)
}

/**
 * Aggregates multiple calculated costs into a single combined cost summary.
 */
export function sumCosts(costs: CalculatedCost[]): CalculatedCost {
  let totalLmd = 0
  let totalExp = 0
  let levelUpLmd = 0
  let evolveLmd = 0
  let skillsLmd = 0
  let modulesLmd = 0

  let eliteItems: Array<{ id: string; count: number }> = []
  let skillsItems: Array<{ id: string; count: number }> = []
  let masteriesItems: Array<{ id: string; count: number }> = []
  let modulesItems: Array<{ id: string; count: number }> = []

  for (const cost of costs) {
    totalLmd += cost.lmd
    totalExp += cost.exp
    levelUpLmd += cost.breakdown.lmd.levelUp
    evolveLmd += cost.breakdown.lmd.evolve
    skillsLmd += cost.breakdown.lmd.skills
    modulesLmd += cost.breakdown.lmd.modules

    eliteItems = mergeItems(eliteItems, cost.breakdown.items.elite)
    skillsItems = mergeItems(skillsItems, cost.breakdown.items.skills)
    masteriesItems = mergeItems(masteriesItems, cost.breakdown.items.masteries)
    modulesItems = mergeItems(modulesItems, cost.breakdown.items.modules)
  }

  const categoryItems: CostCategoryBreakdown = {
    elite: eliteItems,
    skills: skillsItems,
    masteries: masteriesItems,
    modules: modulesItems,
  }

  let allItems = mergeItems([], eliteItems)
  allItems = mergeItems(allItems, skillsItems)
  allItems = mergeItems(allItems, masteriesItems)
  allItems = mergeItems(allItems, modulesItems)

  return {
    lmd: totalLmd,
    exp: totalExp,
    items: allItems,
    breakdown: {
      lmd: {
        levelUp: levelUpLmd,
        evolve: evolveLmd,
        skills: skillsLmd,
        modules: modulesLmd,
      },
      exp: totalExp,
      items: categoryItems,
    },
  }
}
