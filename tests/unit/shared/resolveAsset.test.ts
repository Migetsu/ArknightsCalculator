import { describe, expect, it } from 'vitest'
import {
  resolveAsset,
  ASSET_REPO_COMMIT,
  PRIMARY_CDN_BASE,
  SECONDARY_CDN_BASE,
} from '../../../shared/utils/resolveAsset'

describe('resolveAsset utility', () => {
  it('pins the asset repository commit to the verified commit SHA', () => {
    expect(ASSET_REPO_COMMIT).toBe('9bf239661e37766fba585806fb9fa67e79bb679e')
    expect(PRIMARY_CDN_BASE).toContain(
      'cdn.jsdelivr.net/gh/yuanyan3060/ArknightsGameResource@9bf2396',
    )
    expect(SECONDARY_CDN_BASE).toContain(
      'cdn.statically.io/gh/yuanyan3060/ArknightsGameResource/9bf2396',
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

    it('generates standard item, skill, and equip candidates', () => {
      expect(resolveAsset('item', '30012')).toEqual([
        `${PRIMARY_CDN_BASE}/item/30012.png`,
        `${SECONDARY_CDN_BASE}/item/30012.png`,
      ])
      expect(resolveAsset('skill', 'skchr_texas_2')).toEqual([
        `${PRIMARY_CDN_BASE}/skill/skchr_texas_2.png`,
        `${SECONDARY_CDN_BASE}/skill/skchr_texas_2.png`,
      ])
      expect(resolveAsset('equip', 'uniequip_002_texas')).toEqual([
        `${PRIMARY_CDN_BASE}/equip/uniequip_002_texas.png`,
        `${SECONDARY_CDN_BASE}/equip/uniequip_002_texas.png`,
      ])
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

  it('supports custom variants and extensions', () => {
    const candidates = resolveAsset('portrait', 'char_102_texas', {
      variant: '2',
      format: 'webp',
    })

    expect(candidates[0]).toBe(`${PRIMARY_CDN_BASE}/portrait/char_102_texas_2.webp`)
    expect(candidates[1]).toBe(`${SECONDARY_CDN_BASE}/portrait/char_102_texas_2.webp`)
  })

  it('strictly prohibits direct runtime requests to prts.wiki or raw.githubusercontent.com', () => {
    const candidates = resolveAsset('avatar', 'char_102_texas')
    for (const url of candidates) {
      expect(url).not.toContain('prts.wiki')
      expect(url).not.toContain('raw.githubusercontent.com')
    }
  })
})
