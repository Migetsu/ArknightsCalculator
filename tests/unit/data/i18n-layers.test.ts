import { describe, it, expect } from 'vitest'
import {
  resolveLayeredI18nString,
  createI18nTracker,
  type I18nLayersContext,
} from '../../../scripts/data/i18n-layers'

describe('i18n-layers resolution', () => {
  const mockContext: I18nLayersContext = {
    overrides: {
      'uniequip_004_phenxi.name': {
        text: "Fiammetta's Specialized Badge",
        author: 'Arknights Community / Danil',
        note: 'Official Global module A title',
        source: 'https://arknights.wiki.gg/wiki/Fiammetta',
      },
    },
    wiki: {
      char_1043_leizi2: {
        name: 'Leizi the Thunderbringer',
        skills: {
          skchr_leizi2_1: 'Nobility Enduring',
        },
        talents: ['Clarity of Judgment'],
        modules: {
          uniequip_002_leizi2: 'Within a Thought',
        },
      },
      char_4218_aigis: {
        name: 'Aegis',
        skills: {
          skchr_aigis_1: 'Heavy Iron Shield',
        },
      },
    },
    categorizedGlossary: {
      operators: {
        鞭刃: 'Whislash',
      },
      skills: {
        鞭刃: 'Whip Sword',
        点燃: 'Ignition',
      },
      classes: {
        术师: 'Caster',
        狙击: 'Sniper',
      },
    },
    flatGlossary: {
      术师: 'Caster',
      狙击: 'Sniper',
    },
    glossary: {
      术师: 'Caster',
      狙击: 'Sniper',
    },
    globalAvailability: {
      char_1043_leizi2: true,
      char_4218_aigis: false,
    },
  }

  it('layer 1: prioritizes manual overrides over official and wiki', () => {
    const tracker = createI18nTracker()
    const result = resolveLayeredI18nString(
      {
        key: 'uniequip_004_phenxi.name',
        officialEn: 'Wrong Name',
        zhText: '菲亚梅塔特限证章',
        wikiEn: 'Wiki Name',
      },
      mockContext,
      tracker,
    )

    expect(result.source).toBe('manual')
    expect(result.en).toBe("Fiammetta's Specialized Badge")
    expect(result.zh).toBe('菲亚梅塔特限证章')
    expect(result.isMachineTranslation).toBe(false)
    expect(tracker.sources.manual).toBe(1)
  })

  it('layer 2: uses official translation when available and not overridden', () => {
    const tracker = createI18nTracker()
    const result = resolveLayeredI18nString(
      {
        key: 'char_172_svrash.name',
        officialEn: 'SilverAsh',
        zhText: '银灰',
      },
      mockContext,
      tracker,
    )

    expect(result.source).toBe('official')
    expect(result.en).toBe('SilverAsh')
    expect(result.isMachineTranslation).toBe(false)
    expect(tracker.sources.official).toBe(1)
  })

  it('layer 2 with stale flag: marks stale if CN text changed', () => {
    const tracker = createI18nTracker()
    const result = resolveLayeredI18nString(
      {
        key: 'some_skill.desc',
        officialEn: 'Old English Text',
        zhText: 'New Chinese Text',
        isStale: true,
      },
      mockContext,
      tracker,
    )

    expect(result.source).toBe('official')
    expect(result.stale).toBe(true)
    expect(tracker.staleCount).toBe(1)
  })

  it('layer 3: distinguishes released Global operators as wiki source', () => {
    const tracker = createI18nTracker()
    const result = resolveLayeredI18nString(
      {
        key: 'char_1043_leizi2.name',
        charId: 'char_1043_leizi2',
        officialEn: null,
        zhText: '司霆惊蛰',
        wikiEn: mockContext.wiki.char_1043_leizi2?.name,
      },
      mockContext,
      tracker,
    )

    expect(result.source).toBe('wiki')
    expect(result.en).toBe('Leizi the Thunderbringer')
    expect(result.isMachineTranslation).toBe(false)
    expect(tracker.sources.wiki).toBe(1)
    expect(tracker.sources.community).toBe(0)
  })

  it('layer 3: distinguishes CN-only pre-release operators as community source', () => {
    const tracker = createI18nTracker()
    const result = resolveLayeredI18nString(
      {
        key: 'char_4218_aigis.name',
        charId: 'char_4218_aigis',
        officialEn: null,
        zhText: '埃癸斯',
        wikiEn: mockContext.wiki.char_4218_aigis?.name,
      },
      mockContext,
      tracker,
    )

    expect(result.source).toBe('community')
    expect(result.en).toBe('Aegis')
    expect(result.isMachineTranslation).toBe(false)
    expect(tracker.sources.community).toBe(1)
    expect(tracker.sources.wiki).toBe(0)
  })

  it('layer 4: resolves contextually via categorized glossary (category, zh)', () => {
    const tracker = createI18nTracker()
    // Test operator category
    const opResult = resolveLayeredI18nString(
      {
        zhText: '鞭刃',
        category: 'operators',
      },
      mockContext,
      tracker,
    )
    expect(opResult.source).toBe('machine')
    expect(opResult.en).toBe('Whislash')

    // Test skill category
    const skillResult = resolveLayeredI18nString(
      {
        zhText: '鞭刃',
        category: 'skills',
      },
      mockContext,
      tracker,
    )
    expect(skillResult.source).toBe('machine')
    expect(skillResult.en).toBe('Whip Sword')
  })

  it('layer 4: resolves direct machine translation by key', () => {
    const tracker = createI18nTracker()
    const ctx: I18nLayersContext = {
      ...mockContext,
      overrides: {},
      machine: {
        'uniequip_004_phenxi.name': "Fiammetta's Specialized Badge",
      },
    }
    const result = resolveLayeredI18nString(
      {
        key: 'uniequip_004_phenxi.name',
        officialEn: null,
        zhText: '菲亚梅塔特限证章',
      },
      ctx,
      tracker,
    )

    expect(result.source).toBe('machine')
    expect(result.en).toBe("Fiammetta's Specialized Badge")
    expect(result.isMachineTranslation).toBe(true)
    expect(tracker.sources.machine).toBe(1)
  })

  it('layer 5: falls back to zh original when no translation exists', () => {
    const tracker = createI18nTracker()
    const result = resolveLayeredI18nString(
      {
        key: 'unknown_item.name',
        officialEn: null,
        zhText: '神秘物品',
      },
      mockContext,
      tracker,
    )

    expect(result.source).toBe('zh')
    expect(result.en).toBe('神秘物品')
    expect(result.zh).toBe('神秘物品')
    expect(result.isMachineTranslation).toBe(true)
    expect(tracker.sources.zh).toBe(1)
  })
})
