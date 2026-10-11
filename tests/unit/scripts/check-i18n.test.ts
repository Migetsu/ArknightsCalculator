import { describe, it, expect } from 'vitest'
import { flattenKeys, compareLocaleRecords } from '../../../scripts/check-i18n'
import enLocale from '../../../i18n/locales/en.json'
import ruLocale from '../../../i18n/locales/ru.json'

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

  describe('project locale files parity', () => {
    it('ensures en.json and ru.json have 100% identical key structures', () => {
      const result = compareLocaleRecords(
        enLocale as Record<string, unknown>,
        ruLocale as Record<string, unknown>,
      )
      expect(result.missingInTarget).toEqual([])
      expect(result.extraInTarget).toEqual([])
    })
  })
})
