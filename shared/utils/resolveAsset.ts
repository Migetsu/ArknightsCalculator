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
    const isLowRarity = LOW_RARITY_OPERATOR_IDS.has(cleanId)
    // Default to '2' (Elite 2) if operator has E2, otherwise '1' (E0/E1)
    const primaryVariant =
      options?.variant ??
      (PORTRAIT_DEFAULT_VARIANT_MAP[cleanId]
        ? PORTRAIT_DEFAULT_VARIANT_MAP[cleanId]!
        : isLowRarity
          ? '1'
          : '2')

    const fileSuffix = primaryVariant.endsWith('b') ? primaryVariant : `${primaryVariant}b`
    const primaryFilename = `${cleanId}_${fileSuffix}.${ext}`

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
      `${PRIMARY_CDN_BASE}/${dir}/${primaryFilename}`,
      `${SECONDARY_CDN_BASE}/${dir}/${primaryFilename}`,
    )

    // 1c. If requested E2 art, fallback to E1 art (_1b.png)
    if (primaryVariant === '2') {
      const e1Filename = `${cleanId}_1b.${ext}`
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
    if (options?.variant) {
      const filename = `${cleanId}_${options.variant}.${ext}`
      return [`${PRIMARY_CDN_BASE}/${dir}/${filename}`, `${SECONDARY_CDN_BASE}/${dir}/${filename}`]
    }

    // Default portrait naming in ArknightsGameResource uses _1 (or _2 for class changes)
    const primaryVariant = PORTRAIT_DEFAULT_VARIANT_MAP[cleanId] ?? '1'
    const altVariant = primaryVariant === '1' ? '2' : undefined

    const primaryFilename = `${cleanId}_${primaryVariant}.${ext}`
    const candidates = [
      `${PRIMARY_CDN_BASE}/${dir}/${primaryFilename}`,
      `${SECONDARY_CDN_BASE}/${dir}/${primaryFilename}`,
    ]

    if (altVariant) {
      const altFilename = `${cleanId}_${altVariant}.${ext}`
      candidates.push(
        `${PRIMARY_CDN_BASE}/${dir}/${altFilename}`,
        `${SECONDARY_CDN_BASE}/${dir}/${altFilename}`,
      )
    }

    return candidates
  }

  // 2. Avatar kind handling with Amiya class change mapping
  if (kind === 'avatar' && !options?.variant) {
    const overrideName = AVATAR_DEFAULT_OVERRIDE_MAP[cleanId]
    if (overrideName) {
      return [
        `${PRIMARY_CDN_BASE}/${dir}/${overrideName}.${ext}`,
        `${SECONDARY_CDN_BASE}/${dir}/${overrideName}.${ext}`,
        `${PRIMARY_CDN_BASE}/${dir}/${cleanId}.${ext}`,
        `${SECONDARY_CDN_BASE}/${dir}/${cleanId}.${ext}`,
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

  // 4. Item kind handling (prefers iconId if provided, then cleanId)
  if (kind === 'item') {
    const primaryTarget = options?.iconId?.trim() || cleanId
    const primaryFilename = `${primaryTarget}.${ext}`
    const candidates = [
      `${PRIMARY_CDN_BASE}/${dir}/${primaryFilename}`,
      `${SECONDARY_CDN_BASE}/${dir}/${primaryFilename}`,
    ]

    if (options?.iconId && options.iconId.trim() !== cleanId) {
      const fallbackFilename = `${cleanId}.${ext}`
      candidates.push(
        `${PRIMARY_CDN_BASE}/${dir}/${fallbackFilename}`,
        `${SECONDARY_CDN_BASE}/${dir}/${fallbackFilename}`,
      )
    }

    return candidates
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
