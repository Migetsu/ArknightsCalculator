import { describe, it, expect } from 'vitest'
import { DATA_SOURCES_CONFIG, getRawTableUrls } from '../../../scripts/data/sources.config'

describe('scripts/data/sources.config', () => {
  it('exports the same upstream repository for both EN and CN sources', () => {
    const { en, cn } = DATA_SOURCES_CONFIG.sources
    expect(en.repo).toBe('SanityGoneAK/arknights-gamedata')
    expect(cn.repo).toBe('SanityGoneAK/arknights-gamedata')
    expect(cn.repo).toBe(en.repo)
  })

  it('uses canonical locales "en" and "cn" matching SanityGoneAK folder structure', () => {
    const { en, cn } = DATA_SOURCES_CONFIG.sources
    expect(en.locale).toBe('en')
    expect(cn.locale).toBe('cn')
  })

  it('points both EN and CN sources to branch main with consistent commit hashes', () => {
    const { en, cn } = DATA_SOURCES_CONFIG.sources
    expect(en.branch).toBe('main')
    expect(cn.branch).toBe('main')
    expect(cn.commit).toBe('b5ff1ff3c389d18d8c0fcfa30735bd90f1d1ac74')
    expect(en.commit).toBe('b5ff1ff3c389d18d8c0fcfa30735bd90f1d1ac74')
  })

  it('includes all 13 required gamedata tables for both sources', () => {
    const requiredTables = [
      'character_table.json',
      'skill_table.json',
      'item_table.json',
      'uniequip_table.json',
      'battle_equip_table.json',
      'building_data.json',
      'gacha_table.json',
      'stage_table.json',
      'handbook_info_table.json',
      'char_patch_table.json',
      'gamedata_const.json',
      'skin_table.json',
      'range_table.json',
    ]

    for (const table of requiredTables) {
      expect(DATA_SOURCES_CONFIG.sources.en.tables).toContain(table)
      expect(DATA_SOURCES_CONFIG.sources.cn.tables).toContain(table)
    }
  })

  it('generates correct GitHub Raw and jsDelivr fallback URLs for CN tables', () => {
    const cnConfig = DATA_SOURCES_CONFIG.sources.cn
    const { primaryUrl, fallbackUrl } = getRawTableUrls(cnConfig, 'character_table.json')

    expect(primaryUrl).toBe(
      `https://raw.githubusercontent.com/SanityGoneAK/arknights-gamedata/${cnConfig.commit}/cn/gamedata/excel/character_table.json`,
    )
    expect(fallbackUrl).toBe(
      `https://cdn.jsdelivr.net/gh/SanityGoneAK/arknights-gamedata@${cnConfig.commit}/cn/gamedata/excel/character_table.json`,
    )
  })
})
