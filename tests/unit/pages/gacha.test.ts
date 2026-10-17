import { describe, it, expect, beforeEach } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { setActivePinia, createPinia } from 'pinia'
import GachaPage from '~/pages/gacha.vue'

describe('GachaPage', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders page header with module code GCH-02 and title', async () => {
    const wrapper = await mountSuspended(GachaPage)
    expect(wrapper.text()).toContain('GCH-02')
    expect(wrapper.text()).toContain('Banners')
    expect(wrapper.find('.gacha-page__disclaimer').text()).toContain('Global dates are estimates')
  })

  it('renders date switcher, type filter buttons, and calculator', async () => {
    const wrapper = await mountSuspended(GachaPage)

    // Segmented date options
    expect(wrapper.find('.gacha-page__date-switcher').exists()).toBe(true)

    // Filter buttons
    const filterBtns = wrapper.findAll('.gacha-page__filter-btn')
    expect(filterBtns.length).toBe(4) // All, Standard, Limited, Joint Operation

    // Calculator section exists
    expect(wrapper.find('.gacha-page__calculator-section').exists()).toBe(true)

    // Banner cards are rendered
    const bannerCards = wrapper.findAllComponents({ name: 'GachaBannerCard' })
    expect(bannerCards.length).toBeGreaterThan(0)
  })

  it('filters banners when a filter button is clicked', async () => {
    const wrapper = await mountSuspended(GachaPage)
    const filterBtns = wrapper.findAll('.gacha-page__filter-btn')

    // Find the 'Limited' button (index 2)
    const limitedBtn = filterBtns[2]
    expect(limitedBtn).toBeDefined()
    await limitedBtn!.trigger('click')

    const bannerCards = wrapper.findAllComponents({ name: 'GachaBannerCard' })
    // All displayed banner cards should be limited
    for (const card of bannerCards) {
      expect(card.props('banner').type).toBe('limited')
    }
  })

  it('toggles calculator visibility when calculator toggle button is clicked', async () => {
    const wrapper = await mountSuspended(GachaPage)
    expect(wrapper.find('.gacha-page__calculator-section').exists()).toBe(true)

    const toggleBtn = wrapper.find('.gacha-page__calc-toggle')
    await toggleBtn.trigger('click')

    expect(wrapper.find('.gacha-page__calculator-section').exists()).toBe(false)
  })
})
