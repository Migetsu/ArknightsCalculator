import { promises as fs } from 'node:fs'
import path from 'node:path'
import { describe, it, expect } from 'vitest'

const CJK_REGEX = /[\u4e00-\u9fa5]/

describe('Operator dataset English localization integrity', () => {
  it('ensures no Chinese characters remain in any .en field across data/operators/*.json', async () => {
    const opsDir = path.resolve(process.cwd(), 'data/operators')
    const files = (await fs.readdir(opsDir)).filter((f) => f.endsWith('.json'))

    expect(files.length).toBeGreaterThan(400)

    const violations: Array<{ file: string; keyPath: string; text: string }> = []

    for (const file of files) {
      const content = await fs.readFile(path.join(opsDir, file), 'utf-8')
      const json = JSON.parse(content)

      function scan(obj: unknown, currentPath: string) {
        if (!obj || typeof obj !== 'object') return

        if (
          'en' in (obj as Record<string, unknown>) &&
          typeof (obj as { en: unknown }).en === 'string'
        ) {
          const enText = (obj as { en: string }).en
          if (CJK_REGEX.test(enText)) {
            violations.push({
              file,
              keyPath: currentPath + '.en',
              text: enText,
            })
          }
        }

        for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
          scan(v, currentPath ? `${currentPath}.${k}` : k)
        }
      }

      scan(json, '')
    }

    expect(violations).toEqual([])
  })

  it('ensures no Chinese characters in operators-index.json .en names', async () => {
    const indexPath = path.resolve(process.cwd(), 'data/operators-index.json')
    const raw = await fs.readFile(indexPath, 'utf-8')
    const index = JSON.parse(raw) as Array<{ id: string; name?: { en?: string } }>

    const invalidOps = index.filter((op) => op.name?.en && CJK_REGEX.test(op.name.en))
    expect(invalidOps).toEqual([])
  })
})
