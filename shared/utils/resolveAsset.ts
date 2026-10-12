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
 * Resolves an ordered list of candidate URLs for a given game asset.
 * Pure function: strictly no network I/O, no runtime hotlinking to prts.wiki
 * or raw.githubusercontent.com.
 *
 * @param kind - The category of the asset (avatar, portrait, item, skill, equip).
 * @param id - The unique game asset identifier (e.g. 'char_102_texas', '30012', 'skchr_texas_2').
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
  const filename = options?.variant ? `${cleanId}_${options.variant}.${ext}` : `${cleanId}.${ext}`

  // 1. Primary candidate: jsDelivr with pinned commit
  const primaryUrl = `${PRIMARY_CDN_BASE}/${dir}/${filename}`

  // 2. Secondary mirror candidate: Statically CDN with pinned commit
  const secondaryUrl = `${SECONDARY_CDN_BASE}/${dir}/${filename}`

  return [primaryUrl, secondaryUrl]
}
