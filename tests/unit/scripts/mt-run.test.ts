import { describe, it, expect, vi } from 'vitest'
import { checkTranslation, runTranslation } from '../../../scripts/data/lib/mt-run'
import type { GeminiClient, GenerateJsonParams } from '../../../scripts/data/lib/gemini-client'
import type { UntranslatedItem } from '../../../scripts/data/translate-missing'

function item(overrides: Partial<UntranslatedItem> = {}): UntranslatedItem {
  return {
    id: 'skill_desc_1',
    type: 'skill_desc',
    charId: 'char_002_amiya',
    charNameZh: '阿米娅',
    zh: '攻击力<@ba.vup>提高</>，持续{time}秒',
    tags: ['@ba.vup'],
    placeholders: ['time'],
    keys: ['skchr_amiya_1.lvl.7.desc'],
    relevantGlossary: {},
    ...overrides,
  }
}

/** Fake client that replays canned responses and records every prompt sent. */
function fakeClient(responses: unknown[]): {
  client: GeminiClient
  calls: GenerateJsonParams[]
} {
  const calls: GenerateJsonParams[] = []
  let index = 0

  const client: GeminiClient = {
    model: 'fake-model',
    generateJson: vi.fn(async (params: GenerateJsonParams) => {
      calls.push(params)
      const response = responses[Math.min(index, responses.length - 1)]
      index += 1
      return response
    }),
  }

  return { client, calls }
}

describe('mt-run', () => {
  describe('checkTranslation', () => {
    it('accepts a faithful translation', () => {
      expect(checkTranslation('攻击力<@ba.vup>提高</>', 'ATK <@ba.vup>increased</>')).toEqual([])
    })

    it('rejects an empty translation', () => {
      expect(checkTranslation('攻击力', '')).toEqual([
        'the model returned no translation for this item',
      ])
    })

    it('rejects a translation identical to the source', () => {
      expect(checkTranslation('攻击力', '攻击力')).toContain(
        'the translation is identical to the Chinese source',
      )
    })

    it('rejects the pending placeholder', () => {
      expect(checkTranslation('攻击力', '[Pending Translation]')).toContain(
        'the model returned the pending placeholder',
      )
    })

    it('rejects leftover Chinese characters', () => {
      expect(checkTranslation('攻击力提高', 'ATK 提高')).toContain(
        'the translation still contains Chinese characters',
      )
    })

    it('rejects a dropped tag', () => {
      const issues = checkTranslation('攻击力<@ba.vup>提高</>', 'ATK increased')

      expect(issues.some((issue) => issue.startsWith('Open tags mismatch'))).toBe(true)
    })

    it('rejects a dropped placeholder', () => {
      const issues = checkTranslation('持续{time}秒', 'lasts seconds')

      expect(issues.some((issue) => issue.startsWith('Placeholders mismatch'))).toBe(true)
    })

    it('rejects a dropped newline', () => {
      const issues = checkTranslation('第一行\n第二行', 'first line second line')

      expect(issues.some((issue) => issue.startsWith('Translation is missing newlines'))).toBe(true)
    })
  })

  describe('runTranslation', () => {
    it('translates a clean batch without a repair request', async () => {
      const { client, calls } = fakeClient([
        [{ id: 'skill_desc_1', en: 'ATK <@ba.vup>increased</> for {time}s' }],
      ])

      const result = await runTranslation({ client, items: [item()], batchSize: 10 })

      expect(result.entries).toEqual([
        { item: item(), en: 'ATK <@ba.vup>increased</> for {time}s', repaired: false },
      ])
      expect(result.failures).toEqual([])
      expect(result.requests).toBe(1)
      expect(calls).toHaveLength(1)
    })

    it('repairs a broken translation and marks it repaired', async () => {
      const { client, calls } = fakeClient([
        [{ id: 'skill_desc_1', en: 'ATK increased' }],
        [{ id: 'skill_desc_1', en: 'ATK <@ba.vup>increased</> for {time}s' }],
      ])

      const result = await runTranslation({ client, items: [item()], batchSize: 10 })

      expect(result.entries[0]?.repaired).toBe(true)
      expect(result.failures).toEqual([])
      expect(result.requests).toBe(2)
      expect(calls).toHaveLength(2)
      // The corrective request must carry the previous attempt and the problem.
      expect(calls[1]?.userPrompt).toContain('previous')
      expect(calls[1]?.userPrompt).toContain('Open tags mismatch')
    })

    it('quarantines an item that fails both rounds', async () => {
      const { client } = fakeClient([
        [{ id: 'skill_desc_1', en: 'ATK increased' }],
        [{ id: 'skill_desc_1', en: 'still missing the tag' }],
      ])

      const result = await runTranslation({ client, items: [item()], batchSize: 10 })

      expect(result.entries).toEqual([])
      expect(result.failures).toHaveLength(1)
      expect(result.failures[0]?.item.id).toBe('skill_desc_1')
      expect(result.requests).toBe(2)
    })

    it('quarantines an id the model omitted from the response', async () => {
      const { client } = fakeClient([[{ id: 'something_else', en: 'nope' }]])

      const result = await runTranslation({
        client,
        items: [item()],
        batchSize: 10,
        repair: false,
      })

      expect(result.failures[0]?.issues).toEqual([
        'the model returned no translation for this item',
      ])
    })

    it('skips the repair request when repair is disabled', async () => {
      const { client, calls } = fakeClient([[{ id: 'skill_desc_1', en: 'ATK increased' }]])

      const result = await runTranslation({
        client,
        items: [item()],
        batchSize: 10,
        repair: false,
      })

      expect(result.failures).toHaveLength(1)
      expect(result.requests).toBe(1)
      expect(calls).toHaveLength(1)
    })

    it('skips ids that a previous run already translated', async () => {
      const { client, calls } = fakeClient([
        [{ id: 'b', en: 'ATK <@ba.vup>increased</> for {time}s' }],
      ])

      const result = await runTranslation({
        client,
        items: [item({ id: 'a' }), item({ id: 'b' })],
        batchSize: 10,
        alreadyTranslated: new Set(['a']),
      })

      expect(result.skipped).toBe(1)
      expect(result.entries.map((entry) => entry.item.id)).toEqual(['b'])
      expect(calls[0]?.userPrompt).not.toContain('"id":"a"')
    })

    it('splits items across batches and counts one request per batch', async () => {
      const { client, calls } = fakeClient([
        [
          { id: 'a', en: 'ATK <@ba.vup>increased</> for {time}s' },
          { id: 'b', en: 'ATK <@ba.vup>increased</> for {time}s' },
        ],
        [{ id: 'c', en: 'ATK <@ba.vup>increased</> for {time}s' }],
      ])

      const result = await runTranslation({
        client,
        items: [item({ id: 'a' }), item({ id: 'b' }), item({ id: 'c' })],
        batchSize: 2,
      })

      expect(result.batches).toBe(2)
      expect(result.requests).toBe(2)
      expect(calls).toHaveLength(2)
      expect(result.entries.map((entry) => entry.item.id)).toEqual(['a', 'b', 'c'])
      expect(result.failures).toEqual([])
    })

    it('reports progress per batch', async () => {
      const messages: string[] = []
      const { client } = fakeClient([
        [{ id: 'skill_desc_1', en: 'ATK <@ba.vup>increased</> for {time}s' }],
      ])

      await runTranslation({
        client,
        items: [item()],
        batchSize: 10,
        onProgress: (message) => messages.push(message),
      })

      expect(messages).toEqual(['batch 1/1 (1 items): 1 ok, 0 to repair'])
    })
  })
})
