/**
 * Asset kinds supported by Arknights game resource repositories.
 */
export type AssetKind = 'avatar' | 'portrait' | 'item' | 'skill' | 'equip'

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
}

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
 * Map of asset kinds to repository subdirectories.
 */
const KIND_DIR_MAP: Record<AssetKind, string> = {
  avatar: 'avatar',
  portrait: 'portrait',
  item: 'item',
  skill: 'skill',
  equip: 'equip',
}

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
 * @param kind - The category of the asset (avatar, portrait, item, skill, equip).
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

  // 1. Portrait kind handling
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
        `${PRIMARY_EQUIP_CDN_BASE}/equip/icon/default.png`,
        `${SECONDARY_EQUIP_CDN_BASE}/equip/icon/default.png`,
      ]
    }

    return [
      `${PRIMARY_EQUIP_CDN_BASE}/equip/icon/${filename}`,
      `${SECONDARY_EQUIP_CDN_BASE}/equip/icon/${filename}`,
      `${PRIMARY_EQUIP_CDN_BASE}/equip/icon/default.png`,
      `${SECONDARY_EQUIP_CDN_BASE}/equip/icon/default.png`,
    ]
  }

  // 6. Generic fallback resolution
  const filename = options?.variant ? `${cleanId}_${options.variant}.${ext}` : `${cleanId}.${ext}`

  return [`${PRIMARY_CDN_BASE}/${dir}/${filename}`, `${SECONDARY_CDN_BASE}/${dir}/${filename}`]
}
