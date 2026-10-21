import { describe, it, expect, beforeEach } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { setActivePinia, createPinia } from 'pinia'
import GachaPage from '~/pages/gacha.vue'
import GachaBannerCard from '~/components/gacha/GachaBannerCard.vue'
import AkAvatar from '~/components/ui/AkAvatar.vue'
import AkEmptyState from '~/components/ui/AkEmptyState.vue'

describe('GachaPage', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders page header with module code GCH-02 and title', async () => {
    const wrapper = await mountSuspended(GachaPage)
    expect(wrapper.text()).toContain('GCH-02')
    expect(wrapper.text()).toContain('Banners')
    expect(wrapper.find('.gacha-page__disclaimer').text()).toContain('EST dates are estimates')
  })

  it('renders date switcher, type filter buttons, and calculator', async () => {
    const wrapper = await mountSuspended(GachaPage)

    expect(wrapper.find('.gacha-page__date-switcher').exists()).toBe(true)

    const filterBtns = wrapper.findAll('.gacha-page__filter-btn')
    expect(filterBtns.length).toBe(4) // All, Standard, Limited, Joint Operation

    expect(wrapper.find('.gacha-page__calculator-section').exists()).toBe(true)
  })

  it('renders the current Global banner with its rate-up roster from the full dataset', async () => {
    const wrapper = await mountSuspended(GachaPage)

    const hero = wrapper.find('.gacha-current-en')
    expect(hero.exists()).toBe(true)
    expect(hero.find('.gacha-current-en__title').text()).toContain('Sealed With Time')

    // 2 rate-up 6★, 3 secondary 6★ and 1 rate-up 5★ for LIMITED_EN_42_0_1
    expect(hero.findAllComponents(AkAvatar)).toHaveLength(6)
    expect(hero.text()).toContain('SECONDARY RATE-UP')
    expect(hero.text()).toContain('5★ OPERATORS')
  })

  it('renders only the 11 upcoming CN banners, without the archive or pagination', async () => {
    const wrapper = await mountSuspended(GachaPage)

    const cards = wrapper.findAllComponents(GachaBannerCard)
    expect(cards).toHaveLength(11)
    expect(wrapper.text()).not.toContain('453')
    expect(wrapper.find('.gacha-page__pagination').exists()).toBe(false)

    const buttonTexts = wrapper.findAll('button').map((button) => button.text())
    expect(buttonTexts.some((text) => text.includes('Show More'))).toBe(false)
    expect(buttonTexts.some((text) => text.includes('Show All'))).toBe(false)
  })

  it('orders upcoming banners from oldest to newest', async () => {
    const wrapper = await mountSuspended(GachaPage)
    const cards = wrapper.findAllComponents(GachaBannerCard)

    expect(cards[0]!.props('banner').id).toBe('SPECIAL_73_0_3')
    expect(cards[cards.length - 1]!.props('banner').id).toBe('SINGLE_78_0_1')

    for (let i = 0; i < cards.length - 1; i++) {
      const current = cards[i]!.props('banner')
      const next = cards[i + 1]!.props('banner')
      expect(current.openTime).toBeLessThanOrEqual(next.openTime)
    }
  })

  it('marks the current CN banner (SINGLE_78_0_1) as active', async () => {
    const wrapper = await mountSuspended(GachaPage)
    const cards = wrapper.findAllComponents(GachaBannerCard)
    const active = cards.find((card) => card.props('banner').id === 'SINGLE_78_0_1')

    expect(active).toBeDefined()
    expect(active!.classes()).toContain('gacha-banner--active')
    expect(active!.text()).toContain('ACTIVE NOW')
  })

  it('marks exactly one banner as NOT ON GLOBAL YET', async () => {
    const wrapper = await mountSuspended(GachaPage)
    const cards = wrapper.findAllComponents(GachaBannerCard)
    const badges = wrapper.findAll('.gacha-banner__countdown-badge--not-on-en')

    expect(badges).toHaveLength(1)

    const limited = cards.find((card) => card.props('banner').id === 'LIMITED_76_0_1')
    expect(limited).toBeDefined()
    expect(limited!.find('.gacha-banner__countdown-badge--not-on-en').exists()).toBe(true)
  })

  it('marks the first upcoming banner with NEXT ON GLOBAL and an EST estimate', async () => {
    const wrapper = await mountSuspended(GachaPage)
    const cards = wrapper.findAllComponents(GachaBannerCard)
    const first = cards[0]!

    expect(wrapper.findAll('.gacha-banner__countdown-badge--next')).toHaveLength(1)
    expect(first.find('.gacha-banner__countdown-badge--next').text()).toBe('NEXT ON GLOBAL')
    expect(first.find('.gacha-banner__est-badge').text()).toBe('EST')
    expect(first.find('.gacha-banner__dates').text()).toContain('≈')
  })

  it('filters upcoming banners by type and shows an empty state', async () => {
    const wrapper = await mountSuspended(GachaPage)
    const filters = wrapper.findAll('.gacha-page__filter-btn')

    await filters[1]!.trigger('click')
    expect(wrapper.findAllComponents(GachaBannerCard)).toHaveLength(7)

    await filters[2]!.trigger('click')
    expect(wrapper.findAllComponents(GachaBannerCard)).toHaveLength(4)

    await filters[3]!.trigger('click')
    expect(wrapper.findAllComponents(GachaBannerCard)).toHaveLength(0)
    expect(wrapper.findComponent(AkEmptyState).exists()).toBe(true)
  })

  it('toggles calculator visibility when calculator toggle button is clicked', async () => {
    const wrapper = await mountSuspended(GachaPage)
    expect(wrapper.find('.gacha-page__calculator-section').exists()).toBe(true)

    const toggleBtn = wrapper.find('.gacha-page__calc-toggle')
    await toggleBtn.trigger('click')

    expect(wrapper.find('.gacha-page__calculator-section').exists()).toBe(false)
  })
})
