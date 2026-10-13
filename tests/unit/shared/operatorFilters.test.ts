import { describe, it, expect } from 'vitest'
import type { OperatorSummary } from '../../../shared/schemas/operator'
import {
  DEFAULT_OPERATOR_FILTERS,
  parseOperatorFilterQuery,
  serializeOperatorFilterQuery,
  filterOperators,
  sortOperators,
  applyOperatorFiltersAndSort,
} from '../../../shared/utils/operatorFilters'

const mockOperators: OperatorSummary[] = [
  {
    id: 'char_002_amiya',
    name: { en: 'Amiya', zh: '阿米娅', ru: 'Амия' },
    appellation: 'Amiya',
    displayNumber: 'R001',
    rarity: 5,
    class: 'CASTER',
    subclass: 'corecaster',
    faction: 'rhodes',
    position: 'RANGED',
    tagList: ['DPS'],
    servers: ['cn', 'global'],
    hasIcon: true,
  },
  {
    id: 'char_003_kalts',
    name: { en: "Kal'tsit", zh: '凯尔希', ru: 'Кельцит' },
    appellation: "Kal'tsit",
    displayNumber: 'B003',
    rarity: 6,
    class: 'MEDIC',
    subclass: 'physician',
    faction: 'rhodes',
    position: 'RANGED',
    tagList: ['Summon', 'Healing'],
    servers: ['cn', 'global'],
    hasIcon: true,
  },
  {
    id: 'char_010_chen',
    name: { en: "Ch'en", zh: '陈', ru: 'Чэнь' },
    appellation: "Ch'en",
    displayNumber: 'LM04',
    rarity: 6,
    class: 'WARRIOR',
    subclass: 'sword',
    faction: 'lungmen',
    position: 'MELEE',
    tagList: ['Nuker', 'DPS'],
    servers: ['cn', 'global'],
    hasIcon: true,
  },
  {
    id: 'char_1037_amiya3',
    name: { en: 'Amiya (Medic)', zh: '阿米娅(医疗)' },
    appellation: 'Amiya',
    displayNumber: 'R001',
    rarity: 5,
    class: 'MEDIC',
    subclass: 'wandering',
    faction: 'rhodes',
    position: 'RANGED',
    tagList: ['Healing'],
    servers: ['cn'], // CN only
    hasIcon: false,
  },
  {
    id: 'char_500_breeze',
    name: { en: 'Breeze', zh: '微风', ru: 'Бриз' },
    appellation: 'Breeze',
    displayNumber: 'MN02',
    rarity: 5,
    class: 'MEDIC',
    subclass: 'ringhealer',
    faction: 'minos',
    position: 'RANGED',
    tagList: ['Healing'],
    servers: ['cn', 'global'],
    hasIcon: true,
  },
  {
    id: 'char_100_yato',
    name: { en: 'Yato', zh: '夜刀' },
    appellation: 'Yato',
    displayNumber: 'A001',
    rarity: 2,
    class: 'PIONEER',
    subclass: 'fast',
    faction: 'rhodes',
    position: 'MELEE',
    tagList: ['Fast-Redeploy'],
    servers: ['cn', 'global'],
    hasIcon: true,
  },
]

describe('operatorFilters', () => {
  describe('parseOperatorFilterQuery', () => {
    it('returns default filters for empty or undefined input', () => {
      expect(parseOperatorFilterQuery(undefined)).toEqual(DEFAULT_OPERATOR_FILTERS)
      expect(parseOperatorFilterQuery({})).toEqual(DEFAULT_OPERATOR_FILTERS)
    })

    it('parses search query correctly', () => {
      const parsed = parseOperatorFilterQuery({ q: '  kalts  ' })
      expect(parsed.search).toBe('kalts')
    })

    it('parses single and multiple classes with validation', () => {
      const parsed = parseOperatorFilterQuery({ class: 'MEDIC,warrior,INVALID,CASTER' })
      expect(parsed.classes).toEqual(['MEDIC', 'WARRIOR', 'CASTER'])
    })

    it('parses rarities list and ignores invalid values', () => {
      const parsed = parseOperatorFilterQuery({ rarity: '6, 5, 0, 7, abc, 2' })
      expect(parsed.rarities).toEqual([6, 5, 2])
    })

    it('parses subclass and faction', () => {
      const parsed = parseOperatorFilterQuery({
        subclass: ' Physician ',
        faction: ' Rhodes ',
      })
      expect(parsed.subclass).toBe('physician')
      expect(parsed.faction).toBe('rhodes')
    })

    it('ignores server parameter per server model spec', () => {
      const parsedCn = parseOperatorFilterQuery({ server: 'cn' })
      const parsedGlobal = parseOperatorFilterQuery({ server: 'global' })
      expect(parsedCn).toEqual(DEFAULT_OPERATOR_FILTERS)
      expect(parsedGlobal).toEqual(DEFAULT_OPERATOR_FILTERS)
    })

    it('parses sort options with fallback to rarity_desc', () => {
      expect(parseOperatorFilterQuery({ sort: 'name_asc' }).sort).toBe('name_asc')
      expect(parseOperatorFilterQuery({ sort: 'rarity_asc' }).sort).toBe('rarity_asc')
      expect(parseOperatorFilterQuery({ sort: 'invalid_sort' }).sort).toBe('rarity_desc')
    })
  })

  describe('serializeOperatorFilterQuery', () => {
    it('returns empty object for default state', () => {
      expect(serializeOperatorFilterQuery(DEFAULT_OPERATOR_FILTERS)).toEqual({})
    })

    it('serializes active filters and ignores default ones', () => {
      const serialized = serializeOperatorFilterQuery({
        search: 'amiya',
        classes: ['MEDIC', 'CASTER'],
        rarities: [5, 6],
        subclass: 'physician',
        faction: 'rhodes',
        sort: 'name_asc',
      })

      expect(serialized).toEqual({
        q: 'amiya',
        class: 'MEDIC,CASTER',
        rarity: '6,5',
        subclass: 'physician',
        faction: 'rhodes',
        sort: 'name_asc',
      })
    })

    it('omits sort if rarity_desc', () => {
      const serialized = serializeOperatorFilterQuery({
        ...DEFAULT_OPERATOR_FILTERS,
        search: 'chen',
        sort: 'rarity_desc',
      })

      expect(serialized).toEqual({ q: 'chen' })
    })
  })

  describe('filterOperators', () => {
    it('includes all operators from database without server filtering', () => {
      const result = filterOperators(mockOperators, DEFAULT_OPERATOR_FILTERS)
      expect(result.some((op) => op.id === 'char_1037_amiya3')).toBe(true)
      expect(result.length).toBe(6)
    })

    it('searches by English, Chinese, and Russian names case-insensitively', () => {
      // English
      const enResult = filterOperators(mockOperators, {
        ...DEFAULT_OPERATOR_FILTERS,
        search: "kal'tsit",
      })
      expect(enResult.map((o) => o.id)).toEqual(['char_003_kalts'])

      // Chinese
      const zhResult = filterOperators(mockOperators, {
        ...DEFAULT_OPERATOR_FILTERS,
        search: '微风',
      })
      expect(zhResult.map((o) => o.id)).toEqual(['char_500_breeze'])

      // Russian
      const ruResult = filterOperators(mockOperators, {
        ...DEFAULT_OPERATOR_FILTERS,
        search: 'амия',
      })
      expect(ruResult.map((o) => o.id)).toEqual(['char_002_amiya'])
    })

    it('filters by multiple classes', () => {
      const result = filterOperators(mockOperators, {
        ...DEFAULT_OPERATOR_FILTERS,
        classes: ['MEDIC', 'WARRIOR'],
      })
      expect(result.map((o) => o.id).sort()).toEqual(
        ['char_003_kalts', 'char_010_chen', 'char_1037_amiya3', 'char_500_breeze'].sort(),
      )
    })

    it('filters by multiple rarities', () => {
      const result = filterOperators(mockOperators, {
        ...DEFAULT_OPERATOR_FILTERS,
        rarities: [6, 2],
      })
      expect(result.map((o) => o.id).sort()).toEqual(
        ['char_003_kalts', 'char_010_chen', 'char_100_yato'].sort(),
      )
    })

    it('filters by faction and subclass', () => {
      const result = filterOperators(mockOperators, {
        ...DEFAULT_OPERATOR_FILTERS,
        faction: 'rhodes',
        subclass: 'physician',
      })
      expect(result.map((o) => o.id)).toEqual(['char_003_kalts'])
    })
  })

  describe('sortOperators', () => {
    it('sorts by rarity_desc by default with secondary alphabetical order', () => {
      const sorted = sortOperators(mockOperators, 'rarity_desc', 'en')
      expect(sorted.map((o) => o.name.en)).toEqual([
        "Ch'en",
        "Kal'tsit",
        'Amiya',
        'Amiya (Medic)',
        'Breeze',
        'Yato',
      ])
    })

    it('sorts by rarity_asc', () => {
      const sorted = sortOperators(mockOperators, 'rarity_asc', 'en')
      expect(sorted[0]?.name.en).toBe('Yato')
      expect(sorted[sorted.length - 1]?.rarity).toBe(6)
    })

    it('sorts alphabetically by name_asc and name_desc', () => {
      const asc = sortOperators(mockOperators, 'name_asc', 'en')
      expect(asc[0]?.name.en).toBe('Amiya')
      expect(asc[asc.length - 1]?.name.en).toBe('Yato')

      const desc = sortOperators(mockOperators, 'name_desc', 'en')
      expect(desc[0]?.name.en).toBe('Yato')
      expect(desc[desc.length - 1]?.name.en).toBe('Amiya')
    })
  })

  describe('applyOperatorFiltersAndSort', () => {
    it('combines filtering and sorting in one pipeline', () => {
      const result = applyOperatorFiltersAndSort(
        mockOperators,
        {
          ...DEFAULT_OPERATOR_FILTERS,
          classes: ['MEDIC'],
          sort: 'name_asc',
        },
        'en',
      )

      expect(result.map((o) => o.name.en)).toEqual(['Amiya (Medic)', 'Breeze', "Kal'tsit"])
    })
  })
})
