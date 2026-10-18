import { describe, it, expect } from 'vitest'
import {
  flattenKeys,
  compareLocaleRecords,
  validateMessageSyntax,
} from '../../../scripts/check-i18n'
import enLocale from '../../../i18n/locales/en.json'

describe('check-i18n', () => {
  describe('flattenKeys', () => {
    it('flattens simple shallow key-value pairs', () => {
      const input = {
        title: 'Title',
        count: 42,
      }
      expect(flattenKeys(input)).toEqual(['count', 'title'])
    })

    it('flattens nested object structures with dot notation', () => {
      const input = {
        common: {
          app: {
            title: 'Hello',
            version: '1.0.0',
          },
        },
        footer: 'Copyright',
      }
      expect(flattenKeys(input)).toEqual(['common.app.title', 'common.app.version', 'footer'])
    })
  })

  describe('compareLocaleRecords', () => {
    it('returns empty lists when keys match identically', () => {
      const base = {
        title: 'Title',
        nested: { key: 'value' },
      }
      const target = {
        title: 'Заголовок',
        nested: { key: 'значение' },
      }

      const result = compareLocaleRecords(base, target)
      expect(result.missingInTarget).toEqual([])
      expect(result.extraInTarget).toEqual([])
    })

    it('detects keys that are missing in target locale', () => {
      const base = {
        title: 'Title',
        nav: { home: 'Home', about: 'About' },
      }
      const target = {
        title: 'Заголовок',
        nav: { home: 'Главная' },
      }

      const result = compareLocaleRecords(base, target)
      expect(result.missingInTarget).toEqual(['nav.about'])
      expect(result.extraInTarget).toEqual([])
    })

    it('detects extra keys in target locale', () => {
      const base = {
        title: 'Title',
      }
      const target = {
        title: 'Заголовок',
        extra: 'Лишнее',
        nested: { extraKey: 'Тоже лишнее' },
      }

      const result = compareLocaleRecords(base, target)
      expect(result.missingInTarget).toEqual([])
      expect(result.extraInTarget).toEqual(['extra', 'nested.extraKey'])
    })

    it('detects both missing and extra keys simultaneously', () => {
      const base = {
        onlyInBase: 'Base',
        shared: 'Shared',
      }
      const target = {
        onlyInTarget: 'Target',
        shared: 'Общее',
      }

      const result = compareLocaleRecords(base, target)
      expect(result.missingInTarget).toEqual(['onlyInBase'])
      expect(result.extraInTarget).toEqual(['onlyInTarget'])
    })
  })

  describe('validateMessageSyntax', () => {
    it('passes for standard strings and valid interpolations', () => {
      const input = {
        simple: 'Standard text message',
        interpolated: 'You have {count} rolls remaining.',
        nested: {
          inner: 'Inner message',
        },
      }
      const errors = validateMessageSyntax(input, 'test.json')
      expect(errors).toHaveLength(0)
    })

    it('catches invalid linked message syntax when raw @ is unescaped', () => {
      const input = {
        email: {
          placeholder: 'doctor@example.com',
        },
      }
      const errors = validateMessageSyntax(input, 'test.json')
      expect(errors.length).toBeGreaterThan(0)
      expect(errors[0]?.key).toBe('email.placeholder')
      expect(errors[0]?.message).toMatch(/Invalid linked format/i)
    })

    it('passes when special characters like @ are properly escaped as literals', () => {
      const input = {
        email: {
          escaped: "doctor{'@'}example.com",
        },
      }
      const errors = validateMessageSyntax(input, 'test.json')
      expect(errors).toHaveLength(0)
    })
  })

  describe('project locale files syntax integrity', () => {
    it('ensures en.json contains non-empty keys', () => {
      const keys = flattenKeys(enLocale as Record<string, unknown>)
      expect(keys.length).toBeGreaterThan(100)
    })

    it('ensures all en.json messages compile cleanly without syntax errors', () => {
      const errors = validateMessageSyntax(enLocale as Record<string, unknown>, 'en.json')
      expect(errors).toEqual([])
    })
  })
})
