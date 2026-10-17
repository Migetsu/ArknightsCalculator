import type {
  GuaranteeTier,
  RecruitCombinationResult,
  RecruitOperator,
} from '../../schemas/recruit'

const TIER_PRIORITY: Record<GuaranteeTier, number> = {
  '6_star': 1,
  '5_star': 2,
  '4_star': 3,
  robot: 4,
  '3_star_plus': 5,
  starter: 6,
}

/**
 * Generates all subsets of an array of length 1, 2, and 3.
 */
function getCombinations<T>(items: T[]): T[][] {
  const results: T[][] = []
  const n = items.length

  // Size 1
  for (let i = 0; i < n; i++) {
    const itemI = items[i]
    if (itemI !== undefined) {
      results.push([itemI])
    }
  }

  // Size 2
  for (let i = 0; i < n; i++) {
    const itemI = items[i]
    if (itemI === undefined) continue
    for (let j = i + 1; j < n; j++) {
      const itemJ = items[j]
      if (itemJ !== undefined) {
        results.push([itemI, itemJ])
      }
    }
  }

  // Size 3
  for (let i = 0; i < n; i++) {
    const itemI = items[i]
    if (itemI === undefined) continue
    for (let j = i + 1; j < n; j++) {
      const itemJ = items[j]
      if (itemJ === undefined) continue
      for (let k = j + 1; k < n; k++) {
        const itemK = items[k]
        if (itemK !== undefined) {
          results.push([itemI, itemJ, itemK])
        }
      }
    }
  }

  return results
}

/**
 * Pure calculation engine for Arknights Recruitment.
 * Evaluates tag combinations and determines guaranteed rarity tiers.
 *
 * Rules:
 * 1. 6★ operators only drop when 'Top Operator' is present in the combination.
 * 2. 1★ Robot operators drop when recruitment timer is <= 03:50 (guaranteed via 'Robot' tag).
 * 3. 2★ Starter operators drop when timer <= 07:40 (via 'Starter' tag).
 * 4. At standard 9:00 recruitment, 1★ and 2★ operators are eliminated from drop pool unless 'Robot' or 'Starter' is selected.
 */
export function calculateRecruit(
  selectedTags: string[],
  pool: RecruitOperator[],
): RecruitCombinationResult[] {
  if (!selectedTags || selectedTags.length === 0 || !pool || pool.length === 0) {
    return []
  }

  // Sanitize and deduplicate tags
  const cleanTags = Array.from(new Set(selectedTags.map((t) => t.trim()).filter(Boolean)))
  if (cleanTags.length === 0) {
    return []
  }

  const tagCombos = getCombinations(cleanTags)
  const results: RecruitCombinationResult[] = []

  for (const combo of tagCombos) {
    const hasTopOp = combo.includes('Top Operator')
    const hasRobot = combo.includes('Robot')
    const hasStarter = combo.includes('Starter')

    const matchingOperators = pool.filter((op) => {
      // Operator must contain all tags in combination
      const hasAllTags = combo.every((tag) => op.tags.includes(tag))
      if (!hasAllTags) {
        return false
      }

      // 6★ rule: 6★ units NEVER drop without Top Operator tag
      if (op.rarity === 6 && !hasTopOp) {
        return false
      }

      // 1★ and 2★ rules: at 9:00 recruitment, 1★ and 2★ do not drop unless Robot/Starter selected
      if (op.rarity === 1 && !hasRobot) {
        return false
      }
      if (op.rarity === 2 && !hasStarter) {
        return false
      }

      return true
    })

    if (matchingOperators.length === 0) {
      continue
    }

    // Sort operators by rarity desc, then name asc
    matchingOperators.sort((a, b) => {
      if (b.rarity !== a.rarity) {
        return b.rarity - a.rarity
      }
      return a.name.en.localeCompare(b.name.en)
    })

    const rarities = matchingOperators.map((o) => o.rarity)
    const minRarity = Math.min(...rarities)
    const maxRarity = Math.max(...rarities)
    const containsRobot = matchingOperators.some((o) => o.rarity === 1)

    // Determine Guarantee Tier
    let guaranteeTier: GuaranteeTier
    if (hasTopOp || minRarity === 6) {
      guaranteeTier = '6_star'
    } else if (minRarity >= 5) {
      guaranteeTier = '5_star'
    } else if (minRarity >= 4) {
      guaranteeTier = '4_star'
    } else if (hasRobot || containsRobot) {
      guaranteeTier = 'robot'
    } else if (hasStarter || minRarity === 2) {
      guaranteeTier = 'starter'
    } else {
      guaranteeTier = '3_star_plus'
    }

    results.push({
      tags: [...combo].sort(),
      operators: matchingOperators,
      guaranteeTier,
      minRarity,
      maxRarity,
      hasRobot: containsRobot,
    })
  }

  // Sort combination results
  results.sort((a, b) => {
    // 1. Guarantee tier priority
    const prioDiff = TIER_PRIORITY[a.guaranteeTier] - TIER_PRIORITY[b.guaranteeTier]
    if (prioDiff !== 0) return prioDiff

    // 2. Higher minRarity first
    if (b.minRarity !== a.minRarity) return b.minRarity - a.minRarity

    // 3. Higher maxRarity first
    if (b.maxRarity !== a.maxRarity) return b.maxRarity - a.maxRarity

    // 4. Fewer tags first (simpler combination)
    if (a.tags.length !== b.tags.length) return a.tags.length - b.tags.length

    // 5. Deterministic tag names
    return a.tags.join('+').localeCompare(b.tags.join('+'))
  })

  return results
}
