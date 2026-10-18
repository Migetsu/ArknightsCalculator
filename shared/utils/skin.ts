/**
 * Pure utilities and pricing calculation for Arknights operator skins and outfits.
 */

export interface SkinPriceInput {
  skinId?: string
  isBuySkin: boolean
  dynEntranceId?: string | null
  dynIllustId?: string | null
  voiceType?: string | null
  obtainApproach?: string | null
  displayTagId?: string | null
}

export interface SkinPriceResult {
  price?: number
  currency?: string
}

/**
 * Known early standard skins (released in 2019/early 2020) without custom combat particle
 * effects that were sold in the Outfit Store for 15 Originite Prime instead of 18.
 */
export const KNOWN_15_OP_SKIN_IDS = new Set<string>([
  'char_115_headhd@winter#1', // Courier - New Route
  'char_122_beagle@winter#1', // Beagle - Dreadnought
  'char_235_jesica@winter#1', // Jessica - Iron Block
  'char_212_ansel@summer#1', // Ansel - Casual Vacance
  'char_208_melan@winter#1', // Melantha
  'char_108_silent@winter#1', // Silence - Frosted
  'char_130_doberm@winter#1', // Dobermann
  'char_290_vigna@summer#1', // Vigna - Casual
  'char_107_liskam@winter#1', // Liskarm
  'char_198_blackd@winter#1', // Croissant
  'char_271_spnowa@winter#1', // Frostleaf
  'char_148_nearl@winter#1', // Nearl
  'char_147_shining@summer#1', // Shining - Silent Night
  'char_174_slbell@summer#1', // Pramanix - Caster's Frost
  'char_278_orchid@winter#1', // Orchid
  'char_109_fmout@winter#1', // Cliffheart - Highland Fox
  'char_110_deepcl@winter#1', // Deepcolor
  'char_190_clour@summer#1', // Gitano
  'char_240_wyvern@summer#1', // Vanilla
  'char_241_panda@summer#1', // FEater
  'char_103_angel@winter#1', // Exusiai - Wild Operation
])

/**
 * Checks whether the given skin ID represents a default character form (E0, E1, E2, class change)
 * rather than an alternate cosmetic outfit.
 * In Arknights game data, all cosmetic outfits contain '@' separating character ID and theme tag.
 */
export function isDefaultSkin(skinId: string): boolean {
  return !skinId.includes('@')
}

/**
 * Calculates the standard Originite Prime cost and currency for an operator skin
 * based on deterministic game rules and data flags.
 *
 * Rules:
 * - Free rewards (Event Reward, Quest Reward, Integrated Strategies, Reclamation Algorithm, Gift packs): null price.
 * - Dynamic / Live2D skins with unique entrance animation or dynamic voice: 24 OP.
 * - Dynamic / Live2D skins (animated illustration): 21 OP.
 * - Standard store outfits without dynamic art: 18 OP (or 15 OP for early effectless skins).
 */
export function calculateSkinPrice(skin: SkinPriceInput): SkinPriceResult {
  const approach = skin.obtainApproach?.toLowerCase() ?? ''
  const approachRaw = skin.obtainApproach ?? ''
  const tag = skin.displayTagId?.toLowerCase() ?? ''
  const tagRaw = skin.displayTagId ?? ''

  // Determine if this is a store/procurement purchase
  const isStore =
    approach.includes('store') ||
    approachRaw.includes('采购中心') ||
    tag === 'from collabs' ||
    tagRaw === '联动获得'

  // Determine if this is a free reward / milestone distribution
  const isReward =
    tag.includes('reward') ||
    tagRaw.includes('活动获得') ||
    tag.includes('strategies') ||
    tagRaw.includes('集成战略') ||
    approach.includes('reward') ||
    approachRaw.includes('活动获得') ||
    approachRaw.includes('任务奖励') ||
    approach.includes('gift') ||
    approachRaw.includes('活动赠送') ||
    approach.includes('strategies') ||
    approachRaw.includes('集成战略') ||
    approach.includes('pack') ||
    approachRaw.includes('生息演算')

  if (
    !skin.isBuySkin ||
    !isStore ||
    (isReward && !approach.includes('store') && !approachRaw.includes('采购中心'))
  ) {
    return {}
  }

  // 1. Dynamic / Live2D with custom deployment entrance animation or dynamic voice
  if (skin.dynEntranceId || (skin.dynIllustId && skin.voiceType === 'ALL')) {
    return { price: 24, currency: 'ORIGINITE_PRIME' }
  }

  // 2. Dynamic / Live2D illustration
  if (skin.dynIllustId) {
    return { price: 21, currency: 'ORIGINITE_PRIME' }
  }

  // 3. Early standard skins without combat FX
  if (skin.skinId && KNOWN_15_OP_SKIN_IDS.has(skin.skinId)) {
    return { price: 15, currency: 'ORIGINITE_PRIME' }
  }

  // 4. Standard store outfit
  return { price: 18, currency: 'ORIGINITE_PRIME' }
}
