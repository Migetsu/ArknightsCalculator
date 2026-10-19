/**
 * Canonical list of valid recruitment tags present in Arknights recruitment tables.
 */
export const RECRUIT_TAG_NAMES = [
  'Top Operator',
  'Senior Operator',
  'Starter',
  'Melee',
  'Ranged',
  'Guard',
  'Sniper',
  'Defender',
  'Medic',
  'Supporter',
  'Caster',
  'Specialist',
  'Vanguard',
  'Healing',
  'Support',
  'DPS',
  'AoE',
  'Slow',
  'Survival',
  'Defense',
  'Debuff',
  'Shift',
  'Crowd-Control',
  'Nuker',
  'Summon',
  'Fast-Redeploy',
  'DP-Recovery',
  'Robot',
  'Elemental',
] as const

export type RecruitTagName = (typeof RECRUIT_TAG_NAMES)[number]

const RECRUIT_TAG_SET: ReadonlySet<string> = new Set<string>(RECRUIT_TAG_NAMES)

/**
 * Checks whether a given tag name is a playable recruit tag.
 * Returns false for non-recruit tags such as 'Soar'.
 */
export function isRecruitTag(tagName: string): tagName is RecruitTagName {
  return RECRUIT_TAG_SET.has(tagName)
}

export interface ParsedRecruitTagsResult {
  /**
   * Valid recruitment tags found in query.
   */
  validTags: string[]
  /**
   * Tags found in query that are unknown or non-recruit tags (e.g. Soar).
   */
  ignoredTags: string[]
  /**
   * Whether valid tags exceeded maxTags and had to be truncated.
   */
  isTruncated: boolean
  /**
   * Final array of applied tags capped to maxTags.
   */
  appliedTags: string[]
}

/**
 * Parses and validates raw tags query parameter from URL (e.g. "?tags=DPS,Support" or "?tags=DPS&tags=Support").
 */
export function parseRecruitTagsQuery(
  rawQuery: unknown,
  maxTags: number = 5,
): ParsedRecruitTagsResult {
  if (!rawQuery) {
    return { validTags: [], ignoredTags: [], isTruncated: false, appliedTags: [] }
  }

  const rawTokens: string[] = []
  if (Array.isArray(rawQuery)) {
    for (const item of rawQuery) {
      if (typeof item === 'string') {
        rawTokens.push(...item.split(',').map((s) => s.trim()))
      }
    }
  } else if (typeof rawQuery === 'string') {
    rawTokens.push(...rawQuery.split(',').map((s) => s.trim()))
  }

  // Deduplicate while preserving first appearance order
  const seen = new Set<string>()
  const uniqueTokens: string[] = []
  for (const token of rawTokens) {
    if (token && !seen.has(token)) {
      seen.add(token)
      uniqueTokens.push(token)
    }
  }

  const validTags: string[] = []
  const ignoredTags: string[] = []

  for (const token of uniqueTokens) {
    if (isRecruitTag(token)) {
      validTags.push(token)
    } else {
      ignoredTags.push(token)
    }
  }

  const isTruncated = validTags.length > maxTags
  const appliedTags = validTags.slice(0, maxTags)

  return {
    validTags,
    ignoredTags,
    isTruncated,
    appliedTags,
  }
}
