import { describe, it, expect } from 'vitest'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { StagesDictionarySchema } from '../../../shared/schemas/stage'

describe('Stages Data Integrity & Cross-matching', () => {
  const stagesPath = path.resolve(process.cwd(), 'data/stages.json')

  it('validates data/stages.json against StagesDictionarySchema', async () => {
    const raw = await fs.readFile(stagesPath, 'utf-8')
    const json = JSON.parse(raw) as Record<string, unknown>

    const parsed = StagesDictionarySchema.parse(json)
    const stageIds = Object.keys(parsed)

    expect(stageIds.length).toBe(1620)

    let matched = 0
    let unmatched = 0

    for (const [id, stage] of Object.entries(parsed)) {
      expect(stage.stageId).toBe(id)
      expect(stage.code.length).toBeGreaterThan(0)
      expect(stage.servers.length).toBeGreaterThan(0)

      if (stage.matchedGameData) {
        matched++
        expect(stage.name.zh.length).toBeGreaterThan(0)
        expect(['official', 'zh']).toContain(stage.name.source)
      } else {
        unmatched++
        expect(stage.matchedGameData).toBe(false)
      }
    }

    expect(matched).toBe(1590)
    expect(unmatched).toBe(30)
  })

  it('correctly maps canonical main story stage 1-7', async () => {
    const raw = await fs.readFile(stagesPath, 'utf-8')
    const json = JSON.parse(raw) as Record<string, { code: string; name: { en: string; zh: string } }>

    const stage17 = json['main_01-07']
    expect(stage17).toBeDefined()
    expect(stage17?.code).toBe('1-7')
    expect(stage17?.name.zh).toBe('暴君')
    expect(stage17?.name.en).toBe('The Tyrant')
  })
})
