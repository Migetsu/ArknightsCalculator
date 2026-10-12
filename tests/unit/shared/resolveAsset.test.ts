import { describe, expect, it } from 'vitest'
import {
  resolveAsset,
  ASSET_REPO_COMMIT,
  PRIMARY_CDN_BASE,
  SECONDARY_CDN_BASE,
  type AssetKind,
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
    const kinds: AssetKind[] = ['avatar', 'portrait', 'item', 'skill', 'equip']

    it.each(kinds)('generates valid candidates for kind: %s', (kind) => {
      const candidates = resolveAsset(kind, 'test_id')
      expect(candidates).toHaveLength(2)

      const [primary, secondary] = candidates
      expect(primary).toBe(`${PRIMARY_CDN_BASE}/${kind}/test_id.png`)
      expect(secondary).toBe(`${SECONDARY_CDN_BASE}/${kind}/test_id.png`)
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
