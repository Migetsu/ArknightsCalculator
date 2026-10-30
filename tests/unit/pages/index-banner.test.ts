import { describe, it, expect, vi } from 'vitest'
import { ref } from 'vue'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import IndexPage from '../../../app/pages/index.vue'

const mockGachaData = ref({
  currentBanner: null,
  currentEnBannerId: null,
  currentEnFullBanner: null,
  globalLagDays: 163,
  upcomingBanners: [
    {
      id: 'SPECIAL_73_0_3',
      server: 'cn',
      ruleType: 'SPECIAL',
      type: 'standard',
      tag: 'SPECIAL',
      name: { en: 'Orienteering #7', zh: '定向甄选' },
      title: { en: 'Orienteering #7', zh: '定向甄选' },
      openTime: 1778832000,
      endTime: 1779998399,
      durationDays: 14,
      isActive: false,
      cnStartDate: '2026/05/15',
      cnEndDate: '2026/05/29',
      rateUp6: [],
      rateUp5: [],
    },
  ],
})

mockNuxtImport('useGachaPageData', () => () => ({
  data: mockGachaData,
  status: ref('success'),
  refresh: vi.fn(),
}))

describe('IndexPage nextBannerInfo', () => {
  it('projects future end date correctly instead of falling back to cnEndDate', async () => {
    const wrapper = await mountSuspended(IndexPage)
    const desc = wrapper.find('.dashboard-page__widget-desc').text()

    // Title should be Orienteering #7
    expect(desc).toContain('Orienteering #7')
    // Should NOT contain May 28 or May 29 (which would be backwards!)
    expect(desc).not.toContain('May')
    // Should contain Oct 25 and Nov (start + 14 days)
    expect(desc).toMatch(/Oct 25, 2026 – Nov \d+, 2026/)
  })

  it('shows startsToday badge and 0 days countdown when estimated date has arrived', async () => {
    const wrapper = await mountSuspended(IndexPage)
    // Should NOT show 24 days!
    const daysNum = wrapper.findAll('.dashboard-page__countdown-num')[0]?.text()
    expect(daysNum).toBe('00')

    // STARTS TODAY badge should be visible
    expect(wrapper.text()).toContain('STARTS TODAY')
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
