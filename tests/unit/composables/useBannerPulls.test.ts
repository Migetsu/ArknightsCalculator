import { describe, expect, it, beforeEach } from 'vitest'
import { BANNER_PULLS_STORAGE_KEY, useBannerPulls } from '../../../app/composables/useBannerPulls'

describe('useBannerPulls', () => {
  beforeEach(() => {
    window.localStorage.clear()
    useBannerPulls().setPulls({})
  })

  it('normalizes and persists per-pool counters, dropping invalid values', () => {
    const { pulls, setPulls } = useBannerPulls()
    setPulls({ LINKAGE_EN_42_0_5: 10, OTHER: 0, NEGATIVE: -3, FLOAT: 2.9 })

    expect(pulls.value).toEqual({ LINKAGE_EN_42_0_5: 10, FLOAT: 2 })
    expect(JSON.parse(window.localStorage.getItem(BANNER_PULLS_STORAGE_KEY) ?? '{}')).toEqual({
      LINKAGE_EN_42_0_5: 10,
      FLOAT: 2,
    })
  })

  it('returns the same reactive record to every caller', () => {
    const first = useBannerPulls()
    const second = useBannerPulls()
    first.setPulls({ POOL: 7 })

    expect(second.pulls.value).toEqual({ POOL: 7 })
  })
})
