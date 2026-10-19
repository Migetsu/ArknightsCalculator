/**
 * Asset kinds supported by Arknights game resource repositories.
 */
export type AssetKind = 'avatar' | 'portrait' | 'art' | 'item' | 'skill' | 'equip'

export interface ResolveAssetOptions {
  /**
   * Optional custom variant (e.g. skin id, elite 2 portrait suffix).
   */
  variant?: string
  /**
   * Optional specific icon identifier (e.g. item iconId like MTL_SL_G2, skill iconId like skcom_powerstrike[3], or equip typeIcon).
   */
  iconId?: string
  /**
   * Preferred format extension (defaults to 'png').
   */
  format?: 'png' | 'webp'
  /**
   * Whether to prioritize local WebP thumbnail for catalog grids.
   */
  thumbnail?: boolean
  /**
   * Whether to prioritize medium WebP copy (1280px) for operator hero detail headers.
   */
  hero?: boolean
}

/**
 * Pinned commit for pre-rendered optimized WebP assets repository (Migetsu/arkcalc-assets).
 */
export const OPTIMIZED_ASSETS_COMMIT = 'e8031f907867066f1c76669f8ca3712f19de81b5'
export const OPTIMIZED_ASSETS_CDN = `https://cdn.jsdelivr.net/gh/Migetsu/arkcalc-assets@${OPTIMIZED_ASSETS_COMMIT}`

/**
 * Pinned resource commit from yuanyan3060/ArknightsGameResource.
 * Matches DATA_SOURCES_CONFIG.assets.commit.
 */
export const ASSET_REPO_COMMIT = '9bf239661e37766fba585806fb9fa67e79bb679e'

const REPO_OWNER = 'yuanyan3060'
const REPO_NAME = 'ArknightsGameResource'

/**
 * Primary CDN base: jsDelivr GitHub proxy.
 */
export const PRIMARY_CDN_BASE = `https://cdn.jsdelivr.net/gh/${REPO_OWNER}/${REPO_NAME}@${ASSET_REPO_COMMIT}`

/**
 * Secondary CDN mirror: Statically GitHub proxy.
 */
export const SECONDARY_CDN_BASE = `https://cdn.statically.io/gh/${REPO_OWNER}/${REPO_NAME}/${ASSET_REPO_COMMIT}`

/**
 * Pinned commit for exclusive equipment / module icons from Aceship/Arknight-Images.
 */
export const EQUIP_REPO_OWNER = 'Aceship'
export const EQUIP_REPO_NAME = 'Arknight-Images'
export const EQUIP_REPO_COMMIT = '0b28f9562fcadbd644c6225f8f8aefbb500b4d22'

export const PRIMARY_EQUIP_CDN_BASE = `https://cdn.jsdelivr.net/gh/${EQUIP_REPO_OWNER}/${EQUIP_REPO_NAME}@${EQUIP_REPO_COMMIT}`
export const SECONDARY_EQUIP_CDN_BASE = `https://cdn.statically.io/gh/${EQUIP_REPO_OWNER}/${EQUIP_REPO_NAME}/${EQUIP_REPO_COMMIT}`

/**
 * Pinned commit for comprehensive equipment / module icons from fexli/ArknightsResource.
 * Ensures 100% coverage for modules released after May 2024.
 */
export const FEXLI_REPO_OWNER = 'fexli'
export const FEXLI_REPO_NAME = 'ArknightsResource'
export const FEXLI_REPO_COMMIT = 'd7bdc0146f99f6fa88ecdc1bbf79021c012c21c5'

export const PRIMARY_FEXLI_CDN_BASE = `https://cdn.jsdelivr.net/gh/${FEXLI_REPO_OWNER}/${FEXLI_REPO_NAME}@${FEXLI_REPO_COMMIT}`
export const SECONDARY_FEXLI_CDN_BASE = `https://cdn.statically.io/gh/${FEXLI_REPO_OWNER}/${FEXLI_REPO_NAME}/${FEXLI_REPO_COMMIT}`

/**
 * Map of asset kinds to repository subdirectories.
 */
const KIND_DIR_MAP: Record<AssetKind, string> = {
  avatar: 'avatar',
  portrait: 'portrait',
  art: 'skin',
  item: 'item',
  skill: 'skill',
  equip: 'equip',
}

/**
 * 1-3 star operators that only possess Elite 0/1 forms (no Elite 2 art).
 */
export const LOW_RARITY_OPERATOR_IDS = new Set<string>([
  'char_120_hibisc',
  'char_121_lava',
  'char_122_beagle',
  'char_123_fang',
  'char_124_kroos',
  'char_192_falco',
  'char_208_melan',
  'char_209_ardign',
  'char_210_stward',
  'char_211_adnach',
  'char_212_ansel',
  'char_240_wyvern',
  'char_278_orchid',
  'char_281_popka',
  'char_282_catap',
  'char_283_midn',
  'char_284_spot',
  'char_009_12fce',
  'char_500_noirc',
  'char_501_durin',
  'char_502_nblade',
  'char_503_rang',
  'char_285_medic2',
  'char_286_cast3',
  'char_376_therex',
  'char_4000_jnight',
  'char_4077_palico',
  'char_4091_ulika',
  'char_4093_frston',
  'char_4136_phonor',
  'char_4188_confes',
  'char_4215_buddy',
  'char_4220_kormr',
  'char_4227_gallus',
])

/**
 * Known avatar overrides for operators whose base avatar has non-standard naming.
 * Amiya (Medic class change) is released with only Elite 2 assets in the game files.
 */
const AVATAR_DEFAULT_OVERRIDE_MAP: Record<string, string> = {
  char_1037_amiya3: 'char_1037_amiya3_2',
}

/**
 * Known default icon ID mappings for items whose icon asset name differs from their item ID.
 * e.g. 4001 -> GOLD (LMD), 4002 -> DIAMOND (Originite Prime), 4003 -> DIAMOND_SHD (Orundum).
 */
export const ITEM_ICON_DEFAULT_MAP: Record<string, string> = {
  // Battle records
  '2001': 'sprite_exp_card_t1',
  '2002': 'sprite_exp_card_t2',
  '2003': 'sprite_exp_card_t3',
  '2004': 'sprite_exp_card_t4',

  // Currencies, vouchers & gacha permits
  '3003': 'MTL_GOLD3',
  '3141': 'MTL_DIAMOND_SHD',
  '3401': 'COIN_FURN',
  '4001': 'GOLD',
  '4002': 'DIAMOND',
  '4003': 'DIAMOND_SHD',
  '4004': 'HGG_SHD',
  '4005': 'LGG_SHD',
  '4006': 'EXGG_SHD',
  '7001': 'TKT_RECRUIT',
  '7003': 'TKT_GACHA',
  '7004': 'TKT_GACHA_10',

  // Building & infrastructure materials
  '3105': 'MTL_BASE_ESS',
  '3112': 'MTL_BASE_SL1',
  '3113': 'MTL_BASE_SL2',
  '3114': 'MTL_BASE_SL3',
  '3131': 'MTL_BASE_SYNTH1',
  '3132': 'MTL_BASE_SYNTH2',
  '3133': 'MTL_BASE_SYNTH3',

  // Skill summaries
  '3301': 'MTL_SKILL1',
  '3302': 'MTL_SKILL2',
  '3303': 'MTL_SKILL3',

  // Promotion dualchips, chip packs & chips
  '32001': 'MTL_ASC_DI',
  '3211': 'MTL_ASC_PIO1',
  '3212': 'MTL_ASC_PIO2',
  '3213': 'MTL_ASC_PIO3',
  '3221': 'MTL_ASC_GRD1',
  '3222': 'MTL_ASC_GRD2',
  '3223': 'MTL_ASC_GRD3',
  '3231': 'MTL_ASC_TNK1',
  '3232': 'MTL_ASC_TNK2',
  '3233': 'MTL_ASC_TNK3',
  '3241': 'MTL_ASC_SNP1',
  '3242': 'MTL_ASC_SNP2',
  '3243': 'MTL_ASC_SNP3',
  '3251': 'MTL_ASC_CST1',
  '3252': 'MTL_ASC_CST2',
  '3253': 'MTL_ASC_CST3',
  '3261': 'MTL_ASC_MED1',
  '3262': 'MTL_ASC_MED2',
  '3263': 'MTL_ASC_MED3',
  '3271': 'MTL_ASC_SUP1',
  '3272': 'MTL_ASC_SUP2',
  '3273': 'MTL_ASC_SUP3',
  '3281': 'MTL_ASC_SPC1',
  '3282': 'MTL_ASC_SPC2',
  '3283': 'MTL_ASC_SPC3',

  // Tier 1..5 upgrade materials
  '30011': 'MTL_SL_G1',
  '30012': 'MTL_SL_G2',
  '30013': 'MTL_SL_G3',
  '30014': 'MTL_SL_G4',
  '30021': 'MTL_SL_STRG1',
  '30022': 'MTL_SL_STRG2',
  '30023': 'MTL_SL_STRG3',
  '30024': 'MTL_SL_STRG4',
  '30031': 'MTL_SL_RUSH1',
  '30032': 'MTL_SL_RUSH2',
  '30033': 'MTL_SL_RUSH3',
  '30034': 'MTL_SL_RUSH4',
  '30041': 'MTL_SL_IRON1',
  '30042': 'MTL_SL_IRON2',
  '30043': 'MTL_SL_IRON3',
  '30044': 'MTL_SL_IRON4',
  '30051': 'MTL_SL_KETONE1',
  '30052': 'MTL_SL_KETONE2',
  '30053': 'MTL_SL_KETONE3',
  '30054': 'MTL_SL_KETONE4',
  '30061': 'MTL_SL_BOSS1',
  '30062': 'MTL_SL_BOSS2',
  '30063': 'MTL_SL_BOSS3',
  '30064': 'MTL_SL_BOSS4',
  '30073': 'MTL_SL_ALCOHOL1',
  '30074': 'MTL_SL_ALCOHOL2',
  '30083': 'MTL_SL_MANGANESE1',
  '30084': 'MTL_SL_MANGANESE2',
  '30093': 'MTL_SL_PG1',
  '30094': 'MTL_SL_PG2',
  '30103': 'MTL_SL_RMA7012',
  '30104': 'MTL_SL_RMA7024',
  '30115': 'MTL_SL_PP',
  '30125': 'MTL_SL_BN',
  '30135': 'MTL_SL_DS',
  '30145': 'MTL_SL_OEU',
  '30155': 'MTL_SL_SHJ',
  '30165': 'MTL_SL_DYT',
  '31013': 'MTL_SL_PGEL3',
  '31014': 'MTL_SL_PGEL4',
  '31023': 'MTL_SL_IAM3',
  '31024': 'MTL_SL_IAM4',
  '31033': 'MTL_SL_OC3',
  '31034': 'MTL_SL_OC4',
  '31043': 'MTL_SL_SS',
  '31044': 'MTL_SL_RS',
  '31053': 'MTL_SL_CCF',
  '31054': 'MTL_SL_PLCF',
  '31063': 'MTL_SL_ZY',
  '31064': 'MTL_SL_ZYK',
  '31073': 'MTL_SL_XW',
  '31074': 'MTL_SL_XWB',
  '31083': 'MTL_SL_HT',
  '31084': 'MTL_SL_HTT',
  '31093': 'MTL_SL_JH',
  '31094': 'MTL_SL_QGT',
  '31103': 'MTL_SL_YHT',
  '31104': 'MTL_SL_YHT4',
  '31113': 'MTL_SL_DJ',
  '31114': 'MTL_SL_DJ4',

  // Event & special items
  act13side_prestige_armorless: 'act13side_token_model',
  act13side_prestige_commerce: 'act13side_token_model',
  act13side_prestige_kazimierz: 'act13side_token_model',
  act25side_token_key01: 'act12side_token_key01',
  act25side_token_key02: 'act12side_token_key02',
  ark_odc_act53side_spitem_1: 'ark_odc_act53side_spitem',
}

/**
 * Known portrait default variant overrides.
 * Class changes (Amiya Guard, Amiya Medic) only exist in Elite 2 form, so their base portrait is _2.
 */
const PORTRAIT_DEFAULT_VARIANT_MAP: Record<string, string> = {
  char_1001_amiya2: '2',
  char_1037_amiya3: '2',
}

/**
 * Resolves an ordered list of candidate URLs for a given game asset.
 * Pure function: strictly no network I/O, no runtime hotlinking to prts.wiki
 * or raw.githubusercontent.com.
 *
 * @param kind - The category of the asset (avatar, portrait, art, item, skill, equip).
 * @param id - The unique game asset identifier (e.g. 'char_102_texas', 'skchr_texas_2', '30012', 'uniequip_002_texas').
 * @param options - Formatting, iconId override, and variant options.
 * @returns Array of fallback URL candidates.
 */
/**
 * URL-encodes asset filename characters such as '#' to '%23' to ensure valid CDN request paths.
 */
function encodeAssetPath(filename: string): string {
  return filename.replace(/#/g, '%23')
}

export function resolveAsset(
  kind: AssetKind,
  id: string | null | undefined,
  options?: ResolveAssetOptions,
): string[] {
  if (!id || typeof id !== 'string' || id.trim().length === 0) {
    return []
  }

  const cleanId = id.trim()
  const dir = KIND_DIR_MAP[kind] ?? 'avatar'
  const ext = options?.format ?? 'png'

  // 1. Full character artwork ('art') with thumbnail -> primary CDN -> fallback chain
  if (kind === 'art') {
    // Check if cleanId or options.variant specifies an alternate skin
    let skinBaseId: string | null = null
    const rawVariant = options?.variant?.trim()

    if (cleanId.includes('@')) {
      skinBaseId = cleanId.replace(/@/g, '_')
    } else if (cleanId.includes('#')) {
      skinBaseId = cleanId.replace(/#/, '_')
    } else if (rawVariant && rawVariant.includes('@')) {
      const normalizedVariant = rawVariant.replace(/@/g, '_')
      skinBaseId = normalizedVariant.startsWith(`${cleanId}_`)
        ? normalizedVariant
        : `${cleanId}_${normalizedVariant}`
    } else if (rawVariant && rawVariant.includes('#')) {
      if (rawVariant.startsWith(`${cleanId}#`)) {
        skinBaseId = rawVariant.replace(`${cleanId}#`, `${cleanId}_`)
      } else if (rawVariant.startsWith('#')) {
        skinBaseId = `${cleanId}_${rawVariant.slice(1)}`
      } else {
        skinBaseId = `${cleanId}_${rawVariant}`
      }
    }

    if (skinBaseId) {
      const skinFileBase = skinBaseId.endsWith('b') ? skinBaseId : `${skinBaseId}b`
      const skinFilename = `${skinFileBase}.${ext}`
      const encodedFilename = encodeAssetPath(skinFilename)

      const portraitId = skinBaseId.endsWith('b') ? skinBaseId.slice(0, -1) : skinBaseId
      const encodedPortrait = encodeAssetPath(`${portraitId}.${ext}`)

      const candidates: string[] = []

      if (options?.thumbnail) {
        // Thumbnail requested (e.g. skin cards in gallery): prioritize lightweight portrait/ first
        candidates.push(
          `${PRIMARY_CDN_BASE}/portrait/${encodedPortrait}`,
          `${SECONDARY_CDN_BASE}/portrait/${encodedPortrait}`,
          `${PRIMARY_CDN_BASE}/${dir}/${encodedFilename}`,
          `${SECONDARY_CDN_BASE}/${dir}/${encodedFilename}`,
        )
      } else {
        // Full resolution artwork requested (e.g. art viewer modal)
        candidates.push(
          `${PRIMARY_CDN_BASE}/${dir}/${encodedFilename}`,
          `${SECONDARY_CDN_BASE}/${dir}/${encodedFilename}`,
          `${PRIMARY_CDN_BASE}/portrait/${encodedPortrait}`,
          `${SECONDARY_CDN_BASE}/portrait/${encodedPortrait}`,
        )
      }

      // Fallback to avatar
      candidates.push(
        `${PRIMARY_CDN_BASE}/avatar/${encodedPortrait}`,
        `${SECONDARY_CDN_BASE}/avatar/${encodedPortrait}`,
      )

      return Array.from(new Set(candidates))
    }

    const isLowRarity = LOW_RARITY_OPERATOR_IDS.has(cleanId)
    // Default to '2' (Elite 2) if operator has E2, otherwise '1' (E0/E1)
    const primaryVariant =
      rawVariant ??
      (PORTRAIT_DEFAULT_VARIANT_MAP[cleanId]
        ? PORTRAIT_DEFAULT_VARIANT_MAP[cleanId]!
        : isLowRarity
          ? '1'
          : '2')

    const fileSuffix = primaryVariant.endsWith('b') ? primaryVariant : `${primaryVariant}b`
    const primaryFilename = `${cleanId}_${fileSuffix}.${ext}`
    const encodedPrimaryFilename = encodeAssetPath(primaryFilename)

    const candidates: string[] = []

    // 1a. Prioritize medium 1280px WebP copy for operator hero header if requested
    if (options?.hero) {
      candidates.push(
        `/art/hero/${cleanId}_${primaryVariant}.webp`,
        `${OPTIMIZED_ASSETS_CDN}/hero/${cleanId}_${primaryVariant}.webp`,
      )
    }

    // 1b. Prioritize local WebP thumbnail for list grids if requested
    if (options?.thumbnail) {
      candidates.push(
        `/art/thumbs/${cleanId}.webp`,
        `${OPTIMIZED_ASSETS_CDN}/thumbs/${cleanId}.webp`,
      )
    }

    // 1b. Full artwork candidates (primary & secondary CDNs)
    candidates.push(
      `${PRIMARY_CDN_BASE}/${dir}/${encodedPrimaryFilename}`,
      `${SECONDARY_CDN_BASE}/${dir}/${encodedPrimaryFilename}`,
    )

    // 1c. If requested E2 art, fallback to E1 art (_1b.png)
    if (primaryVariant === '2') {
      const e1Filename = encodeAssetPath(`${cleanId}_1b.${ext}`)
      candidates.push(
        `${PRIMARY_CDN_BASE}/${dir}/${e1Filename}`,
        `${SECONDARY_CDN_BASE}/${dir}/${e1Filename}`,
      )
    }

    // 1d. Fallback to waist-up portrait
    const portraitCandidates = resolveAsset('portrait', cleanId, {
      variant: primaryVariant,
      format: ext,
    })
    candidates.push(...portraitCandidates)

    // 1e. Final fallback to avatar icon
    const avatarCandidates = resolveAsset('avatar', cleanId, { format: ext })
    candidates.push(...avatarCandidates)

    // Remove duplicates while preserving order
    return Array.from(new Set(candidates))
  }

  // 2. Portrait kind handling
  if (kind === 'portrait') {
    let targetId = cleanId.replace(/@/g, '_')
    const rawVariant = options?.variant?.trim()

    if (rawVariant) {
      let normalizedVariant = rawVariant.replace(/@/g, '_')
      if (normalizedVariant.startsWith(`${targetId}#`)) {
        normalizedVariant = normalizedVariant.replace(`${targetId}#`, `${targetId}_`)
      }
      if (normalizedVariant.startsWith(`${targetId}_`)) {
        targetId = normalizedVariant
      } else if (normalizedVariant.includes('#') || normalizedVariant.includes('_')) {
        targetId = `${targetId}_${normalizedVariant}`
      } else {
        const filename = encodeAssetPath(`${targetId}_${normalizedVariant}.${ext}`)
        return [
          `${PRIMARY_CDN_BASE}/${dir}/${filename}`,
          `${SECONDARY_CDN_BASE}/${dir}/${filename}`,
        ]
      }
    }

    const primaryFilename = encodeAssetPath(`${targetId}.${ext}`)
    if (targetId.includes('#')) {
      return [
        `${PRIMARY_CDN_BASE}/${dir}/${primaryFilename}`,
        `${SECONDARY_CDN_BASE}/${dir}/${primaryFilename}`,
      ]
    }

    // Default portrait naming in ArknightsGameResource uses _1 (or _2 for class changes)
    const primaryVariant = PORTRAIT_DEFAULT_VARIANT_MAP[targetId] ?? '1'
    const altVariant = primaryVariant === '1' ? '2' : undefined

    const defaultFilename = encodeAssetPath(`${targetId}_${primaryVariant}.${ext}`)
    const candidates = [
      `${PRIMARY_CDN_BASE}/${dir}/${defaultFilename}`,
      `${SECONDARY_CDN_BASE}/${dir}/${defaultFilename}`,
    ]

    if (altVariant) {
      const altFilename = encodeAssetPath(`${targetId}_${altVariant}.${ext}`)
      candidates.push(
        `${PRIMARY_CDN_BASE}/${dir}/${altFilename}`,
        `${SECONDARY_CDN_BASE}/${dir}/${altFilename}`,
      )
    }

    return candidates
  }

  // 3. Avatar kind handling with Amiya class change mapping
  if (kind === 'avatar') {
    let targetId = cleanId.replace(/@/g, '_')
    const rawVariant = options?.variant?.trim()

    if (rawVariant) {
      let normalizedVariant = rawVariant.replace(/@/g, '_')
      if (normalizedVariant.startsWith(`${targetId}#`)) {
        normalizedVariant = normalizedVariant.replace(`${targetId}#`, `${targetId}_`)
      }
      targetId = normalizedVariant.startsWith(`${targetId}_`)
        ? normalizedVariant
        : `${targetId}_${normalizedVariant}`
    }

    if (targetId.includes('#')) {
      const filename = encodeAssetPath(`${targetId}.${ext}`)
      return [`${PRIMARY_CDN_BASE}/${dir}/${filename}`, `${SECONDARY_CDN_BASE}/${dir}/${filename}`]
    }

    const overrideName = AVATAR_DEFAULT_OVERRIDE_MAP[targetId]
    if (overrideName) {
      return [
        `${PRIMARY_CDN_BASE}/${dir}/${overrideName}.${ext}`,
        `${SECONDARY_CDN_BASE}/${dir}/${overrideName}.${ext}`,
        `${PRIMARY_CDN_BASE}/${dir}/${targetId}.${ext}`,
        `${SECONDARY_CDN_BASE}/${dir}/${targetId}.${ext}`,
      ]
    }
  }

  // 3. Skill kind handling (skills in ArknightsGameResource use 'skill_icon_' prefix)
  if (kind === 'skill') {
    const targetId = options?.iconId?.trim() || cleanId
    const skillBaseName = targetId.startsWith('skill_icon_') ? targetId : `skill_icon_${targetId}`
    const primaryFilename = `${skillBaseName}.${ext}`
    const candidates = [
      `${PRIMARY_CDN_BASE}/${dir}/${primaryFilename}`,
      `${SECONDARY_CDN_BASE}/${dir}/${primaryFilename}`,
    ]

    // Fallback: if options.iconId was used, try cleanId with prefix
    if (options?.iconId && options.iconId.trim() !== cleanId) {
      const fallbackBaseName = cleanId.startsWith('skill_icon_') ? cleanId : `skill_icon_${cleanId}`
      const fallbackFilename = `${fallbackBaseName}.${ext}`
      candidates.push(
        `${PRIMARY_CDN_BASE}/${dir}/${fallbackFilename}`,
        `${SECONDARY_CDN_BASE}/${dir}/${fallbackFilename}`,
      )
    }

    // Secondary fallback without 'skill_icon_' prefix
    if (!targetId.startsWith('skill_icon_')) {
      const rawFilename = `${targetId}.${ext}`
      candidates.push(
        `${PRIMARY_CDN_BASE}/${dir}/${rawFilename}`,
        `${SECONDARY_CDN_BASE}/${dir}/${rawFilename}`,
      )
    }

    return candidates
  }

  // 4. Item kind handling (prefers iconId if provided, then default icon map, then cleanId)
  if (kind === 'item') {
    const defaultIcon = ITEM_ICON_DEFAULT_MAP[cleanId]
    const primaryTarget = options?.iconId?.trim() || defaultIcon || cleanId
    const primaryFilename = `${primaryTarget}.${ext}`
    const candidates = [
      `${PRIMARY_CDN_BASE}/${dir}/${primaryFilename}`,
      `${SECONDARY_CDN_BASE}/${dir}/${primaryFilename}`,
      `${PRIMARY_EQUIP_CDN_BASE}/items/${primaryFilename}`,
      `${SECONDARY_EQUIP_CDN_BASE}/items/${primaryFilename}`,
    ]

    // Fallbacks if default mapping or cleanId is different
    const fallbackTargets = new Set<string>()
    if (defaultIcon && defaultIcon !== primaryTarget) {
      fallbackTargets.add(defaultIcon)
    }
    if (cleanId !== primaryTarget) {
      fallbackTargets.add(cleanId)
    }
    if (options?.iconId && options.iconId.trim() !== primaryTarget) {
      fallbackTargets.add(options.iconId.trim())
    }

    for (const fb of fallbackTargets) {
      const fbFilename = `${fb}.${ext}`
      candidates.push(
        `${PRIMARY_CDN_BASE}/${dir}/${fbFilename}`,
        `${SECONDARY_CDN_BASE}/${dir}/${fbFilename}`,
        `${PRIMARY_EQUIP_CDN_BASE}/items/${fbFilename}`,
        `${SECONDARY_EQUIP_CDN_BASE}/items/${fbFilename}`,
      )
    }

    return Array.from(new Set(candidates))
  }

  // 5. Equip kind handling (module icons via Aceship/Arknight-Images)
  if (kind === 'equip') {
    const isSubclassType = cleanId.startsWith('sub_')
    const filename = `${cleanId}.${ext}`

    if (isSubclassType) {
      return [
        `${PRIMARY_EQUIP_CDN_BASE}/equip/type/${filename}`,
        `${SECONDARY_EQUIP_CDN_BASE}/equip/type/${filename}`,
      ]
    }

    // uniequip_001_... are initial class badges which use original.png / default.png in Aceship
    const isInitialBadge = cleanId.includes('_001_')

    if (isInitialBadge) {
      return [
        `${PRIMARY_EQUIP_CDN_BASE}/equip/icon/original.png`,
        `${SECONDARY_EQUIP_CDN_BASE}/equip/icon/original.png`,
        `${PRIMARY_FEXLI_CDN_BASE}/equip/default.png`,
        `${SECONDARY_FEXLI_CDN_BASE}/equip/default.png`,
        `${PRIMARY_EQUIP_CDN_BASE}/equip/icon/default.png`,
        `${SECONDARY_EQUIP_CDN_BASE}/equip/icon/default.png`,
      ]
    }

    return [
      `${PRIMARY_FEXLI_CDN_BASE}/equip/${filename}`,
      `${SECONDARY_FEXLI_CDN_BASE}/equip/${filename}`,
      `${PRIMARY_EQUIP_CDN_BASE}/equip/icon/${filename}`,
      `${SECONDARY_EQUIP_CDN_BASE}/equip/icon/${filename}`,
      `${PRIMARY_FEXLI_CDN_BASE}/equip/default.png`,
      `${SECONDARY_FEXLI_CDN_BASE}/equip/default.png`,
      `${PRIMARY_EQUIP_CDN_BASE}/equip/icon/default.png`,
      `${SECONDARY_EQUIP_CDN_BASE}/equip/icon/default.png`,
    ]
  }

  // 6. Generic fallback resolution
  const filename = options?.variant ? `${cleanId}_${options.variant}.${ext}` : `${cleanId}.${ext}`

  return [`${PRIMARY_CDN_BASE}/${dir}/${filename}`, `${SECONDARY_CDN_BASE}/${dir}/${filename}`]
}
