import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import type { OperatorSummary } from '../../../shared/schemas/operator'
import {
  isValidLatinAppellation,
  VALID_APPELLATION_REGEX,
  resolveLayeredI18nString,
  createEmptyI18nLayersContext,
  createI18nTracker,
  type I18nLayersContext,
} from '../../../scripts/data/i18n-layers'

describe('EN Source Migration & Appellation Regression Tests', () => {
  const operatorsIndexPath = path.resolve(process.cwd(), 'data/operators-index.json')
  const operatorsIndex = JSON.parse(
    fs.readFileSync(operatorsIndexPath, 'utf-8'),
  ) as OperatorSummary[]
  const operatorMap = new Map(operatorsIndex.map((op) => [op.id, op]))

  it('char_4208_wintim has official EN "Snegurochka" instead of Cyrillic appellation', () => {
    const wintim = operatorMap.get('char_4208_wintim')
    expect(wintim).toBeDefined()
    expect(wintim!.name.en).toBe('Snegurochka')
    expect(wintim!.name.en).not.toBe('Снегурочка')
    expect(wintim!.name.source).toBe('official')
    expect(wintim!.name.isMachineTranslation).toBe(false)
  })

  it('char_4223_botany has official EN "Botani" instead of Cyrillic appellation', () => {
    const botany = operatorMap.get('char_4223_botany')
    expect(botany).toBeDefined()
    expect(botany!.name.en).toBe('Botani')
    expect(botany!.name.en).not.toBe('Ботани')
    expect(botany!.name.source).toBe('official')
    expect(botany!.name.isMachineTranslation).toBe(false)
  })

  it('char_4224_turdus has official EN "Ukusik" instead of Cyrillic appellation', () => {
    const turdus = operatorMap.get('char_4224_turdus')
    expect(turdus).toBeDefined()
    expect(turdus!.name.en).toBe('Ukusik')
    expect(turdus!.name.en).not.toBe('Укусик')
    expect(turdus!.name.source).toBe('official')
    expect(turdus!.name.isMachineTranslation).toBe(false)
  })

  it('char_4182_oblvns has official EN "Sakiko Togawa" (not "Togawa Sakiko" and not machine)', () => {
    const oblvns = operatorMap.get('char_4182_oblvns')
    expect(oblvns).toBeDefined()
    expect(oblvns!.name.en).toBe('Sakiko Togawa')
    expect(oblvns!.name.en).not.toBe('Togawa Sakiko')
    expect(oblvns!.name.source).toBe('official')
    expect(oblvns!.name.isMachineTranslation).toBe(false)
  })

  it('char_4226_veen has "Viy" (not Cyrillic appellation "Вий") and resolves via wiki layer for CN-only simulation', () => {
    const veen = operatorMap.get('char_4226_veen')
    expect(veen).toBeDefined()
    expect(veen!.name.en).toBe('Viy')
    expect(veen!.name.en).not.toMatch(/[\u0400-\u04FF]/)

    // Simulate CN-only scenario without official EN: must resolve from wiki layer, NOT Cyrillic appellation
    const mockContext: I18nLayersContext = {
      ...createEmptyI18nLayersContext(),
      wiki: {
        char_4226_veen: {
          name: 'Viy',
        },
      },
      globalAvailability: {
        char_4226_veen: false,
      },
    }
    const tracker = createI18nTracker()
    const resolved = resolveLayeredI18nString(
      {
        key: 'char_4226_veen.name',
        charId: 'char_4226_veen',
        officialEn: null, // simulating missing official EN
        zhText: '维伊',
        wikiEn: mockContext.wiki.char_4226_veen?.name,
        fallbackEn: 'Вий', // Cyrillic appellation
      },
      mockContext,
      tracker,
    )

    expect(resolved.en).toBe('Viy')
    expect(resolved.source).toBe('community')
    expect(resolved.isMachineTranslation).toBe(false)
    expect(resolved.en).not.toMatch(/[\u0400-\u04FF]/)
  })

  it('ensures NO operator in operators-index.json has Cyrillic characters in name.en', () => {
    const cyrillicRegex = /[\u0400-\u04FF]/
    const violations: { id: string; nameEn: string }[] = []

    for (const op of operatorsIndex) {
      if (cyrillicRegex.test(op.name.en)) {
        violations.push({ id: op.id, nameEn: op.name.en })
      }
    }

    expect(violations).toEqual([])
  })

  it('validates appellation regex strictly rejects Cyrillic and accepts Latin', () => {
    // Direct regex checks
    expect(VALID_APPELLATION_REGEX.test('Snegurochka')).toBe(true)
    expect(VALID_APPELLATION_REGEX.test('Снегурочка')).toBe(false)
    expect(VALID_APPELLATION_REGEX.test('Varkáris')).toBe(true)

    // Cyrillic appellations that must be rejected
    expect(isValidLatinAppellation('Снегурочка')).toBe(false)
    expect(isValidLatinAppellation('Ботани')).toBe(false)
    expect(isValidLatinAppellation('Укусик')).toBe(false)
    expect(isValidLatinAppellation('Вий')).toBe(false)
    expect(isValidLatinAppellation('Веточки')).toBe(false)
    expect(isValidLatinAppellation('Гум')).toBe(false)
    expect(isValidLatinAppellation('Зима')).toBe(false)
    expect(isValidLatinAppellation('Роса')).toBe(false)
    expect(isValidLatinAppellation('Позёмка')).toBe(false)

    // Invalid formats
    expect(isValidLatinAppellation('')).toBe(false)
    expect(isValidLatinAppellation('   ')).toBe(false)
    expect(isValidLatinAppellation(undefined)).toBe(false)
    expect(isValidLatinAppellation('12345')).toBe(false)

    // Valid Latin appellations
    expect(isValidLatinAppellation('Snegurochka')).toBe(true)
    expect(isValidLatinAppellation('Sakiko Togawa')).toBe(true)
    expect(isValidLatinAppellation('Togawa Sakiko')).toBe(true)
    expect(isValidLatinAppellation('Varkáris')).toBe(true)
    expect(isValidLatinAppellation('Nyamu Yūtenji')).toBe(true)
  })
})
