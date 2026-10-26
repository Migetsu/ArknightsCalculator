import { describe, it, expect } from 'vitest'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { ManualOverrideEntrySchema } from '../../../scripts/data/i18n-layers'

describe('Manual Overrides Schema & Integrity', () => {
  const overridesDir = path.resolve(process.cwd(), 'data/i18n/overrides')
  const fixturesPath = path.resolve(process.cwd(), 'tests/fixtures/i18n/overrides.json')
  const reportPath = path.resolve(process.cwd(), 'data/i18n/report.json')

  it('validates test fixture entries against ManualOverrideEntrySchema', async () => {
    const raw = await fs.readFile(fixturesPath, 'utf-8')
    const json = JSON.parse(raw) as Record<string, unknown>

    for (const [key, value] of Object.entries(json)) {
      const parsed = ManualOverrideEntrySchema.parse(value)
      expect(parsed.text.length, `Empty text in fixture ${key}`).toBeGreaterThan(0)
      expect(parsed.source.startsWith('http'), `Invalid URL source in fixture ${key}`).toBe(true)
    }

    // Unconfirmed / non-URL source must fail validation
    const invalidEntry = {
      text: 'Unconfirmed Entry',
      author: 'Tester',
      note: 'Should fail',
      source: 'подтверждено владельцем',
    }
    const result = ManualOverrideEntrySchema.safeParse(invalidEntry)
    expect(result.success).toBe(false)
  })

  it('validates all production manual override files in data/i18n/overrides/', async () => {
    const files = await fs.readdir(overridesDir)
    const jsonFiles = files.filter((f) => f.endsWith('.json'))

    for (const file of jsonFiles) {
      const filePath = path.join(overridesDir, file)
      const content = await fs.readFile(filePath, 'utf-8')
      const json = JSON.parse(content) as Record<string, unknown>

      for (const [_key, value] of Object.entries(json)) {
        const parsed = ManualOverrideEntrySchema.parse(value)
        expect(parsed.text.trim().length).toBeGreaterThan(0)
        expect(parsed.source.startsWith('http')).toBe(true)
      }
    }

    // Verify report.json parity: manual source count must equal operator/module override entries in data/i18n/overrides
    const opModuleOverrides = jsonFiles
      .filter((f) => f !== 'banners.json')
    let opModuleCount = 0
    for (const f of opModuleOverrides) {
      const content = await fs.readFile(path.join(overridesDir, f), 'utf-8')
      opModuleCount += Object.keys(JSON.parse(content) as Record<string, unknown>).length
    }

    const rawReport = await fs.readFile(reportPath, 'utf-8')
    const report = JSON.parse(rawReport) as { sources?: { manual?: number } }
    expect(report.sources?.manual ?? 0).toBe(opModuleCount)
  })

  it('verifies Fiammetta module A is mapped in machine translation layer', async () => {
    const machineModPath = path.resolve(process.cwd(), 'data/i18n/machine/modules.json')
    const content = await fs.readFile(machineModPath, 'utf-8')
    const json = JSON.parse(content) as Record<string, { text?: string; source?: string }>

    expect(json['uniequip_004_phenxi.name']).toBeDefined()
    expect(json['uniequip_004_phenxi.name']?.text).toBe("Fiammetta's Specialized Badge")
    expect(json['uniequip_004_phenxi.name']?.source).toBe('machine')
  })
})
