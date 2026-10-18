import { describe, expect, it } from 'vitest'
import {
  resolveAsset,
  ASSET_REPO_COMMIT,
  PRIMARY_CDN_BASE,
  SECONDARY_CDN_BASE,
  EQUIP_REPO_COMMIT,
  PRIMARY_EQUIP_CDN_BASE,
  SECONDARY_EQUIP_CDN_BASE,
  FEXLI_REPO_COMMIT,
  PRIMARY_FEXLI_CDN_BASE,
  SECONDARY_FEXLI_CDN_BASE,
  OPTIMIZED_ASSETS_COMMIT,
  ITEM_ICON_DEFAULT_MAP,
} from '../../../shared/utils/resolveAsset'

describe('resolveAsset utility', () => {
  it('pins the asset repository commits to verified commit SHAs', () => {
    expect(ASSET_REPO_COMMIT).toBe('9bf239661e37766fba585806fb9fa67e79bb679e')
    expect(EQUIP_REPO_COMMIT).toBe('0b28f9562fcadbd644c6225f8f8aefbb500b4d22')
    expect(FEXLI_REPO_COMMIT).toBe('d7bdc0146f99f6fa88ecdc1bbf79021c012c21c5')

    expect(PRIMARY_CDN_BASE).toContain(
      'cdn.jsdelivr.net/gh/yuanyan3060/ArknightsGameResource@9bf2396',
    )
    expect(SECONDARY_CDN_BASE).toContain(
      'cdn.statically.io/gh/yuanyan3060/ArknightsGameResource/9bf2396',
    )
    expect(PRIMARY_EQUIP_CDN_BASE).toContain('cdn.jsdelivr.net/gh/Aceship/Arknight-Images@0b28f95')
    expect(SECONDARY_EQUIP_CDN_BASE).toContain(
      'cdn.statically.io/gh/Aceship/Arknight-Images/0b28f95',
    )
    expect(PRIMARY_FEXLI_CDN_BASE).toContain('cdn.jsdelivr.net/gh/fexli/ArknightsResource@d7bdc01')
    expect(SECONDARY_FEXLI_CDN_BASE).toContain(
      'cdn.statically.io/gh/fexli/ArknightsResource/d7bdc01',
    )
  })

  it('returns empty array when id is missing or whitespace', () => {
    expect(resolveAsset('avatar', null)).toEqual([])
    expect(resolveAsset('avatar', undefined)).toEqual([])
    expect(resolveAsset('avatar', '')).toEqual([])
    expect(resolveAsset('avatar', '   ')).toEqual([])
  })

  describe('kind directory paths', () => {
    it('generates standard avatar candidates', () => {
      const candidates = resolveAsset('avatar', 'char_102_texas')
      expect(candidates).toEqual([
        `${PRIMARY_CDN_BASE}/avatar/char_102_texas.png`,
        `${SECONDARY_CDN_BASE}/avatar/char_102_texas.png`,
      ])
    })

    it('generates item candidates preferring iconId when provided', () => {
      const withIcon = resolveAsset('item', '30012', { iconId: 'MTL_SL_G2' })
      expect(withIcon[0]).toBe(`${PRIMARY_CDN_BASE}/item/MTL_SL_G2.png`)
      expect(withIcon[1]).toBe(`${SECONDARY_CDN_BASE}/item/MTL_SL_G2.png`)
      expect(withIcon[2]).toBe(`${PRIMARY_EQUIP_CDN_BASE}/items/MTL_SL_G2.png`)
      expect(withIcon).toContain(`${PRIMARY_CDN_BASE}/item/30012.png`)

      const raw = resolveAsset('item', 'mod_unlock_token')
      expect(raw[0]).toBe(`${PRIMARY_CDN_BASE}/item/mod_unlock_token.png`)
      expect(raw[1]).toBe(`${SECONDARY_CDN_BASE}/item/mod_unlock_token.png`)
      expect(raw[2]).toBe(`${PRIMARY_EQUIP_CDN_BASE}/items/mod_unlock_token.png`)
    })

    it('resolves currency 4001 LMD to GOLD.png with Aceship fallback chain', () => {
      expect(ITEM_ICON_DEFAULT_MAP['4001']).toBe('GOLD')
      expect(ITEM_ICON_DEFAULT_MAP['4002']).toBe('DIAMOND')
      expect(ITEM_ICON_DEFAULT_MAP['4003']).toBe('DIAMOND_SHD')

      const lmdCandidates = resolveAsset('item', '4001')
      expect(lmdCandidates[0]).toBe(`${PRIMARY_CDN_BASE}/item/GOLD.png`)
      expect(lmdCandidates[1]).toBe(`${SECONDARY_CDN_BASE}/item/GOLD.png`)
      expect(lmdCandidates[2]).toBe(`${PRIMARY_EQUIP_CDN_BASE}/items/GOLD.png`)
      expect(lmdCandidates[3]).toBe(`${SECONDARY_EQUIP_CDN_BASE}/items/GOLD.png`)
      expect(lmdCandidates).toContain(`${PRIMARY_CDN_BASE}/item/4001.png`)
    })

    it('resolves materials 30165 and 30115 to their icon assets via ITEM_ICON_DEFAULT_MAP', () => {
      expect(ITEM_ICON_DEFAULT_MAP['30165']).toBe('MTL_SL_DYT')
      expect(ITEM_ICON_DEFAULT_MAP['30115']).toBe('MTL_SL_PP')
      expect(ITEM_ICON_DEFAULT_MAP['31044']).toBe('MTL_SL_RS')

      const dytCandidates = resolveAsset('item', '30165')
      expect(dytCandidates[0]).toBe(`${PRIMARY_CDN_BASE}/item/MTL_SL_DYT.png`)

      const ppCandidates = resolveAsset('item', '30115')
      expect(ppCandidates[0]).toBe(`${PRIMARY_CDN_BASE}/item/MTL_SL_PP.png`)
    })

    it('generates skill candidates with skill_icon_ prefix and iconId fallback', () => {
      const candidates = resolveAsset('skill', 'skchr_texas_2')
      expect(candidates[0]).toBe(`${PRIMARY_CDN_BASE}/skill/skill_icon_skchr_texas_2.png`)
      expect(candidates[1]).toBe(`${SECONDARY_CDN_BASE}/skill/skill_icon_skchr_texas_2.png`)
      expect(candidates[2]).toBe(`${PRIMARY_CDN_BASE}/skill/skchr_texas_2.png`)

      const withIcon = resolveAsset('skill', 'skchr_huang_1', { iconId: 'skcom_powerstrike[3]' })
      expect(withIcon[0]).toBe(`${PRIMARY_CDN_BASE}/skill/skill_icon_skcom_powerstrike[3].png`)
    })

    it('generates equip candidates for unique modules and initial badges', () => {
      const uniqueMod = resolveAsset('equip', 'uniequip_002_texas')
      expect(uniqueMod[0]).toBe(`${PRIMARY_FEXLI_CDN_BASE}/equip/uniequip_002_texas.png`)
      expect(uniqueMod[1]).toBe(`${SECONDARY_FEXLI_CDN_BASE}/equip/uniequip_002_texas.png`)
      expect(uniqueMod[2]).toBe(`${PRIMARY_EQUIP_CDN_BASE}/equip/icon/uniequip_002_texas.png`)
      expect(uniqueMod[3]).toBe(`${SECONDARY_EQUIP_CDN_BASE}/equip/icon/uniequip_002_texas.png`)

      const initialMod = resolveAsset('equip', 'uniequip_001_texas')
      expect(initialMod[0]).toBe(`${PRIMARY_EQUIP_CDN_BASE}/equip/icon/original.png`)

      const typeMod = resolveAsset('equip', 'sub_pioneer')
      expect(typeMod[0]).toBe(`${PRIMARY_EQUIP_CDN_BASE}/equip/type/sub_pioneer.png`)
    })

    it('generates portrait candidates with default _1 variant and _2 fallback', () => {
      const candidates = resolveAsset('portrait', 'char_102_texas')
      expect(candidates).toEqual([
        `${PRIMARY_CDN_BASE}/portrait/char_102_texas_1.png`,
        `${SECONDARY_CDN_BASE}/portrait/char_102_texas_1.png`,
        `${PRIMARY_CDN_BASE}/portrait/char_102_texas_2.png`,
        `${SECONDARY_CDN_BASE}/portrait/char_102_texas_2.png`,
      ])
    })
  })

  describe('Amiya class change asset mappings', () => {
    it('resolves standard avatar and portrait for Caster Amiya (char_002_amiya)', () => {
      const avatarCandidates = resolveAsset('avatar', 'char_002_amiya')
      expect(avatarCandidates[0]).toBe(`${PRIMARY_CDN_BASE}/avatar/char_002_amiya.png`)

      const portraitCandidates = resolveAsset('portrait', 'char_002_amiya')
      expect(portraitCandidates[0]).toBe(`${PRIMARY_CDN_BASE}/portrait/char_002_amiya_1.png`)
      expect(portraitCandidates[2]).toBe(`${PRIMARY_CDN_BASE}/portrait/char_002_amiya_2.png`)
    })

    it('resolves Guard Amiya (char_1001_amiya2) avatar and E2 portrait', () => {
      const avatarCandidates = resolveAsset('avatar', 'char_1001_amiya2')
      expect(avatarCandidates[0]).toBe(`${PRIMARY_CDN_BASE}/avatar/char_1001_amiya2.png`)

      const portraitCandidates = resolveAsset('portrait', 'char_1001_amiya2')
      expect(portraitCandidates[0]).toBe(`${PRIMARY_CDN_BASE}/portrait/char_1001_amiya2_2.png`)
    })

    it('resolves Medic Amiya (char_1037_amiya3) with char_1037_amiya3_2 avatar and portrait', () => {
      const avatarCandidates = resolveAsset('avatar', 'char_1037_amiya3')
      expect(avatarCandidates[0]).toBe(`${PRIMARY_CDN_BASE}/avatar/char_1037_amiya3_2.png`)
      expect(avatarCandidates[1]).toBe(`${SECONDARY_CDN_BASE}/avatar/char_1037_amiya3_2.png`)

      const portraitCandidates = resolveAsset('portrait', 'char_1037_amiya3')
      expect(portraitCandidates[0]).toBe(`${PRIMARY_CDN_BASE}/portrait/char_1037_amiya3_2.png`)
    })
  })

  describe('art kind handling and fallback chain', () => {
    it('resolves Elite 2 art by default for higher rarity operators with full fallback chain', () => {
      const candidates = resolveAsset('art', 'char_172_svrash')
      // 1. E2 art on primary and secondary CDN
      expect(candidates[0]).toBe(`${PRIMARY_CDN_BASE}/skin/char_172_svrash_2b.png`)
      expect(candidates[1]).toBe(`${SECONDARY_CDN_BASE}/skin/char_172_svrash_2b.png`)
      // 2. Fallback to E1 art
      expect(candidates[2]).toBe(`${PRIMARY_CDN_BASE}/skin/char_172_svrash_1b.png`)
      expect(candidates[3]).toBe(`${SECONDARY_CDN_BASE}/skin/char_172_svrash_1b.png`)
      // 3. Fallback to portrait
      expect(candidates).toContain(`${PRIMARY_CDN_BASE}/portrait/char_172_svrash_2.png`)
      // 4. Fallback to avatar
      expect(candidates).toContain(`${PRIMARY_CDN_BASE}/avatar/char_172_svrash.png`)
    })

    it('resolves Elite 1 art by default for 1-3 star operators', () => {
      const candidates = resolveAsset('art', 'char_285_medic2') // Lancet-2
      expect(candidates[0]).toBe(`${PRIMARY_CDN_BASE}/skin/char_285_medic2_1b.png`)
      expect(candidates[1]).toBe(`${SECONDARY_CDN_BASE}/skin/char_285_medic2_1b.png`)
      expect(candidates).toContain(`${PRIMARY_CDN_BASE}/portrait/char_285_medic2_1.png`)
      expect(candidates).toContain(`${PRIMARY_CDN_BASE}/avatar/char_285_medic2.png`)
    })

    it('prioritizes local webp thumbnail and optimized CDN when thumbnail: true is requested', () => {
      const candidates = resolveAsset('art', 'char_172_svrash', { thumbnail: true })
      expect(candidates[0]).toBe('/art/thumbs/char_172_svrash.webp')
      expect(candidates[1]).toContain(
        `cdn.jsdelivr.net/gh/Migetsu/arkcalc-assets@${OPTIMIZED_ASSETS_COMMIT}/thumbs/char_172_svrash.webp`,
      )
      expect(candidates).toContain(`${PRIMARY_CDN_BASE}/skin/char_172_svrash_2b.png`)
    })

    it('prioritizes medium 1280px webp copy and optimized CDN when hero: true is requested', () => {
      const candidates = resolveAsset('art', 'char_172_svrash', { hero: true })
      expect(candidates[0]).toBe('/art/hero/char_172_svrash_2.webp')
      expect(candidates[1]).toContain(
        `cdn.jsdelivr.net/gh/Migetsu/arkcalc-assets@${OPTIMIZED_ASSETS_COMMIT}/hero/char_172_svrash_2.webp`,
      )
      expect(candidates).toContain(`${PRIMARY_CDN_BASE}/skin/char_172_svrash_2b.png`)
    })
  })

  it('supports custom variants and extensions', () => {
    const candidates = resolveAsset('portrait', 'char_102_texas', {
      variant: '2',
      format: 'webp',
    })

    expect(candidates[0]).toBe(`${PRIMARY_CDN_BASE}/portrait/char_102_texas_2.webp`)
    expect(candidates[1]).toBe(`${SECONDARY_CDN_BASE}/portrait/char_102_texas_2.webp`)
  })

  it('strictly prohibits direct runtime requests to prts.wiki or raw.githubusercontent.com', () => {
    const all = [
      ...resolveAsset('avatar', 'char_102_texas'),
      ...resolveAsset('portrait', 'char_102_texas'),
      ...resolveAsset('art', 'char_102_texas'),
      ...resolveAsset('item', '30012'),
      ...resolveAsset('skill', 'skchr_texas_2'),
      ...resolveAsset('equip', 'uniequip_002_texas'),
    ]

    for (const url of all) {
      expect(url).not.toContain('prts.wiki')
      expect(url).not.toContain('raw.githubusercontent.com')
      expect(url).not.toContain('fandom.com')
    }
  })

  it('maps known default item icons like LMD, Orundum, and Headhunting Permits', () => {
    expect(ITEM_ICON_DEFAULT_MAP['4001']).toBe('GOLD')
    expect(ITEM_ICON_DEFAULT_MAP['4002']).toBe('DIAMOND')
    expect(ITEM_ICON_DEFAULT_MAP['4003']).toBe('DIAMOND_SHD')
    expect(ITEM_ICON_DEFAULT_MAP['7003']).toBe('TKT_GACHA')
    expect(ITEM_ICON_DEFAULT_MAP['7004']).toBe('TKT_GACHA_10')
  })

  describe('skin asset resolution', () => {
    it('resolves skin art when passed as charId with full skinId variant', () => {
      const candidates = resolveAsset('art', 'char_002_amiya', {
        variant: 'char_002_amiya@winter#1',
      })
      expect(candidates[0]).toBe(`${PRIMARY_CDN_BASE}/skin/char_002_amiya_winter%231b.png`)
      expect(candidates[1]).toBe(`${SECONDARY_CDN_BASE}/skin/char_002_amiya_winter%231b.png`)
      expect(candidates).toContain(`${PRIMARY_CDN_BASE}/portrait/char_002_amiya_winter%231.png`)
      expect(candidates).toContain(`${PRIMARY_CDN_BASE}/avatar/char_002_amiya_winter%231.png`)
    })

    it('resolves skin art when passed as charId with short variant', () => {
      const candidates = resolveAsset('art', 'char_002_amiya', {
        variant: 'winter#1',
      })
      expect(candidates[0]).toBe(`${PRIMARY_CDN_BASE}/skin/char_002_amiya_winter%231b.png`)
      expect(candidates[1]).toBe(`${SECONDARY_CDN_BASE}/skin/char_002_amiya_winter%231b.png`)
    })

    it('resolves skin art directly by skinId', () => {
      const candidates = resolveAsset('art', 'char_002_amiya@winter#1')
      expect(candidates[0]).toBe(`${PRIMARY_CDN_BASE}/skin/char_002_amiya_winter%231b.png`)
      expect(candidates[1]).toBe(`${SECONDARY_CDN_BASE}/skin/char_002_amiya_winter%231b.png`)
    })

    it('resolves skin portrait and avatar with %23 URL-encoding', () => {
      const portrait = resolveAsset('portrait', 'char_002_amiya@winter#1')
      expect(portrait[0]).toBe(`${PRIMARY_CDN_BASE}/portrait/char_002_amiya_winter%231.png`)
      expect(portrait[1]).toBe(`${SECONDARY_CDN_BASE}/portrait/char_002_amiya_winter%231.png`)

      const avatar = resolveAsset('avatar', 'char_002_amiya_winter#1')
      expect(avatar[0]).toBe(`${PRIMARY_CDN_BASE}/avatar/char_002_amiya_winter%231.png`)
      expect(avatar[1]).toBe(`${SECONDARY_CDN_BASE}/avatar/char_002_amiya_winter%231.png`)
    })
  })
})
