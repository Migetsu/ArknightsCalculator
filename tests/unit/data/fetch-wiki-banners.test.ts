import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  createOperatorIndexMap,
  normalizeDate,
  normalizeOperatorName,
  parseRawCellParams,
  parseWikiBannerBlock,
  parseWikitextPage,
  type OperatorIndexItem,
  type ParsedWikiBanner,
} from '../../../scripts/data/fetch-wiki-banners'
import { buildBannersFromTables, type RawGachaTable } from '../../../scripts/data/build-banners'

describe('Wiki Banners Parser & Ingestion Engine (scripts/data/fetch-wiki-banners.ts)', () => {
  const mockOperators: OperatorIndexItem[] = [
    {
      id: 'char_003_kalts',
      name: { en: "Kal'tsit", zh: '凯尔希' },
      appellation: "Kal'tsit",
      rarity: 6,
    },
    {
      id: 'char_113_cqbw',
      name: { en: 'W', zh: 'W' },
      appellation: 'W',
      rarity: 6,
    },
    {
      id: 'char_400_weedy',
      name: { en: 'Weedy', zh: '温蒂' },
      appellation: 'Weedy',
      rarity: 6,
    },
    {
      id: 'char_401_elysm',
      name: { en: 'Elysium', zh: '极境' },
      appellation: 'Elysium',
      rarity: 5,
    },
    {
      id: 'char_4064_mlynar',
      name: { en: 'Młynar', zh: '玛恩纳' },
      appellation: 'Młynar',
      rarity: 6,
    },
    {
      id: 'char_1016_agoat2',
      name: { en: 'Eyjafjalla the Hvít Aska', zh: '纯烬艾雅法拉' },
      appellation: 'Eyjafjalla the Hvít Aska',
      rarity: 6,
    },
    {
      id: 'char_1041_angel2',
      name: { en: 'Exusiai the New Covenant', zh: '新约能天使' },
      appellation: 'Exusiai the New Covenant',
      rarity: 6,
    },
    {
      id: 'char_4193_lemuen',
      name: { en: 'Lemuen', zh: '蕾缪安' },
      appellation: 'Lemuen',
      rarity: 6,
    },
    {
      id: 'char_4187_graceb',
      name: { en: 'Gracebearer', zh: '恩赐者' },
      appellation: 'Gracebearer',
      rarity: 5,
    },
    {
      id: 'char_1035_wisdel',
      name: { en: "Wiš'adel", zh: '维什戴尔' },
      appellation: "Wiš'adel",
      rarity: 6,
    },
    {
      id: 'char_249_mlyss',
      name: { en: 'Muelsyse', zh: '缪尔赛思' },
      appellation: 'Muelsyse',
      rarity: 6,
    },
  ]

  const mockOpMap = createOperatorIndexMap(mockOperators)

  describe('normalizeDate', () => {
    it('normalizes YYYY-MM-DD and YYYY/MM/DD to YYYY-MM-DD and trims whitespace', () => {
      expect(normalizeDate('2025-05-01')).toBe('2025-05-01')
      expect(normalizeDate('2025/05/01')).toBe('2025-05-01')
      expect(normalizeDate('  2025/10/14  ')).toBe('2025-10-14')
      expect(normalizeDate('')).toBeUndefined()
      expect(normalizeDate(undefined)).toBeUndefined()
    })
  })

  describe('parseRawCellParams', () => {
    it('correctly parses multiline wikitext pipe parameters', () => {
      const raw = `{{Banners cell
|type = celebration
|name = Freedom of Preach
|cnstart = 2025/05/01
|cnend = 2025/05/15
|globalstart = 2025/10/14
|globalend = 2025/10/28
|operators = Exusiai the New Covenant, Gracebearer, Lemuen, Muelsyse, Wiš'adel
|limited = 1,0,0,2,2
}}`
      const params = parseRawCellParams(raw)
      expect(params.type).toBe('celebration')
      expect(params.name).toBe('Freedom of Preach')
      expect(params.cnstart).toBe('2025/05/01')
      expect(params.cnend).toBe('2025/05/15')
      expect(params.globalstart).toBe('2025/10/14')
      expect(params.globalend).toBe('2025/10/28')
      expect(params.limited).toBe('1,0,0,2,2')
    })
  })

  describe('normalizeOperatorName & diacritics mapping', () => {
    it('normalizes polish and icelandic diacritics for seamless wiki matching', () => {
      expect(normalizeOperatorName('Młynar')).toBe('mlynar')
      expect(normalizeOperatorName('Mlynar')).toBe('mlynar')
      expect(normalizeOperatorName('Eyjafjalla the Hvít Aska')).toBe('eyjafjalla the hvit aska')
      expect(normalizeOperatorName('Eyjafjalla the Hvit Aska')).toBe('eyjafjalla the hvit aska')
      expect(normalizeOperatorName("Wiš'adel")).toBe("wis'adel")
      expect(normalizeOperatorName("Wis'adel")).toBe("wis'adel")
    })

    it('successfully maps Mlynar and Eyjafjalla the Hvit Aska to operator IDs', () => {
      const mlynarOp = mockOpMap.get(normalizeOperatorName('Mlynar'))
      expect(mlynarOp?.id).toBe('char_4064_mlynar')

      const eyjaOp = mockOpMap.get(normalizeOperatorName('Eyjafjalla the Hvit Aska'))
      expect(eyjaOp?.id).toBe('char_1016_agoat2')
    })

    it('collects unknown names into unmappedCollector without guessing', () => {
      const unmapped = new Set<string>()
      const rawBlock = `{{Banners cell
|type = special
|name = Mystery Banner
|operators = Unknown Operator 9000, Kal'tsit
}}`
      const parsed = parseWikiBannerBlock(rawBlock, 'TestPage', mockOpMap, unmapped)
      expect(parsed.rateUp6).toContain('char_003_kalts')
      expect(unmapped.has('Unknown Operator 9000')).toBe(true)
      expect(unmapped.size).toBe(1)
    })
  })

  describe('parseWikiBannerBlock fixtures', () => {
    it('parses celebration banner with primary, standard, and secondary limited rate-ups', () => {
      const fixture = `{{Banners cell
|type = celebration
|name = Freedom of Preach
|cnstart = 2025/05/01 16:00:00
|cnend = 2025/05/15 03:59:00
|globalstart = 2025/10/14 10:00:00
|globalend = 2025/10/28 03:59:00
|operators = Exusiai the New Covenant, Gracebearer, Lemuen, Muelsyse, Wiš'adel
|limited = 1,0,0,2,2
}}`
      const banner = parseWikiBannerBlock(fixture, 'Headhunting/Banners/2025', mockOpMap)

      expect(banner.name).toBe('Freedom of Preach')
      expect(banner.type).toBe('celebration')
      expect(banner.cnStart).toBe('2025-05-01')
      expect(banner.cnEnd).toBe('2025-05-15')
      expect(banner.globalStart).toBe('2025-10-14')
      expect(banner.globalEnd).toBe('2025-10-28')

      // Exusiai (1) and Lemuen (0) are 6★
      expect(banner.rateUp6).toEqual(['char_1041_angel2', 'char_4193_lemuen'])
      // Exusiai (1) is primary
      expect(banner.primaryRateUp6).toBe('char_1041_angel2')
      // Gracebearer (0) is 5★
      expect(banner.rateUp5).toEqual(['char_4187_graceb'])
      // Muelsyse (2) and Wiš'adel (2) are secondary 6★
      expect(banner.secondaryRateUp6).toEqual(['char_249_mlyss', 'char_1035_wisdel'])
    })

    it('parses standard pool banners using start and end dates', () => {
      const fixture = `{{Banners cell
|type = standard
|no = 26
|start = 2020/12/25
|end = 2021/01/08
|operators = Weedy, Elysium
|store = 1,0
}}`
      const banner = parseWikiBannerBlock(fixture, 'Headhunting/Banners/2020', mockOpMap)
      expect(banner.type).toBe('standard')
      expect(banner.no).toBe('26')
      expect(banner.globalStart).toBe('2020-12-25')
      expect(banner.globalEnd).toBe('2021-01-08')
      expect(banner.cnStart).toBeUndefined()
      expect(banner.rateUp6).toEqual(['char_400_weedy'])
      expect(banner.rateUp5).toEqual(['char_401_elysm'])
    })

    it('parses operators1 and operators2 groups for orienteering banners', () => {
      const fixture = `{{Banners cell
|type = orient
|no = 7
|cnstart = 2026/05/15 16:00:00
|cnend = 2026/05/29 03:59:00
|operators1 = Kal'tsit, Weedy
|operators2 = Elysium, Gracebearer
}}`
      const banner = parseWikiBannerBlock(fixture, 'Headhunting/Banners/2026', mockOpMap)
      expect(banner.type).toBe('orient')
      expect(banner.cnStart).toBe('2026-05-15')
      expect(banner.rateUp6).toEqual(['char_003_kalts', 'char_400_weedy'])
      expect(banner.rateUp5).toEqual(['char_401_elysm', 'char_4187_graceb'])
    })
  })

  describe('parseWikitextPage', () => {
    it('finds and parses multiple {{Banners cell}} blocks in a wiki page', () => {
      const pageText = `
== Event Banners ==
Some text before.
{{Banners cell
|type = standard
|no = 26
|start = 2020-12-25
|end = 2021-01-08
|operators = Weedy
}}
Middle text.
{{Banners cell
|type = celebration
|name = Freedom of Preach
|cnstart = 2025/05/01
|operators = Weedy
}}
`
      const results = parseWikitextPage(pageText, 'Headhunting/Banners/2020', mockOpMap)
      expect(results.length).toBe(2)
      expect(results[0]?.type).toBe('standard')
      expect(results[1]?.name).toBe('Freedom of Preach')
    })
  })

  describe('Integration with buildBannersFromTables', () => {
    it('stitches wiki rateUp and real Global dates onto banners dataset without network', () => {
      const mockWiki: ParsedWikiBanner[] = [
        {
          name: 'Cremation Last Wish',
          type: 'celebration',
          cnStart: '2020-05-01',
          cnEnd: '2020-05-14',
          globalStart: '2020-12-30',
          globalEnd: '2021-01-13',
          rawCnStart: '2020/05/01',
          rawCnEnd: '2020/05/14',
          rawGlobalStart: '2020/12/30',
          rawGlobalEnd: '2021/01/13',
          sourcePage: 'Headhunting/Banners/2020',
          rateUp6: ['char_113_cqbw', 'char_400_weedy'],
          rateUp5: ['char_401_elysm'],
          primaryRateUp6: 'char_113_cqbw',
          secondaryRateUp6: [],
          rawOperators: ['W', 'Weedy', 'Elysium'],
        },
      ]

      const enRaw: RawGachaTable = {
        gachaPoolClient: [
          {
            gachaPoolId: 'LIMITED_EN_4_3_1',
            gachaIndex: 1,
            openTime: 1609362000, // 2020-12-30T21:00:00Z
            endTime: 1610571599, // 2021-01-13T20:59:59Z
            gachaPoolName: 'Cremation Last Wish',
            gachaRuleType: 'LIMITED',
            LMTGSID: 'LMTGS_COIN_903',
          },
        ],
      }

      const cnRaw: RawGachaTable = {
        gachaPoolClient: [
          {
            gachaPoolId: 'LIMITED_9_0_3',
            gachaIndex: 1,
            openTime: 1588316400, // 2020-05-01T07:00:00Z
            endTime: 1589486399,
            gachaPoolName: '遗愿焰火',
            gachaRuleType: 'LIMITED',
            LMTGSID: 'LMTGS_COIN_903',
          },
        ],
      }

      const { dataset, stats } = buildBannersFromTables(enRaw, cnRaw, {
        now: 1600000000,
        wikiBanners: mockWiki,
      })

      expect(stats.totalPairsFormed).toBe(1)
      expect(stats.lmtgsidDiscrepanciesCount).toBe(0)

      const cnBanner = dataset.cnBanners.find((b) => b.id === 'LIMITED_9_0_3')
      expect(cnBanner).toBeDefined()
      expect(cnBanner?.rateUp6).toEqual(['char_113_cqbw', 'char_400_weedy'])
      expect(cnBanner?.rateUp5).toEqual(['char_401_elysm'])
      expect(cnBanner?.primaryRateUp6).toBe('char_113_cqbw')
      expect(cnBanner?.globalStartDate).toBe('2020/12/30')
      expect(cnBanner?.globalEndDate).toBe('2021/01/13')
      expect(cnBanner?.pairedBannerId).toBe('LIMITED_EN_4_3_1')

      const enBanner = dataset.enBanners.find((b) => b.id === 'LIMITED_EN_4_3_1')
      expect(enBanner).toBeDefined()
      expect(enBanner?.rateUp6).toEqual(['char_113_cqbw', 'char_400_weedy'])
      expect(enBanner?.pairedBannerId).toBe('LIMITED_9_0_3')
    })
  })

  describe('Elimination of 175-day heuristic', () => {
    it('verifies calculateEstimatedGlobalDate is nowhere in shared/utils/gacha or app/', () => {
      const gachaUtilPath = path.resolve(process.cwd(), 'shared/utils/gacha/index.ts')
      const gachaCode = fs.readFileSync(gachaUtilPath, 'utf-8')
      expect(gachaCode.includes('calculateEstimatedGlobalDate')).toBe(false)
      expect(gachaCode.includes('175')).toBe(false)

      const bannerCardPath = path.resolve(
        process.cwd(),
        'app/components/gacha/GachaBannerCard.vue',
      )
      const cardCode = fs.readFileSync(bannerCardPath, 'utf-8')
      expect(cardCode.includes('calculateEstimatedGlobalDate')).toBe(false)
      expect(cardCode.includes('estimatedGlobal')).toBe(false)

      const gachaPagePath = path.resolve(process.cwd(), 'app/pages/gacha.vue')
      const pageCode = fs.readFileSync(gachaPagePath, 'utf-8')
      expect(pageCode.includes('calculateEstimatedGlobalDate')).toBe(false)
      expect(pageCode.includes('estimatedGlobal')).toBe(false)
    })
  })
})
