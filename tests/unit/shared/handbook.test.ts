import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  parseTaggedSection,
  isHandbookStub,
  isDuplicateStory,
} from '../../../shared/utils/handbook'
import { OperatorHandbookSchema, type OperatorHandbook } from '../../../shared/schemas/handbook'
import amiyaHandbookRaw from '../../../data/handbook/char_002_amiya.json'
import makotoHandbookRaw from '../../../data/handbook/char_4217_makoto.json'
import lancetHandbookRaw from '../../../data/handbook/char_285_medic2.json'

const amiyaHandbook = amiyaHandbookRaw as unknown as OperatorHandbook
const makotoHandbook = makotoHandbookRaw as unknown as OperatorHandbook
const lancetHandbook = lancetHandbookRaw as unknown as OperatorHandbook

const HANDBOOK_DIR = path.resolve(process.cwd(), 'data/handbook')
const LEGACY_MONOLITH_FILE = path.resolve(process.cwd(), 'data/handbook.json')

describe('Operator Handbook Utilities & Split Dataset', () => {
  describe('parseTaggedSection', () => {
    it('parses standard inline tag-value pairs in English bracket format', () => {
      const raw = `[Code Name] Amiya
[Gender] Female
[Combat Experience] 3 years`

      const result = parseTaggedSection(raw)
      expect(result).toEqual([
        { tag: 'Code Name', value: 'Amiya' },
        { tag: 'Gender', value: 'Female' },
        { tag: 'Combat Experience', value: '3 years' },
      ])
    })

    it('parses standard inline tag-value pairs in Chinese lenticular bracket format', () => {
      const raw = `【代号】 阿米娅
【性别】 女
【战斗经验】 三年`

      const result = parseTaggedSection(raw)
      expect(result).toEqual([
        { tag: '代号', value: '阿米娅' },
        { tag: '性别', value: '女' },
        { tag: '战斗经验', value: '三年' },
      ])
    })

    it('handles edge case where tag line is empty and value is on subsequent line(s)', () => {
      const raw = `[Height] 142cm
[Infection Status]
Originium crystals distributed across surface of body,
confirmed Infected by medical examination.
[Date of Birth] Dec. 23`

      const result = parseTaggedSection(raw)
      expect(result).toHaveLength(3)
      expect(result[0]).toEqual({ tag: 'Height', value: '142cm' })
      expect(result[1]?.tag).toBe('Infection Status')
      expect(result[1]?.value).toBe(
        'Originium crystals distributed across surface of body,\nconfirmed Infected by medical examination.',
      )
      expect(result[2]).toEqual({ tag: 'Date of Birth', value: 'Dec. 23' })
    })

    it('returns empty array on empty input or whitespace', () => {
      expect(parseTaggedSection('')).toEqual([])
      expect(parseTaggedSection('   \n  \n  ')).toEqual([])
    })
  })

  describe('isHandbookStub', () => {
    it('detects question-mark and whitespace stubs', () => {
      expect(isHandbookStub('？？？', ' ？？？？？？\n')).toBe(true)
      expect(isHandbookStub('???', '')).toBe(true)
      expect(isHandbookStub('？？？', '   ')).toBe(true)
      expect(isHandbookStub('? ? ?', '???')).toBe(true)
    })

    it('retains genuine stories with legitimate titles and prose', () => {
      expect(isHandbookStub('Profile', 'Amiya is the public leader of Rhodes Island.')).toBe(false)
      expect(isHandbookStub('Clinical Analysis', 'Test results show normal levels.')).toBe(false)
    })
  })

  describe('isDuplicateStory', () => {
    it('identifies exact duplicates by title and text', () => {
      const seen = new Set<string>()
      expect(isDuplicateStory('Profile', 'Text content A', seen)).toBe(false)
      expect(isDuplicateStory('Profile', 'Text content A', seen)).toBe(true)
    })

    it('permits stories with same title but different content', () => {
      const seen = new Set<string>()
      expect(isDuplicateStory('Basic Info', 'Height 142cm', seen)).toBe(false)
      expect(isDuplicateStory('Basic Info', 'Height 150cm', seen)).toBe(false)
    })

    it('permits stories with different titles', () => {
      const seen = new Set<string>()
      expect(isDuplicateStory('Profile 1', 'Content', seen)).toBe(false)
      expect(isDuplicateStory('Profile 2', 'Content', seen)).toBe(false)
    })
  })

  describe('data/handbook/ per-operator files validation', () => {
    it('confirms monolithic data/handbook.json is deleted', () => {
      expect(fs.existsSync(LEGACY_MONOLITH_FILE)).toBe(false)
    })

    it('contains exactly 432 individual operator files in data/handbook/', () => {
      const files = fs.readdirSync(HANDBOOK_DIR).filter((f) => f.endsWith('.json'))
      expect(files).toHaveLength(432)
      expect(files.length).toBeGreaterThanOrEqual(415)
    })

    it('validates every file conforms to OperatorHandbookSchema', () => {
      const files = fs.readdirSync(HANDBOOK_DIR).filter((f) => f.endsWith('.json'))
      for (const file of files) {
        const raw = fs.readFileSync(path.join(HANDBOOK_DIR, file), 'utf-8')
        const parsed = JSON.parse(raw) as unknown
        const validated = OperatorHandbookSchema.safeParse(parsed)
        expect(validated.success).toBe(true)
      }
    })

    it('validates char_002_amiya structured profile, physical exam, and PATCH stories are identical to pre-split', () => {
      expect(amiyaHandbook).toBeDefined()
      expect(amiyaHandbook.charId).toBe('char_002_amiya')

      // Structured profile fields verification
      expect(amiyaHandbook.profile.codeName?.en).toBe('Amiya')
      expect(amiyaHandbook.profile.codeName?.zh).toBe('阿米娅')
      expect(amiyaHandbook.profile.gender?.en).toBe('Female')
      expect(amiyaHandbook.profile.gender?.zh).toBe('女')
      expect(amiyaHandbook.profile.combatExperience?.en).toBe('3 years')
      expect(amiyaHandbook.profile.combatExperience?.zh).toBe('三年')
      expect(amiyaHandbook.profile.placeOfBirth?.en).toBe('Rim Billiton')
      expect(amiyaHandbook.profile.dateOfBirth?.en).toBe('Dec. 23')
      expect(amiyaHandbook.profile.race?.en).toBe('Cautus/Chimera')
      expect(amiyaHandbook.profile.height?.en).toBe('142cm')
      expect(amiyaHandbook.profile.infectionStatus?.en).toContain('Originium crystals')

      // Structured physical exam fields verification
      expect(amiyaHandbook.physicalExam.physicalStrength?.en).toBe('Normal')
      expect(amiyaHandbook.physicalExam.mobility?.en).toBe('Standard')
      expect(amiyaHandbook.physicalExam.physicalResilience?.en).toBe('Normal')
      expect(amiyaHandbook.physicalExam.tacticalAcumen?.en).toBe('Excellent')
      expect(amiyaHandbook.physicalExam.combatSkill?.en).toBe('Standard')
      expect(amiyaHandbook.physicalExam.originiumArtsAssimilation?.en).toBe('■■')

      // Stories count and PATCH forms verification
      expect(amiyaHandbook.stories).toHaveLength(6)

      const patch1 = amiyaHandbook.stories.find((s) => s.patchCharId === 'char_1001_amiya2')
      expect(patch1).toBeDefined()
      expect(patch1?.unlockType).toBe('PATCH')
      expect(patch1?.storyTitle.en).toBe('Class Conversion Record 1')

      const patch2 = amiyaHandbook.stories.find((s) => s.patchCharId === 'char_1037_amiya3')
      expect(patch2).toBeDefined()
      expect(patch2?.unlockType).toBe('PATCH')
      expect(patch2?.storyTitle.en).toBe('Class Conversion Record 2')
    })

    it('validates CN-only operator (char_4217_makoto) with pending translation and no CJK in .en', () => {
      expect(makotoHandbook).toBeDefined()
      expect(makotoHandbook.charId).toBe('char_4217_makoto')

      expect(makotoHandbook.profile.codeName?.source).toBe('pending')
      expect(makotoHandbook.profile.codeName?.en).toBe('[Pending Translation]')
      expect(makotoHandbook.profile.codeName?.zh).toBe('结城理')

      const cjkRegex = /[\u4e00-\u9fa5]/
      for (const field of makotoHandbook.profile.allFields) {
        expect(field.title.en).not.toMatch(cjkRegex)
        expect(field.value.en).not.toMatch(cjkRegex)
      }
      for (const field of makotoHandbook.physicalExam.allFields) {
        expect(field.title.en).not.toMatch(cjkRegex)
        expect(field.value.en).not.toMatch(cjkRegex)
      }
      for (const story of makotoHandbook.stories) {
        expect(story.storyTitle.en).not.toMatch(cjkRegex)
        expect(story.text.en).not.toMatch(cjkRegex)
      }
    })

    it('validates non-standard operator specs (char_285_medic2 / Lancet-2)', () => {
      expect(lancetHandbook).toBeDefined()
      expect(lancetHandbook.charId).toBe('char_285_medic2')

      // Robot profile specs
      expect(lancetHandbook.profile.model?.en).toBe('Lancet-2')
      expect(lancetHandbook.profile.manufacturer?.en).toBe('Raythean')

      // Robot performance evaluation specs
      expect(lancetHandbook.physicalExam.topSpeed?.en).toBe('15km/h')
      expect(lancetHandbook.physicalExam.climb?.en).toBe('Normal')
      expect(lancetHandbook.physicalExam.brake?.en).toBe('Normal')
      expect(lancetHandbook.physicalExam.passability?.en).toBe('[Pending Translation]')
      expect(lancetHandbook.physicalExam.endurance?.en).toBe('Excellent')
    })
  })
})
