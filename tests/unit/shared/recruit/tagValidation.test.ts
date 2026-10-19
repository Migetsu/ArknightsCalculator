import { describe, expect, it } from 'vitest'
import {
  isRecruitTag,
  parseRecruitTagsQuery,
  RECRUIT_TAG_NAMES,
} from '../../../../shared/utils/recruit'

describe('Recruitment Tag Validation Utilities', () => {
  describe('isRecruitTag', () => {
    it('returns true for all canonical recruit tags', () => {
      expect(RECRUIT_TAG_NAMES).toHaveLength(29)
      for (const tag of RECRUIT_TAG_NAMES) {
        expect(isRecruitTag(tag)).toBe(true)
      }
    })

    it('returns false for Soar (CN-only operator tag not in recruitment)', () => {
      expect(isRecruitTag('Soar')).toBe(false)
    })

    it('returns false for arbitrary strings, empty strings, or case mismatches', () => {
      expect(isRecruitTag('')).toBe(false)
      expect(isRecruitTag('dps')).toBe(false) // strict case
      expect(isRecruitTag('NonExistentTag')).toBe(false)
      expect(isRecruitTag('Guard2')).toBe(false)
    })
  })

  describe('parseRecruitTagsQuery', () => {
    it('parses single tag query string', () => {
      const result = parseRecruitTagsQuery('DPS')
      expect(result.validTags).toEqual(['DPS'])
      expect(result.appliedTags).toEqual(['DPS'])
      expect(result.ignoredTags).toEqual([])
      expect(result.isTruncated).toBe(false)
    })

    it('parses comma-separated tag query string', () => {
      const result = parseRecruitTagsQuery('DPS,Support,Robot')
      expect(result.validTags).toEqual(['DPS', 'Support', 'Robot'])
      expect(result.appliedTags).toEqual(['DPS', 'Support', 'Robot'])
      expect(result.ignoredTags).toEqual([])
      expect(result.isTruncated).toBe(false)
    })

    it('parses array of query strings', () => {
      const result = parseRecruitTagsQuery(['DPS', 'Support', 'Fast-Redeploy'])
      expect(result.validTags).toEqual(['DPS', 'Support', 'Fast-Redeploy'])
      expect(result.appliedTags).toEqual(['DPS', 'Support', 'Fast-Redeploy'])
      expect(result.ignoredTags).toEqual([])
      expect(result.isTruncated).toBe(false)
    })

    it('filters out non-recruit tag Soar and unknown tags into ignoredTags', () => {
      const result = parseRecruitTagsQuery('DPS,Soar,UnknownTag,Robot')
      expect(result.validTags).toEqual(['DPS', 'Robot'])
      expect(result.appliedTags).toEqual(['DPS', 'Robot'])
      expect(result.ignoredTags).toEqual(['Soar', 'UnknownTag'])
      expect(result.isTruncated).toBe(false)
    })

    it('deduplicates tags preserving order', () => {
      const result = parseRecruitTagsQuery('DPS,Support,DPS,Support,Robot')
      expect(result.validTags).toEqual(['DPS', 'Support', 'Robot'])
      expect(result.appliedTags).toEqual(['DPS', 'Support', 'Robot'])
      expect(result.ignoredTags).toEqual([])
    })

    it('truncates tags exceeding maxTags (5) and sets isTruncated flag', () => {
      const result = parseRecruitTagsQuery('DPS,Support,Robot,Defender,Guard,Sniper,Vanguard', 5)
      expect(result.validTags).toHaveLength(7)
      expect(result.isTruncated).toBe(true)
      expect(result.appliedTags).toEqual(['DPS', 'Support', 'Robot', 'Defender', 'Guard'])
    })

    it('handles null, undefined, empty, and whitespace strings gracefully', () => {
      expect(parseRecruitTagsQuery(null).appliedTags).toEqual([])
      expect(parseRecruitTagsQuery(undefined).appliedTags).toEqual([])
      expect(parseRecruitTagsQuery('').appliedTags).toEqual([])
      expect(parseRecruitTagsQuery('   ').appliedTags).toEqual([])
      expect(parseRecruitTagsQuery(',,,').appliedTags).toEqual([])
    })
  })
})
