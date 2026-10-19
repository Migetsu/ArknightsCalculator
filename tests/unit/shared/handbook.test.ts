import { describe, expect, it } from 'vitest'
import {
  parseTaggedSection,
  isHandbookStub,
  isDuplicateStory,
} from '../../../shared/utils/handbook'
import { HandbookDatasetSchema, type HandbookDataset } from '../../../shared/schemas/handbook'
import handbookData from '../../../data/handbook.json'

const dataset = handbookData as unknown as HandbookDataset

describe('Operator Handbook Utilities & Dataset', () => {
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

  describe('handbook.json dataset validation', () => {
    it('passes schema validation cleanly', () => {
      const parsed = HandbookDatasetSchema.safeParse(handbookData)
      expect(parsed.success).toBe(true)
    })

    it('contains at least 415 global operators and all 432 target operators', () => {
      const keys = Object.keys(handbookData)
      expect(keys.length).toBe(432)
      expect(keys.length).toBeGreaterThanOrEqual(415)
    })

    it('validates char_002_amiya structured profile, physical exam, and PATCH stories', () => {
      const amiya = dataset['char_002_amiya']
      expect(amiya).toBeDefined()
      if (!amiya) return

      // Structured profile
      expect(amiya.profile.codeName?.en).toBe('Amiya')
      expect(amiya.profile.codeName?.zh).toBe('阿米娅')
      expect(amiya.profile.gender?.en).toBe('Female')
      expect(amiya.profile.combatExperience?.en).toBe('3 years')
      expect(amiya.profile.placeOfBirth?.en).toBe('Rim Billiton')
      expect(amiya.profile.dateOfBirth?.en).toBe('Dec. 23')
      expect(amiya.profile.race?.en).toBe('Cautus/Chimera')
      expect(amiya.profile.height?.en).toBe('142cm')
      expect(amiya.profile.infectionStatus?.en).toContain('Originium crystals')

      // Structured physical exam
      expect(amiya.physicalExam.physicalStrength?.en).toBe('Normal')
      expect(amiya.physicalExam.mobility?.en).toBe('Standard')
      expect(amiya.physicalExam.physicalResilience?.en).toBe('Normal')
      expect(amiya.physicalExam.tacticalAcumen?.en).toBe('Excellent')
      expect(amiya.physicalExam.combatSkill?.en).toBe('Standard')
      expect(amiya.physicalExam.originiumArtsAssimilation?.en).toBe('■■')

      // Stories and PATCH forms
      expect(amiya.stories).toHaveLength(6)

      const patch1 = amiya.stories.find((s) => s.patchCharId === 'char_1001_amiya2')
      expect(patch1).toBeDefined()
      expect(patch1?.unlockType).toBe('PATCH')
      expect(patch1?.storyTitle.en).toBe('Class Conversion Record 1')

      const patch2 = amiya.stories.find((s) => s.patchCharId === 'char_1037_amiya3')
      expect(patch2).toBeDefined()
      expect(patch2?.unlockType).toBe('PATCH')
      expect(patch2?.storyTitle.en).toBe('Class Conversion Record 2')
    })

    it('validates CN-only operator (char_4217_makoto) with pending translation and no CJK in .en', () => {
      const makoto = dataset['char_4217_makoto']
      expect(makoto).toBeDefined()
      if (!makoto) return

      expect(makoto.profile.codeName?.source).toBe('pending')
      expect(makoto.profile.codeName?.en).toBe('[Pending Translation]')
      expect(makoto.profile.codeName?.zh).toBe('结城理')

      const cjkRegex = /[\u4e00-\u9fa5]/
      for (const field of makoto.profile.allFields) {
        expect(field.title.en).not.toMatch(cjkRegex)
        expect(field.value.en).not.toMatch(cjkRegex)
      }
      for (const field of makoto.physicalExam.allFields) {
        expect(field.title.en).not.toMatch(cjkRegex)
        expect(field.value.en).not.toMatch(cjkRegex)
      }
      for (const story of makoto.stories) {
        expect(story.storyTitle.en).not.toMatch(cjkRegex)
        expect(story.text.en).not.toMatch(cjkRegex)
      }
    })

    it('validates non-standard operator specs (char_285_medic2 / Lancet-2)', () => {
      const lancet = dataset['char_285_medic2']
      expect(lancet).toBeDefined()
      if (!lancet) return

      // Robot profile specs
      expect(lancet.profile.model?.en).toBeDefined()
      expect(lancet.profile.manufacturer?.en).toBeDefined()

      // Robot performance evaluation specs
      expect(lancet.physicalExam.topSpeed?.en).toBeDefined()
      expect(lancet.physicalExam.climb?.en).toBeDefined()
      expect(lancet.physicalExam.brake?.en).toBeDefined()
      expect(lancet.physicalExam.passability?.en).toBeDefined()
      expect(lancet.physicalExam.endurance?.en).toBeDefined()
    })
  })
})
