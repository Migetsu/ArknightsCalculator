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
        comment: 'Manual override',
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
    },
    glossary: {
      术师: 'Caster',
      狙击: 'Sniper',
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

  it('layer 3: falls back to wiki translations when official is missing', () => {
    const tracker = createI18nTracker()
    const result = resolveLayeredI18nString(
      {
        key: 'char_1043_leizi2.name',
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
