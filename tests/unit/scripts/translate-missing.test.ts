import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { describe, it, expect } from 'vitest'
import { hasCjkIdeograph, readTranslationBatchFiles } from '../../../scripts/data/translate-missing'

describe('hasCjkIdeograph', () => {
  it('accepts real Chinese text', () => {
    expect(hasCjkIdeograph('新月的苏醒')).toBe(true)
    expect(hasCjkIdeograph('ATK 提高')).toBe(true)
  })

  it('rejects operator codenames and module codes that need no translation', () => {
    expect(hasCjkIdeograph('12F')).toBe(false)
    expect(hasCjkIdeograph('Mon3tr')).toBe(false)
    expect(hasCjkIdeograph('DWDB-221E')).toBe(false)
    expect(hasCjkIdeograph('W')).toBe(false)
  })

  it('rejects masked values made of fullwidth punctuation only', () => {
    expect(hasCjkIdeograph('？？？')).toBe(false)
  })

  it('rejects empty input', () => {
    expect(hasCjkIdeograph('')).toBe(false)
  })
})

describe('readTranslationBatchFiles', () => {
  it('returns an empty list when the out directory does not exist', async () => {
    const base = await fs.mkdtemp(path.join(os.tmpdir(), 'translate-batches-'))
    try {
      await expect(readTranslationBatchFiles(path.join(base, 'out'))).resolves.toEqual([])
    } finally {
      await fs.rm(base, { recursive: true, force: true })
    }
  })

  it('returns only json/jsonl batch files', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'translate-batches-'))
    try {
      await fs.writeFile(path.join(dir, 'batch_001.jsonl'), '')
      await fs.writeFile(path.join(dir, 'batch_002.json'), '{}')
      await fs.writeFile(path.join(dir, 'notes.txt'), '')
      const files = await readTranslationBatchFiles(dir)
      expect(files.sort()).toEqual(['batch_001.jsonl', 'batch_002.json'])
    } finally {
      await fs.rm(dir, { recursive: true, force: true })
    }
  })
})
