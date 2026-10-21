import type { Skin, SkinPriceStatus } from '../schemas/skin'

/**
 * Groups the flat skins dataset by operator id, preserving dataset order inside
 * each group. The server uses it to answer per-operator skin requests without
 * shipping the whole 1.6 MB dataset to every operator detail page.
 */
export function groupSkinsByCharId(skins: readonly Skin[]): Map<string, Skin[]> {
  const groups = new Map<string, Skin[]>()
  for (const skin of skins) {
    const list = groups.get(skin.charId)
    if (list) {
      list.push(skin)
    } else {
      groups.set(skin.charId, [skin])
    }
  }
  return groups
}

/**
 * Checks whether the given skin ID represents a default character form (E0, E1, E2, class change)
 * rather than an alternate cosmetic outfit.
 * In Arknights game data, all cosmetic outfits contain '@' separating character ID and theme tag.
 */
export function isDefaultSkin(skinId: string): boolean {
  return !skinId.includes('@')
}

/**
 * Determines the verifiable price status of an operator skin based on data flags
 * (isDefault, isBuySkin, and English approach description) without heuristic numerical costs
 * and without hardcoded non-Latin literals.
 */
export function getSkinPriceStatus(skin: {
  skinId?: string
  isDefault?: boolean
  isBuySkin?: boolean
  obtainApproach?: string | null
}): SkinPriceStatus {
  const isDefault = skin.isDefault ?? (skin.skinId ? isDefaultSkin(skin.skinId) : false)
  if (isDefault) {
    return 'default'
  }

  if (skin.isBuySkin === false) {
    return 'free'
  }

  const approach = (skin.obtainApproach ?? '').toLowerCase()
  const isFreeReward =
    approach.includes('reward') ||
    approach.includes('gift') ||
    approach.includes('strategies') ||
    approach.includes('reclamation') ||
    approach.includes('special pack') ||
    approach.includes('redemption code') ||
    approach.includes('exchange')

  if (isFreeReward) {
    return 'free'
  }

  if (approach.includes('store') || skin.isBuySkin) {
    return 'unknown'
  }

  return 'free'
}

/**
 * Formats a verifiable skin price status for display in the UI.
 * Strictly adheres to project rule: NO numeric prices.
 * - 'default' -> 'Base'
 * - 'free'    -> 'Free'
 * - 'unknown' -> '—'
 */
export function formatSkinPriceStatus(status: SkinPriceStatus): string {
  switch (status) {
    case 'default':
      return 'Base'
    case 'free':
      return 'Free'
    case 'unknown':
      return '—'
  }
}

/**
 * Sorts an operator's skins for display:
 * Default forms (E0/E1 #1, E2 #2) first by default, followed by cosmetic outfits.
 */
export function sortOperatorSkins<T extends { skinId: string; isDefault: boolean }>(
  skins: T[],
  options?: { defaultFirst?: boolean },
): T[] {
  const defaultFirst = options?.defaultFirst ?? true
  return [...skins].sort((a, b) => {
    if (a.isDefault !== b.isDefault) {
      return defaultFirst ? (a.isDefault ? -1 : 1) : a.isDefault ? 1 : -1
    }
    return a.skinId.localeCompare(b.skinId)
  })
}

/**
 * Filters an operator's skins by criteria.
 */
export function filterOperatorSkins<
  T extends { skinId: string; isDefault: boolean; isCnOnly?: boolean },
>(
  skins: T[],
  filters?: {
    excludeDefault?: boolean
    cnOnlyOnly?: boolean
  },
): T[] {
  return skins.filter((skin) => {
    if (filters?.excludeDefault && skin.isDefault) return false
    if (filters?.cnOnlyOnly && !skin.isCnOnly) return false
    return true
  })
}
