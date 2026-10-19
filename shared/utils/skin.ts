import type { SkinPriceStatus } from '../schemas/skin'

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
