import { describe, it, expect, beforeEach } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { setActivePinia, createPinia } from 'pinia'
import GachaPage from '~/pages/gacha.vue'
import GachaBannerCard from '~/components/gacha/GachaBannerCard.vue'

describe('GachaPage', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders page header with module code GCH-02 and title', async () => {
    const wrapper = await mountSuspended(GachaPage)
    expect(wrapper.text()).toContain('GCH-02')
    expect(wrapper.text()).toContain('Banners')
    expect(wrapper.find('.gacha-page__disclaimer').text()).toContain(
      'Global dates reflect official Global',
    )
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

  it('renders current Global EN banner from meta with name and end date', async () => {
    const wrapper = await mountSuspended(GachaPage)

    const currentEnCard = wrapper.find('.gacha-current-en')
    expect(currentEnCard.exists()).toBe(true)
    expect(currentEnCard.text()).toContain('Sealed With Time')
    expect(currentEnCard.text()).toContain('2026-10-28')
    expect(currentEnCard.text()).toContain('LIMITED')
    expect(currentEnCard.text()).toContain('ACTIVE NOW')
  })

  it('renders CN archive sorted chronologically ascending by openTime', async () => {
    const wrapper = await mountSuspended(GachaPage)

    const bannerCards = wrapper.findAllComponents(GachaBannerCard)
    expect(bannerCards.length).toBeGreaterThan(0)

    // First banner in CN archive is the earliest beta/launch banner NORM_0_1_1
    const firstBanner = bannerCards[0]!.props('banner')
    expect(firstBanner.id).toBe('NORM_0_1_1')
    expect(firstBanner.openTime).toBe(1548727200)

    // Verify ascending order
    for (let i = 0; i < bannerCards.length - 1; i++) {
      const curr = bannerCards[i]!.props('banner')
      const next = bannerCards[i + 1]!.props('banner')
      expect(curr.openTime).toBeLessThanOrEqual(next.openTime)
    }
  })

  it('limits initial rendered cards to 20 (chunked) and loads more on button click', async () => {
    const wrapper = await mountSuspended(GachaPage)

    // Initial chunk is strictly 20 items (not all 453 cards rendered on mount)
    const initialCards = wrapper.findAllComponents(GachaBannerCard)
    expect(initialCards.length).toBe(20)

    expect(wrapper.find('.gacha-page__pagination-summary').text()).toContain(
      'Showing 20 of 453 banners',
    )

    // Click "Show More"
    const buttons = wrapper.findAll('.gacha-page__pagination-actions button')
    const showMoreBtn = buttons[0]
    expect(showMoreBtn).toBeDefined()
    await showMoreBtn!.trigger('click')

    const updatedCards = wrapper.findAllComponents(GachaBannerCard)
    expect(updatedCards.length).toBe(40)
  })

  it('filters banners when a filter button is clicked and resets pagination', async () => {
    const wrapper = await mountSuspended(GachaPage)
    const filterBtns = wrapper.findAll('.gacha-page__filter-btn')

    // Find the 'Limited' button (index 2)
    const limitedBtn = filterBtns[2]
    expect(limitedBtn).toBeDefined()
    await limitedBtn!.trigger('click')

    const bannerCards = wrapper.findAllComponents(GachaBannerCard)
    expect(bannerCards.length).toBeGreaterThan(0)
    for (const card of bannerCards) {
      expect(card.props('banner').type).toBe('limited')
    }
  })

  it('marks active CN banner with active status', async () => {
    const wrapper = await mountSuspended(GachaPage)

    // Load all to search through all CN banners
    const buttons = wrapper.findAll('.gacha-page__pagination-actions button')
    const showAllBtn = buttons[1]
    expect(showAllBtn).toBeDefined()
    await showAllBtn!.trigger('click')

    const bannerCards = wrapper.findAllComponents(GachaBannerCard)
    const activeCnCard = bannerCards.find((c) => c.props('banner').id === 'DOUBLE_77_0_5')
    expect(activeCnCard).toBeDefined()
    expect(activeCnCard!.classes()).toContain('gacha-banner--active')
    expect(activeCnCard!.text()).toContain('ACTIVE NOW')
  }, 20000)

  it('marks ONLY LIMITED_76_0_1 with "NOT ON GLOBAL YET" badge', async () => {
    const wrapper = await mountSuspended(GachaPage)

    // Load all to examine all CN banners
    const buttons = wrapper.findAll('.gacha-page__pagination-actions button')
    const showAllBtn = buttons[1]
    await showAllBtn!.trigger('click')

    const bannerCards = wrapper.findAllComponents(GachaBannerCard)

    // Exactly one card should have the badge: LIMITED_76_0_1
    const cardsWithNotOnEn = bannerCards.filter((card) =>
      card.find('.gacha-banner__countdown-badge--not-on-en').exists(),
    )

    expect(cardsWithNotOnEn.length).toBe(1)
    expect(cardsWithNotOnEn[0]!.props('banner').id).toBe('LIMITED_76_0_1')

    // Check that standard banners with null pairedBannerId do NOT have this badge
    const normalCards = bannerCards.filter((card) => card.props('banner').ruleType === 'NORMAL')
    for (const card of normalCards) {
      expect(card.find('.gacha-banner__countdown-badge--not-on-en').exists()).toBe(false)
    }
  }, 20000)

  it('toggles calculator visibility when calculator toggle button is clicked', async () => {
    const wrapper = await mountSuspended(GachaPage)
    expect(wrapper.find('.gacha-page__calculator-section').exists()).toBe(true)

    const toggleBtn = wrapper.find('.gacha-page__calc-toggle')
    await toggleBtn.trigger('click')

    expect(wrapper.find('.gacha-page__calculator-section').exists()).toBe(false)
  })
})
