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
 * Determines the verifiable price status of an operator skin based directly
 * on game data flags (obtainApproach), without guessing numerical costs.
 */
export function getSkinPriceStatus(skin: {
  skinId: string
  obtainApproach?: string | null
}): SkinPriceStatus {
  if (isDefaultSkin(skin.skinId)) {
    return 'default'
  }

  const approach = (skin.obtainApproach ?? '').toLowerCase()
  const approachRaw = skin.obtainApproach ?? ''

  // Store purchases from Procurement Center
  const isStore = approach.includes('store') || approachRaw.includes('采购中心')

  if (isStore) {
    return 'unknown'
  }

  // Free distribution via events, quests, gifts, IS, RA, redemption codes, etc.
  return 'free'
}
