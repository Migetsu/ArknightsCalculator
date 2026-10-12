import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import {
  RAW_TABLE_SCHEMAS,
  RawCharacterTableSchema,
  RawItemTableSchema,
  RawSkillTableSchema,
  RawStageTableSchema,
} from '../../../scripts/data/schemas'
import { DATA_SOURCES_CONFIG, getRawTableUrls } from '../../../scripts/data/sources.config'

const FIXTURES_DIR = path.resolve(process.cwd(), 'tests/fixtures/raw')

function loadFixture(filename: string): unknown {
  const filePath = path.join(FIXTURES_DIR, filename)
  const raw = fs.readFileSync(filePath, 'utf-8')
  return JSON.parse(raw)
}

describe('Raw Game Data Zod Schemas', () => {
  const registeredTables = Object.keys(RAW_TABLE_SCHEMAS)

  it('registers all 9 core raw tables in the schema map', () => {
    expect(registeredTables).toEqual([
      'character_table.json',
      'skill_table.json',
      'item_table.json',
      'uniequip_table.json',
      'building_data.json',
      'gacha_table.json',
      'stage_table.json',
      'handbook_info_table.json',
      'char_patch_table.json',
    ])
  })

  describe.each(registeredTables)('Table fixture: %s', (tableName) => {
    it(`successfully validates ${tableName} fixture`, () => {
      const fixtureData = loadFixture(tableName)
      const schema = RAW_TABLE_SCHEMAS[tableName]
      expect(schema).toBeDefined()

      const result = schema!.safeParse(fixtureData)
      expect(result.success).toBe(true)
    })
  })

  describe('Validation failures for malformed payloads', () => {
    it('rejects character_table with missing name', () => {
      const invalid = {
        char_invalid: {
          rarity: 'TIER_5',
          profession: 'PIONEER',
          phases: [],
          skills: [],
          allSkillLvlup: [],
        },
      }
      const result = RawCharacterTableSchema.safeParse(invalid)
      expect(result.success).toBe(false)
    })

    it('rejects item_table with malformed items map', () => {
      const invalid = {
        items: {
          item_invalid: {
            itemId: 'item_invalid',
            name: 'Invalid Item',
            rarity: { complex: 'not a number or string' },
          },
        },
      }
      const result = RawItemTableSchema.safeParse(invalid)
      expect(result.success).toBe(false)
    })

    it('rejects skill_table when levels is not an array', () => {
      const invalid = {
        skill_invalid: {
          skillId: 'skill_invalid',
          levels: 'not-an-array',
        },
      }
      const result = RawSkillTableSchema.safeParse(invalid)
      expect(result.success).toBe(false)
    })

    it('rejects stage_table when stage lacks required code', () => {
      const invalid = {
        stages: {
          stage_invalid: {
            stageId: 'stage_invalid',
            // missing code
            apCost: 6,
          },
        },
      }
      const result = RawStageTableSchema.safeParse(invalid)
      expect(result.success).toBe(false)
    })
  })

  describe('sources.config helper functions', () => {
    it('constructs correct raw and fallback mirror URLs', () => {
      const cnConfig = DATA_SOURCES_CONFIG.sources.cn
      const urls = getRawTableUrls(cnConfig, 'character_table.json')

      expect(urls.primaryUrl).toContain('raw.githubusercontent.com')
      expect(urls.primaryUrl).toContain('Kengxxiao/ArknightsGameData')
      expect(urls.primaryUrl).toContain(cnConfig.commit)
      expect(urls.primaryUrl).toContain('zh_CN/gamedata/excel/character_table.json')

      expect(urls.fallbackUrl).toContain('cdn.jsdelivr.net/gh')
      expect(urls.fallbackUrl).toContain('Kengxxiao/ArknightsGameData')
      expect(urls.fallbackUrl).toContain(cnConfig.commit)
      expect(urls.fallbackUrl).toContain('zh_CN/gamedata/excel/character_table.json')
    })
  })
})
