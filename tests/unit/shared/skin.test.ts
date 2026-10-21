import { describe, expect, it } from 'vitest'
import {
  formatSkinPriceStatus,
  sortOperatorSkins,
  filterOperatorSkins,
  groupSkinsByCharId,
  isDefaultSkin,
} from '../../../shared/utils/skin'
import skinsDataset from '../../../data/skins.json'
import type { Skin } from '../../../shared/schemas/skin'

describe('Skin utilities (shared/utils/skin.ts)', () => {
  describe('formatSkinPriceStatus', () => {
    it('maps price status default to "Base"', () => {
      expect(formatSkinPriceStatus('default')).toBe('Base')
    })

    it('maps price status free to "Free"', () => {
      expect(formatSkinPriceStatus('free')).toBe('Free')
    })

    it('maps price status unknown to "—"', () => {
      expect(formatSkinPriceStatus('unknown')).toBe('—')
    })
  })

  describe('isDefaultSkin', () => {
    it('identifies canonical appearances as default skins', () => {
      expect(isDefaultSkin('char_002_amiya#1')).toBe(true)
      expect(isDefaultSkin('char_002_amiya#1+')).toBe(true)
      expect(isDefaultSkin('char_002_amiya#2')).toBe(true)
      expect(isDefaultSkin('char_172_svrash#1')).toBe(true)
      expect(isDefaultSkin('char_172_svrash#2')).toBe(true)
    })

    it('identifies cosmetic outfits containing @ as non-default skins', () => {
      expect(isDefaultSkin('char_002_amiya@winter#1')).toBe(false)
      expect(isDefaultSkin('char_172_svrash@snow#1')).toBe(false)
      expect(isDefaultSkin('char_102_texas@epoque#7')).toBe(false)
    })
  })

  describe('sortOperatorSkins', () => {
    const mockSkins = [
      { skinId: 'char_102_texas@epoque#7', isDefault: false },
      { skinId: 'char_102_texas#2', isDefault: true },
      { skinId: 'char_102_texas@winter#1', isDefault: false },
      { skinId: 'char_102_texas#1', isDefault: true },
    ]

    it('sorts default forms first by default in stable order', () => {
      const sorted = sortOperatorSkins(mockSkins)
      expect(sorted.map((s) => s.skinId)).toEqual([
        'char_102_texas#1',
        'char_102_texas#2',
        'char_102_texas@epoque#7',
        'char_102_texas@winter#1',
      ])
    })

    it('sorts cosmetic outfits first when defaultFirst is false', () => {
      const sorted = sortOperatorSkins(mockSkins, { defaultFirst: false })
      expect(sorted.map((s) => s.skinId)).toEqual([
        'char_102_texas@epoque#7',
        'char_102_texas@winter#1',
        'char_102_texas#1',
        'char_102_texas#2',
      ])
    })
  })

  describe('filterOperatorSkins', () => {
    const mockSkins = [
      { skinId: 'char_102_texas#1', isDefault: true, isCnOnly: false },
      { skinId: 'char_102_texas@epoque#7', isDefault: false, isCnOnly: false },
      { skinId: 'char_999_cn@brand#1', isDefault: false, isCnOnly: true },
    ]

    it('excludes default skins when excludeDefault is true', () => {
      const filtered = filterOperatorSkins(mockSkins, { excludeDefault: true })
      expect(filtered.map((s) => s.skinId)).toEqual([
        'char_102_texas@epoque#7',
        'char_999_cn@brand#1',
      ])
    })

    it('filters by CN-only status when cnOnlyOnly is true', () => {
      const filtered = filterOperatorSkins(mockSkins, { cnOnlyOnly: true })
      expect(filtered.map((s) => s.skinId)).toEqual(['char_999_cn@brand#1'])
    })
  })

  describe('Data Integrity & Absence of Guesswork Prices', () => {
    const typedSkins = skinsDataset as unknown as Skin[]

    it('confirms 100% of skins in data/skins.json have price === null', () => {
      for (const skin of typedSkins) {
        expect(skin.price).toBeNull()
        expect(skin.priceSource).toBeNull()
        expect(['default', 'free', 'unknown']).toContain(skin.priceStatus)
      }
    })

    it('correctly associates SilverAsh skins', () => {
      const silverAshSkins = typedSkins.filter((s) => s.charId === 'char_172_svrash')
      expect(silverAshSkins.length).toBe(5)

      const cosmetic = silverAshSkins.filter((s) => !s.isDefault)
      expect(cosmetic.length).toBe(3)
      for (const skin of cosmetic) {
        expect(skin.priceStatus).toBe('unknown')
        expect(formatSkinPriceStatus(skin.priceStatus)).toBe('—')
      }

      const defaultForms = silverAshSkins.filter((s) => s.isDefault)
      expect(defaultForms.length).toBe(2)
      for (const skin of defaultForms) {
        expect(skin.priceStatus).toBe('default')
        expect(formatSkinPriceStatus(skin.priceStatus)).toBe('Base')
      }
    })

    it('correctly associates Amiya skins with event reward free status', () => {
      const amiyaSkins = typedSkins.filter((s) => s.charId === 'char_002_amiya')
      expect(amiyaSkins.length).toBe(11)

      const freshFastener = amiyaSkins.find((s) => s.skinId === 'char_002_amiya@epoque#4')
      expect(freshFastener).toBeDefined()
      expect(freshFastener?.priceStatus).toBe('free')
      expect(formatSkinPriceStatus(freshFastener!.priceStatus)).toBe('Free')
    })
  })

  describe('groupSkinsByCharId', () => {
    const typedSkins = skinsDataset as unknown as Skin[]

    it('keeps every skin grouped under its operator without data loss', () => {
      const grouped = groupSkinsByCharId(typedSkins)
      const chars = new Set(typedSkins.map((skin) => skin.charId))

      expect(grouped.size).toBe(chars.size)
      expect([...grouped.values()].reduce((sum, list) => sum + list.length, 0)).toBe(
        typedSkins.length,
      )
      for (const [charId, list] of grouped) {
        expect(list.every((skin) => skin.charId === charId)).toBe(true)
      }
    })

    it('serves the same SilverAsh outfits the detail page displayed before the API move', () => {
      const grouped = groupSkinsByCharId(typedSkins)
      const silverAsh = grouped.get('char_172_svrash') ?? []

      expect(silverAsh.length).toBe(5)
      expect(silverAsh.map((skin) => skin.skinId)).toEqual(
        typedSkins.filter((skin) => skin.charId === 'char_172_svrash').map((skin) => skin.skinId),
      )
    })

    it('returns an empty group for an unknown operator', () => {
      expect(groupSkinsByCharId(typedSkins).get('char_999_unknown')).toBeUndefined()
    })
  })
})
