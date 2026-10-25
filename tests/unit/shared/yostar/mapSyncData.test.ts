import { describe, it, expect } from 'vitest'
import { mapYostarSync, YOSTAR_CURRENCY_ITEM_IDS } from '../../../../shared/utils/yostar'
import type { YostarMapContext } from '../../../../shared/utils/yostar'

const ctx: YostarMapContext = {
  knownOperatorIds: new Set(['char_003_kalts', 'char_002_amiya']),
  knownItemIds: new Set(['30012', '30115', 'mod_unlock_token', 'exp_2']),
}

const fullUser = {
  status: {
    nickName: 'Doctor',
    level: 108,
    gold: 1234567,
    diamondShard: 4200,
    payDiamond: 3,
    freeDiamond: 12,
  },
  troop: {
    chars: {
      1: {
        charId: 'char_003_kalts',
        level: 90,
        evolvePhase: 2,
        mainSkillLvl: 7,
        potentialRank: 4,
        favorPoint: 150,
        skills: [
          { skillId: 'skchr_kalts_2', unlock: 1, specializeLevel: 3 },
          { skillId: 'skchr_kalts_3', unlock: 0, specializeLevel: 0 },
        ],
        equip: {
          uniequip_002_kalts: { level: 3, locked: 0, hide: 0 },
          uniequip_001_kalts: { level: 0, locked: 0, hide: 0 },
          uniequip_003_kalts: { level: 2, locked: 1, hide: 0 },
        },
      },
      2: {
        charId: 'char_002_amiya',
        level: 1,
        evolvePhase: 0,
        mainSkillLvl: 1,
        potentialRank: 0,
        favorPoint: 0,
        skills: [],
        equip: {},
      },
    },
  },
  inventory: {
    '30012': 7,
    '30115': 0,
    '4001': 1234567,
    '4002': 4200,
    '4003': 15,
    '99999': 4,
    exp_2: 30,
  },
}

describe('mapYostarSync', () => {
  it('maps doctor, roster, currencies and depot items', () => {
    const result = mapYostarSync(fullUser, ctx)

    expect(result.doctor).toEqual({ name: 'Doctor', level: 108, server: 'en' })
    expect(result.operators).toHaveLength(2)
    expect(result.operators[0]).toEqual({
      charId: 'char_003_kalts',
      elite: 2,
      level: 90,
      skillLevel: 7,
      potential: 4,
      favor: 150,
      skills: { skchr_kalts_2: 3 },
      modules: { uniequip_002_kalts: 3 },
    })
    expect(result.depot.currencies).toEqual({ lmd: 1234567, orundum: 4200, originitePrime: 15 })
    expect(result.depot.items).toEqual({ '30012': 7, exp_2: 30 })
    expect(result.unknownOperatorIds).toEqual([])
    expect(result.unknownItemCount).toBe(1)
    expect(result.skippedEntries).toBe(0)
    expect(Number.isNaN(Date.parse(result.syncedAt))).toBe(false)
  })

  it('drops currency pseudo-items from the depot item map', () => {
    const result = mapYostarSync(fullUser, ctx)
    for (const id of YOSTAR_CURRENCY_ITEM_IDS) {
      expect(result.depot.items[id]).toBeUndefined()
    }
  })

  it('reports operators missing from the local catalog instead of guessing', () => {
    const result = mapYostarSync(
      {
        troop: {
          chars: {
            1: { charId: 'char_999_future' },
            2: { charId: 'char_003_kalts', level: 50, evolvePhase: 1 },
          },
        },
      },
      ctx,
    )

    expect(result.unknownOperatorIds).toEqual(['char_999_future'])
    expect(result.operators.map((op) => op.charId)).toEqual(['char_003_kalts'])
  })

  it('clamps out-of-range values into planner-compatible ranges', () => {
    const result = mapYostarSync(
      {
        status: { level: 100000, gold: -5, diamondShard: 1.7, payDiamond: 2.2, freeDiamond: 2.2 },
        troop: {
          chars: {
            1: {
              charId: 'char_002_amiya',
              level: 500,
              evolvePhase: 7,
              mainSkillLvl: 42,
              potentialRank: 99,
              favorPoint: Number.MAX_SAFE_INTEGER,
              skills: [{ skillId: 'skchr_amiya_1', unlock: 1, specializeLevel: 9 }],
              equip: { uniequip_001_amiya: { level: 9, locked: 0 } },
            },
          },
        },
      },
      ctx,
    )

    expect(result.doctor.level).toBe(999)
    expect(result.depot.currencies).toEqual({ lmd: 0, orundum: 1, originitePrime: 4 })
    expect(result.operators[0]).toMatchObject({
      elite: 2,
      level: 90,
      skillLevel: 7,
      potential: 5,
      favor: 1000000,
      skills: { skchr_amiya_1: 3 },
      modules: { uniequip_001_amiya: 3 },
    })
  })

  it('skips malformed entries without throwing', () => {
    const result = mapYostarSync(
      {
        troop: {
          chars: {
            1: 'not-an-object',
            2: null,
            3: { level: 10 },
            4: { charId: 'char_002_amiya', level: 'high', evolvePhase: 'E2' },
          },
        },
        inventory: { '30012': 'many', '30115': 2 },
      },
      ctx,
    )

    expect(result.operators).toHaveLength(1)
    expect(result.operators[0]?.charId).toBe('char_002_amiya')
    expect(result.operators[0]?.level).toBe(1)
    expect(result.skippedEntries).toBe(3)
    expect(result.depot.items).toEqual({ '30115': 2 })
  })

  it('degrades to an empty payload for garbage input', () => {
    for (const garbage of [null, undefined, 42, 'syncData', [], { troop: 'nope' }]) {
      const result = mapYostarSync(garbage, ctx)
      expect(result.operators).toEqual([])
      expect(result.depot.items).toEqual({})
      expect(result.depot.currencies).toEqual({ lmd: 0, orundum: 0, originitePrime: 0 })
      expect(result.doctor).toEqual({ name: '', level: 1, server: 'en' })
    }
  })

  it('ignores inventory entries with non-positive counts', () => {
    const result = mapYostarSync(
      { inventory: { '30012': 0, '30115': -3, mod_unlock_token: 2 } },
      ctx,
    )
    expect(result.depot.items).toEqual({ mod_unlock_token: 2 })
  })

  it('passes headhunting permits through knownItemIds', () => {
    const permitsCtx: YostarMapContext = {
      knownOperatorIds: new Set(),
      knownItemIds: new Set(['7003', '7004']),
    }
    const result = mapYostarSync(
      {
        inventory: {
          '7003': 5,
          '7004': 2,
        },
      },
      permitsCtx,
    )
    expect(result.depot.items).toEqual({ '7003': 5, '7004': 2 })
    expect(result.unknownItemCount).toBe(0)
  })

  it('maps headhunting permits and recruitment licenses from status fields', () => {
    const permitsCtx: YostarMapContext = {
      knownOperatorIds: new Set(),
      knownItemIds: new Set(['7001', '7003', '7004', '30012']),
    }
    const result = mapYostarSync(
      {
        status: {
          nickName: 'Doctor',
          level: 100,
          gold: 500000,
          diamondShard: 6000,
          payDiamond: 10,
          freeDiamond: 20,
          gachaTicket: 15,
          tenGachaTicket: 3,
          recruitLicense: 40,
        },
        inventory: {
          '30012': 5,
        },
      },
      permitsCtx,
    )
    expect(result.depot.items).toEqual({
      '30012': 5,
      '7003': 15,
      '7004': 3,
      '7001': 40,
    })
  })

  it('maps active banner pulls from gacha.limit into commemorative coins (spark progress)', () => {
    const gachaCtx: YostarMapContext = {
      knownOperatorIds: new Set(),
      knownItemIds: new Set(['30012', 'LMTGS_COIN_7301']),
      bannerToLmtgsid: new Map([['LIMITED_EN_42_0_1', 'LMTGS_COIN_7301']]),
    }

    const result = mapYostarSync(
      {
        status: { nickName: 'Doctor', level: 120 },
        troop: { chars: {} },
        inventory: { '30012': 10 },
        gacha: {
          limit: {
            LIMITED_EN_42_0_1: { poolCnt: 22 },
          },
        },
      },
      gachaCtx,
    )

    expect(result.depot.items['LMTGS_COIN_7301']).toBe(22)
    expect(result.depot.items['30012']).toBe(10)
  })

  it('extracts commemorative coins directly if poolId starts with LMTGS_COIN_', () => {
    const gachaCtx: YostarMapContext = {
      knownOperatorIds: new Set(),
      knownItemIds: new Set(),
    }

    const result = mapYostarSync(
      {
        status: { nickName: 'Doctor', level: 120 },
        troop: { chars: {} },
        gacha: {
          limit: {
            LMTGS_COIN_6001: 50,
          },
        },
      },
      gachaCtx,
    )

    expect(result.depot.items['LMTGS_COIN_6001']).toBe(50)
  })
})
