import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { formatBannerDateRange } from '../../../shared/utils/gacha'
import IndexPage from '../../../app/pages/index.vue'

const MS_DAY = 86_400_000
const LAG_DAYS = 163

function isoDate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10)
}

function utcMidnight(ms: number): number {
  return Math.floor(ms / MS_DAY) * MS_DAY
}

/** Builds a CN banner whose estimated Global start is `estimatedStartMs`. */
function makeUpcomingBanner(id: string, title: string, estimatedStartMs: number) {
  const cnStartMs = estimatedStartMs - LAG_DAYS * MS_DAY
  return {
    id,
    server: 'cn',
    ruleType: 'SPECIAL',
    type: 'standard',
    tag: 'SPECIAL',
    name: { en: title, zh: title },
    title: { en: title, zh: title },
    openTime: Math.floor(cnStartMs / 1000),
    endTime: Math.floor((cnStartMs + 14 * MS_DAY - 1) / 1000),
    durationDays: 14,
    isActive: false,
    cnStartDate: isoDate(cnStartMs).replace(/-/g, '/'),
    cnEndDate: isoDate(cnStartMs + 13 * MS_DAY).replace(/-/g, '/'),
    rateUp6: [],
    rateUp5: [],
  }
}

const mockGachaData = ref({
  currentBanner: null,
  currentEnBannerId: null,
  currentEnFullBanner: null,
  globalLagDays: LAG_DAYS,
  upcomingBanners: [] as ReturnType<typeof makeUpcomingBanner>[],
})

mockNuxtImport('useGachaPageData', () => () => ({
  data: mockGachaData,
  status: ref('success'),
  refresh: vi.fn(),
}))

describe('IndexPage nextBannerInfo', () => {
  beforeEach(async () => {
    mockGachaData.value.upcomingBanners = []
    mockGachaData.value.currentEnFullBanner = null
    const { useBannerPulls } = await import('~/composables/useBannerPulls')
    useBannerPulls().setPulls({})
  })

  it('projects the Global window for the next banner from the CN date and lag', async () => {
    const startMs = utcMidnight(Date.now() + 30 * MS_DAY)
    mockGachaData.value.upcomingBanners = [makeUpcomingBanner('A', 'Orienteering #7', startMs)]

    const wrapper = await mountSuspended(IndexPage)
    const desc = wrapper.find('.dashboard-page__widget-desc').text()

    expect(desc).toContain('Orienteering #7')
    expect(desc).toContain(formatBannerDateRange(isoDate(startMs), isoDate(startMs + 14 * MS_DAY)))

    const days = Number(wrapper.findAll('.dashboard-page__countdown-num')[0]?.text())
    expect(days).toBeGreaterThanOrEqual(28)
    expect(days).toBeLessThanOrEqual(30)
  })

  it('skips a banner whose estimated Global start already passed instead of showing a zero timer', async () => {
    const liveStartMs = utcMidnight(Date.now() - 5 * MS_DAY)
    const nextStartMs = utcMidnight(Date.now() + 10 * MS_DAY)
    mockGachaData.value.upcomingBanners = [
      makeUpcomingBanner('LIVE', 'Hunters of the Umbral Wilds', liveStartMs),
      makeUpcomingBanner('NEXT', 'Next Global Pool', nextStartMs),
    ]

    const wrapper = await mountSuspended(IndexPage)
    const desc = wrapper.find('.dashboard-page__widget-desc').text()

    // The live banner is the current one, not the "next" one with a dead countdown.
    expect(desc).toContain('Next Global Pool')
    expect(desc).not.toContain('Hunters of the Umbral Wilds')

    const days = Number(wrapper.findAll('.dashboard-page__countdown-num')[0]?.text())
    expect(days).toBeGreaterThanOrEqual(8)
    expect(wrapper.text()).not.toContain('STARTS TODAY')
  })

  it('counts pulls for an active collab banner from the synced pool counter (goal 120)', async () => {
    const { useBannerPulls } = await import('~/composables/useBannerPulls')
    useBannerPulls().setPulls({ LINKAGE_TEST_POOL: 10 })

    mockGachaData.value.currentEnFullBanner = {
      id: 'LINKAGE_TEST_POOL',
      server: 'en',
      ruleType: 'LINKAGE',
      type: 'limited',
      tag: 'LINKAGE',
      name: { en: 'Hunters of the Umbral Wilds', zh: 'Hunters of the Umbral Wilds' },
      title: { en: 'Hunters of the Umbral Wilds', zh: 'Hunters of the Umbral Wilds' },
      openTime: Math.floor(Date.now() / 1000) - 86_400,
      endTime: Math.floor(Date.now() / 1000) + 5 * 86_400,
      durationDays: 15,
      isActive: true,
      lmtgsid: null,
      rateUp6: [],
      rateUp5: [],
      secondaryRateUp6: [],
    }

    const wrapper = await mountSuspended(IndexPage)
    const spark = wrapper
      .findAll('.dashboard-page__stat-val')
      .find((element) => element.text().includes('/ 120'))

    expect(spark?.text()).toBe('10 / 120')
  })

  it('does NOT count spark from an ended limited banner even if old coins exist in depot', async () => {
    const { useDepotStore } = await import('~/stores/depot')
    const depot = useDepotStore()
    await depot.setItemCount('LMTGS_COIN_7301', 24)

    // Banner ended on Oct 28
    mockGachaData.value.currentEnFullBanner = {
      id: 'LIMITED_EN_42_0_1',
      server: 'en',
      ruleType: 'LIMITED',
      type: 'limited',
      tag: 'LIMITED',
      name: { en: 'Sealed With Time', zh: 'Sealed With Time' },
      title: { en: 'Sealed With Time', zh: 'Sealed With Time' },
      openTime: 1791979200,
      endTime: 1793185199,
      openIso: '2026-10-14T12:00:00.000Z',
      endIso: '2026-10-28T10:59:59.000Z',
      durationDays: 14,
      isActive: false,
      lmtgsid: 'LMTGS_COIN_7301',
      rateUp6: [],
      rateUp5: [],
      secondaryRateUp6: [],
    }

    const wrapper = await mountSuspended(IndexPage)
    const stats = wrapper.findAll('.dashboard-page__stat-val')
    // SPARK stat value should be 0 / 300, NOT 24 / 300
    const sparkStat = stats.find((s) => s.text().includes('/ 300'))
    expect(sparkStat?.text()).toBe('0 / 300')
  })

  it('correctly counts spark when limited banner is active', async () => {
    const { useDepotStore } = await import('~/stores/depot')
    const depot = useDepotStore()
    await depot.setItemCount('LMTGS_COIN_7601', 45)

    const futureEnd = new Date(Date.now() + 5 * 86400000).toISOString()
    const pastStart = new Date(Date.now() - 5 * 86400000).toISOString()
    mockGachaData.value.currentEnFullBanner = {
      id: 'LIMITED_EN_43_0_1',
      server: 'en',
      ruleType: 'LIMITED',
      type: 'limited',
      tag: 'LIMITED',
      name: { en: 'Active Limited', zh: 'Active Limited' },
      title: { en: 'Active Limited', zh: 'Active Limited' },
      openTime: Math.floor(Date.now() / 1000) - 5 * 86400,
      endTime: Math.floor(Date.now() / 1000) + 5 * 86400,
      openIso: pastStart,
      endIso: futureEnd,
      durationDays: 10,
      isActive: true,
      lmtgsid: 'LMTGS_COIN_7601',
      rateUp6: [],
      rateUp5: [],
      secondaryRateUp6: [],
    }

    const wrapper = await mountSuspended(IndexPage)
    const stats = wrapper.findAll('.dashboard-page__stat-val')
    const sparkStat = stats.find((s) => s.text().includes('/ 300'))
    expect(sparkStat?.text()).toBe('45 / 300')
  })
})
