import type { Skin } from '../../shared/schemas/skin'
import { isValidOperatorDataId } from '../../shared/utils/operatorData'
import { groupSkinsByCharId } from '../../shared/utils/skin'

/**
 * The flat skins dataset is a build-time Nitro server asset. It is grouped by
 * operator on first use and retained for the lifetime of the server process,
 * so a request touches only the requested operator's outfits.
 */
let skinsByCharId: Map<string, Skin[]> | null = null

async function loadSkins(): Promise<Map<string, Skin[]>> {
  if (skinsByCharId) return skinsByCharId

  try {
    const raw = await useStorage('assets:skins').getItem('skins.json')
    if (!Array.isArray(raw)) return new Map()
    skinsByCharId = groupSkinsByCharId(raw as Skin[])
    return skinsByCharId
  } catch (_err) {
    // A missing asset must not break the operator page; it falls back to the
    // empty skins state and the error is visible in the request log.
    return new Map()
  }
}

export async function readOperatorSkins(charId: string): Promise<Skin[]> {
  if (!isValidOperatorDataId(charId)) return []
  const grouped = await loadSkins()
  return grouped.get(charId) ?? []
}
