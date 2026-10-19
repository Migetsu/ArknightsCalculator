import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {
  BatchItemSchema,
  listBatchFiles,
  readBatchItems,
  toUntranslatedItem,
} from '../../../scripts/data/lib/mt-batch'

let tempDir: string

const VALID_ITEM = {
  id: 'skill_desc_1',
  type: 'skill_desc',
  charId: 'char_002_amiya',
  charNameZh: '阿米娅',
  zh: '攻击力<@ba.vup>提高</>',
  tags: ['@ba.vup'],
  placeholders: [],
  keys: ['skchr_amiya_1.lvl.7.desc'],
  relevantGlossary: { 攻击力: 'ATK' },
}

beforeAll(async () => {
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mt-batch-'))
})

afterAll(async () => {
  await fs.rm(tempDir, { recursive: true, force: true })
})

async function writeFile(name: string, content: string): Promise<string> {
  const file = path.join(tempDir, name)
  await fs.writeFile(file, content, 'utf-8')
  return file
}

describe('mt-batch', () => {
  describe('BatchItemSchema', () => {
    it('accepts a well-formed exported item', () => {
      expect(BatchItemSchema.safeParse(VALID_ITEM).success).toBe(true)
    })

    it('rejects an unknown string type', () => {
      expect(BatchItemSchema.safeParse({ ...VALID_ITEM, type: 'unknown_type' }).success).toBe(false)
    })

    it('accepts skin and banner types', () => {
      expect(BatchItemSchema.safeParse({ ...VALID_ITEM, type: 'skin_name' }).success).toBe(true)
      expect(BatchItemSchema.safeParse({ ...VALID_ITEM, type: 'banner_name' }).success).toBe(true)
    })

    it('rejects a glossary whose values are not strings', () => {
      expect(BatchItemSchema.safeParse({ ...VALID_ITEM, relevantGlossary: { a: 1 } }).success).toBe(
        false,
      )
    })
  })

  describe('listBatchFiles', () => {
    it('returns only batch_NNN.jsonl files, sorted, and tolerates a missing directory', async () => {
      await writeFile('batch_010.jsonl', '')
      await writeFile('batch_002.jsonl', '')
      await writeFile('notes.txt', '')
      await writeFile('batch_x.jsonl', '')

      const files = await listBatchFiles(tempDir)

      expect(files.map((file) => path.basename(file))).toEqual([
        'batch_002.jsonl',
        'batch_010.jsonl',
      ])
      expect(await listBatchFiles(path.join(tempDir, 'does-not-exist'))).toEqual([])
    })
  })

  describe('readBatchItems', () => {
    it('parses and validates every line', async () => {
      const file = await writeFile(
        'batch_001.jsonl',
        `${JSON.stringify(VALID_ITEM)}\n${JSON.stringify({ ...VALID_ITEM, id: 'b' })}\n`,
      )

      const items = await readBatchItems([file])

      expect(items).toHaveLength(2)
      expect(items[1]?.id).toBe('b')
    })

    it('skips blank lines', async () => {
      const file = await writeFile('batch_002.jsonl', `${JSON.stringify(VALID_ITEM)}\n\n   \n`)

      expect(await readBatchItems([file])).toHaveLength(1)
    })

    it('fails loudly on malformed JSON, naming the line', async () => {
      const file = await writeFile('batch_003.jsonl', `${JSON.stringify(VALID_ITEM)}\n{not json\n`)

      await expect(readBatchItems([file])).rejects.toThrow(/batch_003\.jsonl:2 is not valid JSON/)
    })

    it('fails loudly on an unexpected shape', async () => {
      const file = await writeFile('batch_004.jsonl', `${JSON.stringify({ id: 'x' })}\n`)

      await expect(readBatchItems([file])).rejects.toThrow(/unexpected shape/)
    })
  })

  describe('toUntranslatedItem', () => {
    it('maps a batch item onto the collector shape', () => {
      const parsed = BatchItemSchema.parse(VALID_ITEM)

      expect(toUntranslatedItem(parsed)).toEqual(VALID_ITEM)
    })
  })
})
