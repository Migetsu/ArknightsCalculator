import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import type { OperatorDetail } from '../../../../shared/schemas/operator'
import {
  calculateOperatorStats,
  parsePotentialModifier,
} from '../../../../shared/utils/stats/calculateStats'

function loadOperatorDetail(id: string): OperatorDetail {
  const filePath = path.resolve(process.cwd(), `data/operators/${id}.json`)
  const raw = fs.readFileSync(filePath, 'utf-8')
  return JSON.parse(raw) as OperatorDetail
}

describe('Operator Stats Calculation Core (shared/utils/stats)', () => {
  const silverAsh = loadOperatorDetail('char_172_svrash')
  const eyjafjalla = loadOperatorDetail('char_180_amgoat')
  const kaltsit = loadOperatorDetail('char_003_kalts')
  const myrtle = loadOperatorDetail('char_151_myrtle')
  const texas = loadOperatorDetail('char_102_texas')

  describe('parsePotentialModifier', () => {
    it('correctly parses English and Chinese potential stat bonuses', () => {
      expect(parsePotentialModifier('ATK +26', '攻击力+26')).toEqual({ atk: 26 })
      expect(parsePotentialModifier('DP Cost -1', '部署费用-1')).toEqual({ cost: -1 })
      expect(parsePotentialModifier('DEF +22', '防御力+22')).toEqual({ def: 22 })
      expect(parsePotentialModifier('Max HP +180', '生命上限+180')).toEqual({ hp: 180 })
      expect(parsePotentialModifier('Redeployment Time -4 sec', '再部署时间-4秒')).toEqual({
        respawnTime: -4,
      })
      expect(parsePotentialModifier('RES +5', '法术抗性+5')).toEqual({ res: 5 })
      expect(parsePotentialModifier('ASPD +8', '攻击速度+8')).toEqual({ attackSpeed: 8 })
      expect(parsePotentialModifier('Attack Speed +5', '攻击速度+5')).toEqual({ attackSpeed: 5 })
    })

    it('returns empty object for talent enhancements', () => {
      expect(parsePotentialModifier('Improves First Talent', '第一天赋效果增强')).toEqual({})
    })
  })

  describe('Validation & Boundary Limits', () => {
    it('throws when elite phase exceeds operator maximum (e.g. 1* or 3* without E2)', () => {
      const lancet2 = loadOperatorDetail('char_285_medic2')
      const fang = loadOperatorDetail('char_123_fang')

      // Lancet-2 (1*) only has phase 0
      expect(() =>
        calculateOperatorStats(lancet2, {
          elite: 1,
          level: 1,
        }),
      ).toThrow(/Invalid elite phase 1 for operator char_285_medic2 \(max phase: 0\)/)

      // Fang (3*) only has phase 0 and phase 1 (no E2)
      expect(() =>
        calculateOperatorStats(fang, {
          elite: 2,
          level: 1,
        }),
      ).toThrow(/Invalid elite phase 2 for operator char_123_fang \(max phase: 1\)/)
    })

    it('throws when level exceeds phase maxLevel instead of silently clamping', () => {
      const fang = loadOperatorDetail('char_123_fang')
      // Fang E0 maxLevel is 40
      expect(() =>
        calculateOperatorStats(fang, {
          elite: 0,
          level: 41,
        }),
      ).toThrow(
        /Invalid level 41 for operator char_123_fang at elite 0 \(must be between 1 and 40\)/,
      )

      // Fang E1 maxLevel is 55
      expect(() =>
        calculateOperatorStats(fang, {
          elite: 1,
          level: 56,
        }),
      ).toThrow(
        /Invalid level 56 for operator char_123_fang at elite 1 \(must be between 1 and 55\)/,
      )
    })

    it('throws when level is below 1 or above maxLevel for the phase', () => {
      // SilverAsh Elite 2 max level is 90
      expect(() =>
        calculateOperatorStats(silverAsh, {
          elite: 2,
          level: 0,
        }),
      ).toThrow()

      expect(() =>
        calculateOperatorStats(silverAsh, {
          elite: 2,
          level: 91,
        }),
      ).toThrow(/Invalid level 91/)
    })

    it('throws when requested module does not exist on operator', () => {
      expect(() =>
        calculateOperatorStats(silverAsh, {
          elite: 2,
          level: 90,
          module: {
            id: 'non_existent_module',
            stage: 1,
          },
        }),
      ).toThrow(/Module 'non_existent_module' not found/)
    })
  })

  describe('Interpolation & Monotonicity', () => {
    it('ensures stats increase monotonically with level in each elite phase', () => {
      let prevHp = 0
      let prevAtk = 0
      let prevDef = 0

      for (let lvl = 1; lvl <= 90; lvl += 10) {
        const stats = calculateOperatorStats(silverAsh, {
          elite: 2,
          level: lvl,
          trust: 0,
          potential: 1,
        })

        expect(stats.hp).toBeGreaterThanOrEqual(prevHp)
        expect(stats.atk).toBeGreaterThanOrEqual(prevAtk)
        expect(stats.def).toBeGreaterThanOrEqual(prevDef)

        prevHp = stats.hp
        prevAtk = stats.atk
        prevDef = stats.def
      }
    })
  })

  describe('Benchmark Operators Verification', () => {
    it('Benchmark 1: SilverAsh (char_172_svrash) - 6* Guard', () => {
      // 1. Elite 0 Level 1 (raw baseline)
      const e0l1 = calculateOperatorStats(silverAsh, { elite: 0, level: 1, trust: 0, potential: 1 })
      expect(e0l1.hp).toBe(1075)
      expect(e0l1.atk).toBe(297)
      expect(e0l1.def).toBe(189)
      expect(e0l1.res).toBe(5)
      expect(e0l1.cost).toBe(18)
      expect(e0l1.block).toBe(2)
      expect(e0l1.baseAttackTime).toBe(1.3)
      expect(e0l1.respawnTime).toBe(70)

      // 2. Elite 2 Level 90 (no trust, potential 1)
      const e2l90Base = calculateOperatorStats(silverAsh, {
        elite: 2,
        level: 90,
        trust: 0,
        potential: 1,
      })
      expect(e2l90Base.hp).toBe(2560)
      expect(e2l90Base.atk).toBe(713)
      expect(e2l90Base.def).toBe(397)

      // 3. Elite 2 Level 90 with 100% Trust (ATK +50, DEF +50)
      const e2l90Trust = calculateOperatorStats(silverAsh, {
        elite: 2,
        level: 90,
        trust: 100,
        potential: 1,
      })
      expect(e2l90Trust.atk).toBe(763) // 713 + 50
      expect(e2l90Trust.def).toBe(447) // 397 + 50
      expect(e2l90Trust.breakdown.trust.atk).toBe(50)
      expect(e2l90Trust.breakdown.trust.def).toBe(50)

      // 4. Elite 2 Level 90, 100% Trust, Potential 6 (Cost -2, Respawn -4s, ATK +26)
      const e2l90Pot6 = calculateOperatorStats(silverAsh, {
        elite: 2,
        level: 90,
        trust: 100,
        potential: 6,
      })
      expect(e2l90Pot6.atk).toBe(789) // 713 + 50 + 26
      expect(e2l90Pot6.cost).toBe(18) // 20 base - 2 pot
      expect(e2l90Pot6.respawnTime).toBe(66) // 70 base - 4s pot

      // 5. Elite 2 Level 90, 100% Trust, Potential 6, Module Stage 3 (HP +330, ATK +70)
      const e2l90Max = calculateOperatorStats(silverAsh, {
        elite: 2,
        level: 90,
        trust: 100,
        potential: 6,
        module: {
          id: 'uniequip_002_svrash',
          stage: 3,
        },
      })
      expect(e2l90Max.hp).toBe(2890) // 2560 + 330
      expect(e2l90Max.atk).toBe(859) // 713 + 50 + 26 + 70
      expect(e2l90Max.def).toBe(447) // 397 + 50
      expect(e2l90Max.cost).toBe(18)
      expect(e2l90Max.respawnTime).toBe(66)
    })

    it('Benchmark 2: Eyjafjalla (char_180_amgoat) - 6* Caster', () => {
      // Elite 2 Level 90, Trust 100 (ATK +90), Pot 6 (Cost -2, ATK +27), Module Stage 3 (+180 HP, +65 ATK)
      const maxEyja = calculateOperatorStats(eyjafjalla, {
        elite: 2,
        level: 90,
        trust: 100,
        potential: 6,
        module: {
          id: 'uniequip_002_amgoat',
          stage: 3,
        },
      })
      expect(maxEyja.hp).toBe(1923) // 1743 + 180
      expect(maxEyja.atk).toBe(827) // 645 + 90 + 27 + 65
      expect(maxEyja.def).toBe(122)
      expect(maxEyja.res).toBe(20)
      expect(maxEyja.cost).toBe(19) // 21 - 2
    })

    it('Benchmark 3: Kaltsit (char_003_kalts) - 6* Medic', () => {
      // Elite 2 Level 90, Trust 100 (HP +400, DEF +40), Module uniequip_002_kalts Stage 3 (ATK +60, DEF +25)
      const maxKal = calculateOperatorStats(kaltsit, {
        elite: 2,
        level: 90,
        trust: 100,
        potential: 1,
        module: {
          id: 'uniequip_002_kalts',
          stage: 3,
        },
      })
      expect(maxKal.hp).toBe(2033) // 1633 + 400
      expect(maxKal.atk).toBe(550) // 490 + 60
      expect(maxKal.def).toBe(280) // 215 + 40 + 25
      expect(maxKal.baseAttackTime).toBe(2.85)
    })

    it('Benchmark 4: Myrtle (char_151_myrtle) - 4* Vanguard', () => {
      // Elite 2 Level 70 (max level for 4*), Trust 100 (DEF +50), Pot 6 (Cost -2, Respawn -4s, DEF +22)
      // Module uniequip_002_myrtle Stage 3 (HP +150, DEF +35)
      const maxMyrtle = calculateOperatorStats(myrtle, {
        elite: 2,
        level: 70,
        trust: 100,
        potential: 6,
        module: {
          id: 'uniequip_002_myrtle',
          stage: 3,
        },
      })
      expect(maxMyrtle.hp).toBe(1715) // 1565 + 150
      expect(maxMyrtle.atk).toBe(520)
      expect(maxMyrtle.def).toBe(407) // 300 + 50 + 22 + 35
      expect(maxMyrtle.cost).toBe(8) // 10 - 2
      expect(maxMyrtle.respawnTime).toBe(66) // 70 - 4
    })

    it('Benchmark 5: Texas (char_102_texas) - 5* Vanguard', () => {
      // Elite 2 Level 80 (max level for 5*), Trust 100 (ATK +70), Module Stage 3 (HP +155, ATK +42, DEF +22)
      const maxTexas = calculateOperatorStats(texas, {
        elite: 2,
        level: 80,
        trust: 100,
        potential: 1,
        module: {
          id: 'uniequip_002_texas',
          stage: 3,
        },
      })
      expect(maxTexas.hp).toBe(2105) // 1950 + 155
      expect(maxTexas.atk).toBe(612) // 500 + 70 + 42
      expect(maxTexas.def).toBe(365) // 343 + 22
      expect(maxTexas.baseAttackTime).toBe(1.05)
      expect(maxTexas.attackInterval).toBe(1.05)
      expect(maxTexas.attackSpeed).toBe(0)
    })

    it('calculates effective attack interval with ASPD buff from potential or module', () => {
      // Lava (char_121_lava) Pot 5 has ASPD +8
      const lava = loadOperatorDetail('char_121_lava')
      const lavaPot1 = calculateOperatorStats(lava, {
        elite: 0,
        level: 1,
        potential: 1,
      })
      expect(lavaPot1.baseAttackTime).toBe(2.9)
      expect(lavaPot1.attackSpeed).toBe(0)
      expect(lavaPot1.attackInterval).toBe(2.9)

      // Pot 5 unlocks ASPD +8: 2.9 * 100 / (100 + 8) = 290 / 108 = 2.685s
      const lavaPot5 = calculateOperatorStats(lava, {
        elite: 0,
        level: 1,
        potential: 5,
      })
      expect(lavaPot5.baseAttackTime).toBe(2.9)
      expect(lavaPot5.attackSpeed).toBe(8)
      expect(lavaPot5.attackInterval).toBe(2.685)
      expect(lavaPot5.breakdown.potential.attackSpeed).toBe(8)

      // Ch'en (char_010_chen) with module uniequip_002_chen stage 1 adds attack_speed +5
      const chen = loadOperatorDetail('char_010_chen')
      const chenMod = calculateOperatorStats(chen, {
        elite: 2,
        level: 90,
        potential: 1,
        module: {
          id: 'uniequip_002_chen',
          stage: 1,
        },
      })
      // Ch'en baseAttackTime = 1.3s; 1.3 * 100 / 105 = 1.238s
      expect(chenMod.baseAttackTime).toBe(1.3)
      expect(chenMod.attackSpeed).toBe(5)
      expect(chenMod.attackInterval).toBe(1.238)
      expect(chenMod.breakdown.module.attackSpeed).toBe(5)
    })
  })
})
