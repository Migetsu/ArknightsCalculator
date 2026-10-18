import { describe, it, expect } from 'vitest'
import {
  buildTranslationPrompt,
  chunkItems,
  compareBatchFreshness,
  estimatePromptTokens,
  MT_RESPONSE_SCHEMA,
  MT_SYSTEM_INSTRUCTION,
  toPromptItem,
} from '../../../scripts/data/lib/mt-prompt'
import type { UntranslatedItem } from '../../../scripts/data/translate-missing'

function item(overrides: Partial<UntranslatedItem> = {}): UntranslatedItem {
  return {
    id: 'skill_desc_1',
    type: 'skill_desc',
    charId: 'char_002_amiya',
    charNameZh: '阿米娅',
    zh: '攻击力<@ba.vup>提高</>',
    tags: ['@ba.vup'],
    placeholders: [],
    keys: ['skchr_amiya_1.lvl.7.desc'],
    relevantGlossary: {},
    ...overrides,
  }
}

describe('mt-prompt', () => {
  describe('toPromptItem', () => {
    it('drops the character field when it duplicates the source text', () => {
      const result = toPromptItem(
        item({ type: 'operator_name', charNameZh: '阿米娅', zh: '阿米娅' }),
      )

      expect(result.character).toBeUndefined()
      expect(result).toEqual({ id: 'skill_desc_1', type: 'operator_name', zh: '阿米娅' })
    })

    it('keeps the character field for context when it differs', () => {
      const result = toPromptItem(item())

      expect(result.character).toBe('阿米娅')
    })

    it('omits an empty glossary and keeps a populated one', () => {
      expect(toPromptItem(item()).glossary).toBeUndefined()

      const withGlossary = toPromptItem(item({ relevantGlossary: { 攻击力: 'ATK' } }))
      expect(withGlossary.glossary).toEqual({ 攻击力: 'ATK' })
    })
  })

  describe('buildTranslationPrompt', () => {
    it('produces a compact JSON payload and lists the item ids', () => {
      const prompt = buildTranslationPrompt([
        item({ id: 'a' }),
        item({ id: 'b', zh: '天赋', type: 'talent_name' }),
      ])

      expect(prompt.systemInstruction).toBe(MT_SYSTEM_INSTRUCTION)
      expect(prompt.responseSchema).toBe(MT_RESPONSE_SCHEMA)
      expect(prompt.itemIds).toEqual(['a', 'b'])
      expect(prompt.userPrompt).not.toContain('\n')
      expect(JSON.parse(prompt.userPrompt)).toHaveLength(2)
    })

    it('tells the model not to invent markup', () => {
      expect(MT_SYSTEM_INSTRUCTION).toMatch(
        /Never add a tag or placeholder that is not in the source/,
      )
      expect(MT_SYSTEM_INSTRUCTION).toMatch(/one \{"id","en"\} object per input item/)
    })
  })

  describe('chunkItems', () => {
    it('splits into fixed-size chunks with a short tail', () => {
      expect(chunkItems([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]])
    })

    it('returns no chunks for an empty list', () => {
      expect(chunkItems([], 10)).toEqual([])
    })

    it('rejects a non-positive size', () => {
      expect(() => chunkItems([1], 0)).toThrow(/positive integer/)
      expect(() => chunkItems([1], 1.5)).toThrow(/positive integer/)
    })
  })

  describe('compareBatchFreshness', () => {
    it('reports fresh when the sets match', () => {
      expect(compareBatchFreshness(['a', 'b'], ['b', 'a'])).toEqual({
        staleIds: [],
        missingIds: [],
        isFresh: true,
      })
    })

    it('reports ids that no longer need translating as stale', () => {
      const result = compareBatchFreshness(['a', 'b', 'c'], ['a', 'c'])

      expect(result.staleIds).toEqual(['b'])
      expect(result.missingIds).toEqual([])
      expect(result.isFresh).toBe(false)
    })

    it('reports ids absent from the cache as missing', () => {
      const result = compareBatchFreshness(['a'], ['a', 'z'])

      expect(result.missingIds).toEqual(['z'])
      expect(result.isFresh).toBe(false)
    })
  })

  describe('estimatePromptTokens', () => {
    it('matches the API countTokens measurement for a known batch', () => {
      // batch_001 of the 2026-10-18 export: 8349 CJK chars + 9646 other chars,
      // measured at 10088 prompt tokens by models/gemini-3.8-flash:countTokens.
      const cjk = '新'.repeat(8349)
      const rest = 'a'.repeat(9646)
      const estimate = estimatePromptTokens({
        systemInstruction: '',
        userPrompt: cjk + rest,
        responseSchema: MT_RESPONSE_SCHEMA,
        itemIds: [],
      })

      expect(estimate).toBeGreaterThan(10088 * 0.97)
      expect(estimate).toBeLessThan(10088 * 1.03)
    })
  })
})
