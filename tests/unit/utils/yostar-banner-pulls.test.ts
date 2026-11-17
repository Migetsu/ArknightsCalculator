import { describe, expect, it } from 'vitest'
import { mapYostarSync } from '../../../shared/utils/yostar'

/**
 * Collab (LINKAGE) pools have no spark coin, so the raw per-pool pull counter is
 * the only way the dashboard can show progress toward the 120-pull guarantee.
 */
describe('mapYostarSync banner pulls', () => {
  it('captures per-pool pull counters without a spark coin', () => {
    const result = mapYostarSync(
      {
        status: { nickName: 'Doctor', level: 100 },
        troop: { chars: {} },
        inventory: {},
        gacha: {
          limit: { LINKAGE_EN_42_0_5: { poolCnt: 10 } },
          lmtgs: {},
        },
      },
      {
        knownOperatorIds: new Set<string>(),
        knownItemIds: new Set<string>(),
        bannerToLmtgsid: new Map<string, string>(),
      },
    )

    expect(result.bannerPulls).toEqual({ LINKAGE_EN_42_0_5: 10 })
    expect(result.depot.items).toEqual({})
  })

  it('keeps the highest counter when a pool appears in several sections', () => {
    const result = mapYostarSync(
      {
        status: { nickName: 'Doctor', level: 100 },
        troop: { chars: {} },
        inventory: {},
        gacha: {
          limit: { LIMITED_EN_42_0_1: { poolCnt: 20 } },
          lmtgs: { LIMITED_EN_42_0_1: { poolCnt: 25 } },
        },
      },
      {
        knownOperatorIds: new Set<string>(),
        knownItemIds: new Set<string>(),
        bannerToLmtgsid: new Map<string, string>(),
      },
    )

    expect(result.bannerPulls['LIMITED_EN_42_0_1']).toBe(25)
  })
})
