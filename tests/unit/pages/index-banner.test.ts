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
})
