import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  parseTaggedSection,
  isHandbookStub,
  isDuplicateStory,
  isPatchStory,
  getPatchFormLabel,
  getStorySortOrder,
  sortHandbookStories,
  splitHandbookStories,
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

    it('validates CN-only operator (char_4217_makoto) with machine translation and no CJK in .en', () => {
      expect(makotoHandbook).toBeDefined()
      expect(makotoHandbook.charId).toBe('char_4217_makoto')

      expect(makotoHandbook.profile.codeName?.source).toBe('machine')
      expect(makotoHandbook.profile.codeName?.en).toBe('Makoto Yuki')
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
      expect(lancetHandbook.physicalExam.passability?.en).toBe('Normal')
      expect(lancetHandbook.physicalExam.passability?.source).toBe('machine')
      expect(lancetHandbook.physicalExam.endurance?.en).toBe('Excellent')
    })
  })

  describe('Story Ordering and Classification Helpers', () => {
    it('correctly identifies PATCH stories by unlockType and patchCharId', () => {
      const patchStories = amiyaHandbook.stories.filter(isPatchStory)
      expect(patchStories).toHaveLength(2)
      expect(patchStories[0]?.patchCharId).toBe('char_1001_amiya2')
      expect(patchStories[1]?.patchCharId).toBe('char_1037_amiya3')

      const regularStories = amiyaHandbook.stories.filter((s) => !isPatchStory(s))
      expect(regularStories).toHaveLength(4)
    })

    it('resolves correct form labels for patchCharIds', () => {
      expect(getPatchFormLabel('char_1001_amiya2')).toBe('Guard')
      expect(getPatchFormLabel('char_1037_amiya3')).toBe('Medic')
      expect(getPatchFormLabel(null)).toBe('Alternate Form')
      expect(getPatchFormLabel('char_custom_form')).toBe('char_custom_form')
    })

    it('assigns canonical sort orders to handbook stories', () => {
      const dummyBasic = {
        storyTitle: { en: 'Basic Info', zh: '基础档案' },
        text: { en: 'A', zh: 'A' },
      }
      const dummyProfile = {
        storyTitle: { en: 'Profile', zh: '客观履历' },
        text: { en: 'B', zh: 'B' },
      }
      const dummyClinical = {
        storyTitle: { en: 'Clinical Analysis', zh: '临床诊断分析' },
        text: { en: 'C', zh: 'C' },
      }
      const dummyFile1 = {
        storyTitle: { en: 'Archive File 1', zh: '档案资料一' },
        text: { en: 'D', zh: 'D' },
      }
      const dummyFile4 = {
        storyTitle: { en: 'Archive File 4', zh: '档案资料四' },
        text: { en: 'E', zh: 'E' },
      }
      const dummyPromo = {
        storyTitle: { en: 'Promotion Record', zh: '晋升记录' },
        text: { en: 'F', zh: 'F' },
      }

      expect(getStorySortOrder(dummyBasic)).toBe(10)
      expect(getStorySortOrder(dummyProfile)).toBe(20)
      expect(getStorySortOrder(dummyClinical)).toBe(30)
      expect(getStorySortOrder(dummyFile1)).toBe(40)
      expect(getStorySortOrder(dummyFile4)).toBe(70)
      expect(getStorySortOrder(dummyPromo)).toBe(90)
    })

    it('sorts arbitrary unordered stories into canonical order', () => {
      const unordered = [
        { storyTitle: { en: 'Archive File 4', zh: '档案资料四' }, text: { en: 'E', zh: 'E' } },
        { storyTitle: { en: 'Basic Info', zh: '基础档案' }, text: { en: 'A', zh: 'A' } },
        { storyTitle: { en: 'Promotion Record', zh: '晋升记录' }, text: { en: 'F', zh: 'F' } },
        { storyTitle: { en: 'Profile', zh: '客观履历' }, text: { en: 'B', zh: 'B' } },
      ]

      const sorted = sortHandbookStories(unordered)
      expect(sorted.map((s) => s.storyTitle.en)).toEqual([
        'Basic Info',
        'Profile',
        'Archive File 4',
        'Promotion Record',
      ])
    })

    it('splits Amiya stories into 4 standard stories and 2 PATCH stories', () => {
      const { standardStories, patchStories } = splitHandbookStories(amiyaHandbook.stories)

      expect(standardStories).toHaveLength(4)
      expect(patchStories).toHaveLength(2)

      // In raw Amiya data, "Basic Info" is at index 3, but canonical order places it first
      expect(standardStories[0]?.storyTitle.en).toBe('Basic Info')
      expect(standardStories[1]?.storyTitle.en).toBe('Profile')
      expect(standardStories[2]?.storyTitle.en).toBe('Clinical Analysis')
      expect(standardStories[3]?.storyTitle.en).toBe('Clinical Analysis')

      // PATCH stories are ordered 1 then 2
      expect(patchStories[0]?.storyTitle.en).toBe('Class Conversion Record 1')
      expect(patchStories[1]?.storyTitle.en).toBe('Class Conversion Record 2')
    })
  })
})
