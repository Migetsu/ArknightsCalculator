import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import {
  isPlayableOperator,
  buildOperatorData,
  resolveSubclassName,
} from '../../../scripts/data/build-operators'
import {
  OperatorSummarySchema,
  OperatorDetailSchema,
  DataMetaSchema,
  resolveI18nString,
  type I18nString,
} from '../../../shared/schemas/operator'
import type { RawCharacter } from '../../../scripts/data/schemas'
import type { RawUniequipTable } from '../../../scripts/data/schemas/uniequip-table.schema'

describe('Operator Data Builder & Schemas', () => {
  describe('isPlayableOperator filter', () => {
    const baseValidChar: RawCharacter = {
      name: 'Texas',
      profession: 'PIONEER',
      subProfessionId: 'charger',
      rarity: 'TIER_5',
      phases: [],
      skills: [],
      allSkillLvlup: [],
      displayNumber: 'PL02',
      isNotObtainable: false,
    }

    it('accepts regular playable operator', () => {
      expect(isPlayableOperator('char_102_texas', baseValidChar)).toBe(true)
    })

    it('rejects tokens (isToken: true or token_ prefix)', () => {
      const tokenChar: RawCharacter = {
        ...baseValidChar,
        isToken: true,
      }
      expect(isPlayableOperator('token_10001_deepcl_tentac', tokenChar)).toBe(false)
      expect(isPlayableOperator('char_102_texas', tokenChar)).toBe(false)
    })

    it('rejects traps and non-operator prefixes', () => {
      const trapChar: RawCharacter = {
        ...baseValidChar,
        profession: 'TRAP',
      }
      expect(isPlayableOperator('trap_001_crate', trapChar)).toBe(false)
    })

    it('rejects test dummy IDs', () => {
      expect(isPlayableOperator('char_500_noone', baseValidChar)).toBe(false)
      expect(isPlayableOperator('char_501_free', baseValidChar)).toBe(false)
      expect(isPlayableOperator('char_503_nemer', baseValidChar)).toBe(false)
    })

    it('rejects non-playable characters with notchar subProfessionId', () => {
      const notChar: RawCharacter = {
        ...baseValidChar,
        subProfessionId: 'notchar1',
      }
      expect(isPlayableOperator('char_999_test', notChar)).toBe(false)
    })

    it('rejects temporary IS story units without catalog display numbers', () => {
      const tempIsChar: RawCharacter = {
        ...baseValidChar,
        isNotObtainable: true,
        displayNumber: null,
      }
      expect(isPlayableOperator('char_504_rguard', tempIsChar)).toBe(false)
    })
  })

  describe('resolveSubclassName', () => {
    const mockEnEquips: RawUniequipTable = {
      equipDict: {},
      subProfDict: {
        primcaster: { subProfessionId: 'primcaster', subProfessionName: 'Primal Caster' },
        wandermedic: { subProfessionId: 'wandermedic', subProfessionName: 'Wandering Medic' },
        physician: { subProfessionId: 'physician', subProfessionName: 'Medic' },
      },
    }
    const mockCnEquips: RawUniequipTable = {
      equipDict: {},
      subProfDict: {
        primcaster: { subProfessionId: 'primcaster', subProfessionName: '本源术师' },
        cnonly: { subProfessionId: 'cnonly', subProfessionName: 'CN Only Subclass' },
      },
    }

    it('resolves official English subclass name when present', () => {
      expect(resolveSubclassName('primcaster', mockEnEquips, mockCnEquips)).toBe('Primal Caster')
      expect(resolveSubclassName('wandermedic', mockEnEquips, mockCnEquips)).toBe('Wandering Medic')
      expect(resolveSubclassName('physician', mockEnEquips, mockCnEquips)).toBe(
        'Single-target Medic',
      )
    })

    it('falls back to Supportive Ranger for supportiveranger', () => {
      expect(resolveSubclassName('supportiveranger', mockEnEquips, mockCnEquips)).toBe(
        'Supportive Ranger',
      )
    })

    it('falls back to CN subProfDict if missing in EN', () => {
      expect(resolveSubclassName('cnonly', mockEnEquips, mockCnEquips)).toBe('CN Only Subclass')
    })

    it('returns raw subId if missing in both', () => {
      expect(resolveSubclassName('unknown_sub', mockEnEquips, mockCnEquips)).toBe('unknown_sub')
    })
  })

  describe('resolveI18nString fallback chain', () => {
    it('prefers ru when available and requested', () => {
      const text: I18nString = {
        en: 'Texas',
        zh: '德克萨斯',
        ru: 'Техас',
      }
      expect(resolveI18nString(text, 'ru')).toBe('Техас')
    })

    it('falls back to en when ru is missing', () => {
      const text: I18nString = {
        en: 'Texas',
        zh: '德克萨斯',
      }
      expect(resolveI18nString(text, 'ru')).toBe('Texas')
    })

    it('falls back to zh when both ru and en are empty', () => {
      const text: I18nString = {
        en: '',
        zh: '德克萨斯',
      }
      expect(resolveI18nString(text, 'ru')).toBe('德克萨斯')
    })

    it('returns empty string on null or undefined input', () => {
      expect(resolveI18nString(null, 'ru')).toBe('')
      expect(resolveI18nString(undefined, 'en')).toBe('')
    })
  })

  describe('buildOperatorData normalization with fixtures', () => {
    const mockBundle = {
      cnChars: {
        char_102_texas: {
          name: '德克萨斯',
          appellation: 'Texas',
          displayNumber: 'PL02',
          rarity: 'TIER_5',
          profession: 'PIONEER',
          subProfessionId: 'charger',
          position: 'MELEE',
          phases: [
            {
              maxLevel: 50,
              rangeId: '1-1',
              evolveCost: null,
            },
          ],
          skills: [
            {
              skillId: 'skcom_charge_cost_2',
              levelUpCostCond: [],
            },
          ],
          allSkillLvlup: [],
        },
        char_001_lowstars: {
          name: '低星测试',
          appellation: 'Robot',
          displayNumber: 'RO01',
          rarity: 'TIER_1',
          profession: 'WARRIOR',
          subProfessionId: 'fearless',
          position: 'MELEE',
          phases: [
            {
              maxLevel: 30,
              evolveCost: null,
            },
          ],
          skills: [],
          allSkillLvlup: [],
        },
        token_dummy: {
          name: 'Token',
          rarity: 'TIER_1',
          profession: 'TOKEN',
          phases: [],
          skills: [],
          isToken: true,
        },
      },
      enChars: {
        char_102_texas: {
          name: 'Texas',
          appellation: 'Texas',
          displayNumber: 'PL02',
          rarity: 'TIER_5',
          profession: 'PIONEER',
          subProfessionId: 'charger',
          position: 'MELEE',
          phases: [],
          skills: [],
        },
      },
      cnSkills: {
        skcom_charge_cost_2: {
          skillId: 'skcom_charge_cost_2',
          levels: [
            {
              name: '冲锋号令·γ型',
              description: '立即获得12点部署费用',
              spData: {
                spType: 'INCREASE_WITH_TIME',
                spCost: 40,
                initSp: 10,
              },
            },
          ],
        },
      },
      enSkills: {
        skcom_charge_cost_2: {
          skillId: 'skcom_charge_cost_2',
          levels: [
            {
              name: 'Charge γ',
              description: 'Immediately gain 12 DP',
            },
          ],
        },
      },
      cnEquips: {
        equipDict: {
          uniequip_002_texas: {
            uniEquipId: 'uniequip_002_texas',
            uniEquipName: '信使送货箱',
            type: 'ADVANCED',
            typeName2: 'CHG-X',
            charId: 'char_102_texas',
          },
        },
        charEquip: {
          char_102_texas: ['uniequip_002_texas'],
        },
      },
      enEquips: {
        equipDict: {
          uniequip_002_texas: {
            uniEquipId: 'uniequip_002_texas',
            uniEquipName: 'Delivery Bag',
            type: 'ADVANCED',
            typeName2: 'CHG-X',
            charId: 'char_102_texas',
          },
        },
        charEquip: {},
      },
      cnBattleEquips: {
        uniequip_002_texas: {
          phases: [
            {
              equipLevel: 1,
              parts: [
                {
                  target: 'TRAIT',
                  overrideTraitDataBundle: {
                    candidates: [
                      {
                        additionalDescription: 'Initial DP +2',
                        blackboard: [{ key: 'dp', value: 2 }],
                      },
                    ],
                  },
                },
              ],
              attributeBlackboard: [
                { key: 'atk', value: 30 },
                { key: 'max_hp', value: 120 },
              ],
            },
          ],
        },
      },
      enBattleEquips: {
        uniequip_002_texas: {
          phases: [
            {
              equipLevel: 1,
              parts: [
                {
                  target: 'TRAIT',
                  overrideTraitDataBundle: {
                    candidates: [
                      {
                        additionalDescription: 'Initial DP +2',
                        blackboard: [{ key: 'dp', value: 2 }],
                      },
                    ],
                  },
                },
              ],
              attributeBlackboard: [
                { key: 'atk', value: 30 },
                { key: 'max_hp', value: 120 },
              ],
            },
          ],
        },
      },
      cnHandbook: {
        handbookDict: {
          char_102_texas: {
            charID: 'char_102_texas',
            drawName: 'Ryuzaki Korichi',
            voiceName: 'Azusa Tadokoro',
          },
        },
      },
      enHandbook: {
        handbookDict: {
          char_102_texas: {
            charID: 'char_102_texas',
            drawName: 'Ryuzaki Korichi',
            voiceName: 'Azusa Tadokoro',
          },
        },
      },
      cnPatch: {
        patchChars: {
          char_1001_amiya2: {
            name: '阿米娅',
            appellation: 'Amiya',
            displayNumber: 'RO01',
            rarity: 'TIER_5',
            profession: 'WARRIOR',
            subProfessionId: 'sword',
            position: 'MELEE',
            phases: [{ maxLevel: 50 }],
            skills: [],
          },
        },
      },
      enPatch: {
        patchChars: {
          char_1001_amiya2: {
            name: 'Amiya',
            appellation: 'Amiya',
            displayNumber: 'RO01',
            rarity: 'TIER_5',
            profession: 'WARRIOR',
            subProfessionId: 'sword',
            position: 'MELEE',
            phases: [{ maxLevel: 50 }],
            skills: [],
          },
        },
      },
    }

    it('filters tokens and normalizes valid playable operators', () => {
      const { summaries, details, stats } = buildOperatorData(mockBundle)

      // Expect Texas, Robot, and Guard Amiya (3 total, token filtered)
      expect(stats.total).toBe(3)
      expect(summaries.map((s) => s.id)).toContain('char_102_texas')
      expect(summaries.map((s) => s.id)).toContain('char_001_lowstars')
      expect(summaries.map((s) => s.id)).toContain('char_1001_amiya2')
      expect(summaries.map((s) => s.id)).not.toContain('token_dummy')

      const texasSummary = summaries.find((s) => s.id === 'char_102_texas')!
      expect(texasSummary.name.en).toBe('Texas')
      expect(texasSummary.name.zh).toBe('德克萨斯')
      expect(texasSummary.rarity).toBe(5)
      expect(texasSummary.class).toBe('PIONEER')
      expect(texasSummary.servers).toEqual(['cn', 'global'])

      const amiyaSummary = summaries.find((s) => s.id === 'char_1001_amiya2')!
      expect(amiyaSummary.isClassChange).toBe(true)

      const texasDetail = details.find((d) => d.id === 'char_102_texas')!
      expect(texasDetail.artist).toBe('Ryuzaki Korichi')
      expect(texasDetail.va).toBe('Azusa Tadokoro')
      expect(texasDetail.modules?.[0]?.name.en).toBe('Delivery Bag')
      expect(texasDetail.modules?.[0]?.stages?.[0]?.stage).toBe(1)
      expect(texasDetail.modules?.[0]?.stages?.[0]?.stats.atk).toBe(30)
      expect(texasDetail.modules?.[0]?.stages?.[0]?.parts?.[0]?.target).toBe('TRAIT')
      expect(texasDetail.skills[0]?.levels[0]?.name.en).toBe('Charge γ')
    })

    it('produces completely deterministic byte-for-byte identical output', () => {
      const run1 = buildOperatorData(mockBundle)
      const run2 = buildOperatorData(mockBundle)

      expect(JSON.stringify(run1)).toBe(JSON.stringify(run2))
    })

    it('validates normalized output with Zod schemas', () => {
      const { summaries, details } = buildOperatorData(mockBundle)

      for (const summary of summaries) {
        expect(() => OperatorSummarySchema.parse(summary)).not.toThrow()
      }
      for (const detail of details) {
        expect(() => OperatorDetailSchema.parse(detail)).not.toThrow()
      }
    })
  })

  describe('Real generated files validation', () => {
    const indexPath = path.resolve(process.cwd(), 'data/operators-index.json')
    const metaPath = path.resolve(process.cwd(), 'data/meta.json')

    it('validates generated operators-index.json structure', () => {
      if (!fs.existsSync(indexPath)) return

      const raw = fs.readFileSync(indexPath, 'utf-8')
      const index = JSON.parse(raw) as unknown[]

      expect(Array.isArray(index)).toBe(true)
      expect(index.length).toBeGreaterThan(400)

      // Validate every item in index
      for (const item of index) {
        const result = OperatorSummarySchema.safeParse(item)
        expect(result.success).toBe(true)
      }
    })

    it('validates generated meta.json structure', () => {
      if (!fs.existsSync(metaPath)) return

      const raw = fs.readFileSync(metaPath, 'utf-8')
      const meta = JSON.parse(raw)

      const result = DataMetaSchema.safeParse(meta)
      expect(result.success).toBe(true)
      expect(meta.totalOperators).toBeGreaterThan(400)
    })

    it('validates sample operator detail files', () => {
      const texasPath = path.resolve(process.cwd(), 'data/operators/char_102_texas.json')
      if (!fs.existsSync(texasPath)) return

      const raw = fs.readFileSync(texasPath, 'utf-8')
      const texas = JSON.parse(raw)

      const result = OperatorDetailSchema.safeParse(texas)
      expect(result.success).toBe(true)
      expect(texas.name.en).toBe('Texas')
      expect(texas.rarity).toBe(5)
    })
  })
})
