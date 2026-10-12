import type { ExpItem } from '../../schemas/gameConstants'
import type { ExpCardPlan } from './types'

export interface PlanExpCardsOptions {
  /**
   * Available stock of cards by item ID. If provided, greedy allocation prioritizes
   * depleting stock first before recommending additional cards.
   */
  stock?: Record<string, number>
  /**
   * Strategy:
   * - 'min_cards': Use largest cards first to minimize card usage (standard Arknights behavior).
   * - 'min_waste': Prefer smaller cards when close to the target to minimize wasted EXP.
   */
  strategy?: 'min_cards' | 'min_waste'
}

/**
 * Plans battle record / EXP cards needed to reach an EXP requirement.
 * Default standard cards (sorted descending by gainExp):
 * - 2004 (Strategic Battle Record): 2000 EXP
 * - 2003 (Tactical Battle Record): 1000 EXP
 * - 2002 (Frontline Battle Record): 400 EXP
 * - 2001 (Drill Battle Record): 200 EXP
 */
export function planExpCards(
  expNeeded: number,
  expItems: ExpItem[],
  options: PlanExpCardsOptions = {},
): ExpCardPlan {
  if (expNeeded <= 0) {
    return {
      cards: {},
      totalExp: 0,
      wasteExp: 0,
    }
  }

  // Sort available cards descending by exp value
  const sorted = [...expItems].sort((a, b) => b.gainExp - a.gainExp)
  const cards: Record<string, number> = {}
  let accumulatedExp = 0

  if (options.strategy === 'min_waste') {
    // Exact/min-waste bounded search
    let remaining = expNeeded
    for (let i = 0; i < sorted.length; i++) {
      const card = sorted[i]!
      if (remaining <= 0) break

      const isSmallest = i === sorted.length - 1
      if (isSmallest) {
        // Must round up with the smallest available card
        const count = Math.ceil(remaining / card.gainExp)
        if (count > 0) {
          cards[card.id] = (cards[card.id] ?? 0) + count
          accumulatedExp += count * card.gainExp
          remaining -= count * card.gainExp
        }
      } else {
        const count = Math.floor(remaining / card.gainExp)
        if (count > 0) {
          cards[card.id] = (cards[card.id] ?? 0) + count
          accumulatedExp += count * card.gainExp
          remaining -= count * card.gainExp
        }
      }
    }
  } else {
    // Standard 'min_cards' (greedy largest-first with smallest card to cap)
    let remaining = expNeeded
    for (let i = 0; i < sorted.length; i++) {
      const card = sorted[i]!
      if (remaining <= 0) break

      const isSmallest = i === sorted.length - 1
      if (isSmallest) {
        const count = Math.ceil(remaining / card.gainExp)
        if (count > 0) {
          cards[card.id] = (cards[card.id] ?? 0) + count
          accumulatedExp += count * card.gainExp
          remaining -= count * card.gainExp
        }
      } else {
        const count = Math.floor(remaining / card.gainExp)
        if (count > 0) {
          cards[card.id] = (cards[card.id] ?? 0) + count
          accumulatedExp += count * card.gainExp
          remaining -= count * card.gainExp
        }
      }
    }
  }

  return {
    cards,
    totalExp: accumulatedExp,
    wasteExp: Math.max(0, accumulatedExp - expNeeded),
  }
}
