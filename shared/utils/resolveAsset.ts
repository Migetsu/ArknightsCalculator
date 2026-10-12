/**
 * Asset kinds supported by Arknights game resource dump.
 */
export type AssetKind = 'avatar' | 'portrait' | 'item' | 'skill' | 'equip'

export interface ResolveAssetOptions {
  /**
   * Optional custom variant (e.g. skin id, elite 2 portrait suffix).
   */
  variant?: string
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
 * @param id - The unique game asset identifier (e.g. 'char_102_texas', 'char_002_amiya').
 * @param options - Formatting and variant options.
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

  // 3. Standard asset resolution (avatar, item, skill, equip)
  const filename = options?.variant ? `${cleanId}_${options.variant}.${ext}` : `${cleanId}.${ext}`

  return [`${PRIMARY_CDN_BASE}/${dir}/${filename}`, `${SECONDARY_CDN_BASE}/${dir}/${filename}`]
}
