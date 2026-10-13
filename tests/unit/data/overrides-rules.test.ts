import { describe, it, expect } from 'vitest'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { ManualOverrideEntrySchema } from '../../../scripts/data/i18n-layers'

describe('Manual Overrides Schema & Integrity', () => {
  const overridesDir = path.resolve(process.cwd(), 'data/i18n/overrides')

  it('validates all manual overrides files against ManualOverrideEntrySchema', async () => {
    const files = await fs.readdir(overridesDir)
    const jsonFiles = files.filter((f) => f.endsWith('.json'))

    expect(jsonFiles.length).toBeGreaterThan(0)

    for (const file of jsonFiles) {
      const filePath = path.join(overridesDir, file)
      const content = await fs.readFile(filePath, 'utf-8')
      const json = JSON.parse(content) as Record<string, unknown>

      for (const [key, value] of Object.entries(json)) {
        const parseResult = ManualOverrideEntrySchema.safeParse(value)
        expect(
          parseResult.success,
          `File "${file}" key "${key}" failed validation: ${
            parseResult.success ? '' : JSON.stringify(parseResult.error.format())
          }`,
        ).toBe(true)

        if (parseResult.success) {
          const entry = parseResult.data
          expect(entry.text.trim().length).toBeGreaterThan(0)
          expect(entry.author.trim().length).toBeGreaterThan(0)
          expect(entry.note.trim().length).toBeGreaterThan(0)
          const isValidSource =
            entry.source === 'подтверждено владельцем' ||
            entry.source.startsWith('http://') ||
            entry.source.startsWith('https://')
          expect(isValidSource, `Invalid source in ${file}:${key}`).toBe(true)
        }
      }
    }
  })

  it('contains verified override for Fiammetta module A', async () => {
    const modFilePath = path.join(overridesDir, 'modules.json')
    const content = await fs.readFile(modFilePath, 'utf-8')
    const json = JSON.parse(content) as Record<string, unknown>

    expect(json['uniequip_004_phenxi.name']).toBeDefined()
    const entry = ManualOverrideEntrySchema.parse(json['uniequip_004_phenxi.name'])
    expect(entry.text).toBe("Fiammetta's Specialized Badge")
    expect(entry.source).toBe('https://arknights.wiki.gg/wiki/Fiammetta')
  })
})
