import { describe, expect, it } from 'vitest'
import {
  collectUntranslatedFromItems,
  type RawGameItem,
} from '../../../scripts/data/translate-missing'

describe('Translate Missing: Items Collection (pure in-memory)', () => {
  it('collects pending item names and deduplicates identical Chinese names', () => {
    const rawItems: RawGameItem[] = [
      {
        id: 'LMTGS_COIN_7301',
        name: {
          en: '寻访数据契约',
          zh: '寻访数据契约',
          source: 'zh',
        },
      },
      {
        id: 'LMTGS_COIN_7601',
        name: {
          en: '寻访数据契约',
          zh: '寻访数据契约',
          source: 'zh',
        },
      },
      {
        id: '31114',
        name: {
          en: '聚能动力单元',
          zh: '聚能动力单元',
          source: 'zh',
        },
      },
      {
        id: '30012',
        name: {
          en: 'Orirock Cube',
          zh: '固源岩',
          source: 'official', // Already translated in official EN
        },
      },
    ]

    const items = collectUntranslatedFromItems(rawItems, {
      glossary: {
        items: { 寻访数据契约: 'Headhunting Data Contract' },
        operators: {},
        skills: {},
        talents: {},
        terms: {},
      },
    })

    expect(items).toHaveLength(2)

    // Deduplicated contract item with 2 keys
    const contractItem = items.find((i) => i.zh === '寻访数据契约')
    expect(contractItem).toBeDefined()
    expect(contractItem?.type).toBe('item_name')
    expect(contractItem?.keys).toEqual(['item.LMTGS_COIN_7301.name', 'item.LMTGS_COIN_7601.name'])
    expect(contractItem?.relevantGlossary).toEqual({
      寻访数据契约: 'Headhunting Data Contract',
    })

    // Single item
    const unitItem = items.find((i) => i.zh === '聚能动力单元')
    expect(unitItem).toBeDefined()
    expect(unitItem?.keys).toEqual(['item.31114.name'])
  })

  it('skips items already present in existingKeys', () => {
    const rawItems: RawGameItem[] = [
      {
        id: '31114',
        name: {
          en: '聚能动力单元',
          zh: '聚能动力单元',
          source: 'zh',
        },
      },
    ]

    const existingKeys = new Set(['item.31114.name'])
    const items = collectUntranslatedFromItems(rawItems, { existingKeys })
    expect(items).toHaveLength(0)
  })

  it('ignores items without CJK characters', () => {
    const rawItems: RawGameItem[] = [
      {
        id: 'mod_token_1',
        name: {
          en: 'MOD-X',
          zh: 'MOD-X',
          source: 'zh',
        },
      },
    ]

    const items = collectUntranslatedFromItems(rawItems)
    expect(items).toHaveLength(0)
  })
})
