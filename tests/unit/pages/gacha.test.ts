import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref } from 'vue'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { setActivePinia, createPinia } from 'pinia'
import { useDepotStore } from '~/stores/depot'
import GachaPage from '~/pages/gacha.vue'
import GachaBannerCard from '~/components/gacha/GachaBannerCard.vue'
import AkAvatar from '~/components/ui/AkAvatar.vue'
import AkEmptyState from '~/components/ui/AkEmptyState.vue'
import bannersDataset from '../../../data/banners.json'
import type { BannersDataset } from '../../../shared/schemas/banner'
import { buildGachaPageData } from '../../../shared/utils/gachaPageData'

const { mockUseGachaPageData } = vi.hoisted(() => ({ mockUseGachaPageData: vi.fn() }))

mockNuxtImport('useGachaPageData', () => mockUseGachaPageData)

describe('GachaPage', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    // The page now receives a Nitro projection instead of importing the dataset.
    mockUseGachaPageData.mockReturnValue({
      data: ref(buildGachaPageData(bannersDataset as unknown as BannersDataset)),
      status: ref('success'),
      refresh: vi.fn(),
    })
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

  it('renders the current Global banner as a banner card with its rate-up roster', async () => {
    const wrapper = await mountSuspended(GachaPage)

    const hero = wrapper.find('.gacha-current-en')
    expect(hero.exists()).toBe(true)
    expect(hero.text()).toContain('PRTS // GLOBAL ACTIVE HEADHUNTING')
    expect(hero.text()).toContain('GLOBAL // EN')

    // The hero reuses the list card instead of a bespoke layout
    const card = hero.findComponent(GachaBannerCard)
    expect(card.exists()).toBe(true)
    expect(card.props('banner').id).toBe('LIMITED_EN_42_0_1')
    expect(card.find('.gacha-banner__badge-bar').text()).toBe('Sealed With Time')

    // Same 480px banner art as the list cards, no placeholder frame
    const art = card.find('img.gacha-banner__art-img')
    expect(art.exists()).toBe(true)
    expect(art.attributes('src')).toContain('/banners/LIMITED_EN_42_0_1.webp')
    expect(art.attributes('width')).toBe('480')

    // 2 rate-up 6★, 3 secondary 6★ and 1 rate-up 5★ for LIMITED_EN_42_0_1
    expect(card.findAllComponents(AkAvatar)).toHaveLength(6)
    expect(card.text()).toContain('SECONDARY RATE-UP')
    expect(card.text()).toContain('5★ OPERATORS')

    // EN dates come from the ISO window, and the limited lifecycle badge is shown
    expect(card.props('banner').endIso).toBe('2026-10-28T10:59:59.000Z')
    expect(card.find('.gacha-banner__dates').text()).toContain('Oct 28, 2026')
    expect(card.props('banner').ruleType).toBe('LIMITED')
    expect(card.classes()).toContain('gacha-banner--limited')
    expect(card.classes()).toContain('gacha-banner--active')
    expect(card.text()).toContain('ACTIVE NOW')
  })

  it('renders only the 11 upcoming CN banners, without the archive or pagination', async () => {
    const wrapper = await mountSuspended(GachaPage)

    const upcoming = wrapper.find('.gacha-page__upcoming')
    const cards = upcoming.findAllComponents(GachaBannerCard)
    expect(cards).toHaveLength(11)
    // The current Global hero card must not leak into the upcoming section
    expect(upcoming.text()).not.toContain('Sealed With Time')
    expect(wrapper.text()).not.toContain('453')
    expect(wrapper.find('.gacha-page__pagination').exists()).toBe(false)

    const buttonTexts = wrapper.findAll('button').map((button) => button.text())
    expect(buttonTexts.some((text) => text.includes('Show More'))).toBe(false)
    expect(buttonTexts.some((text) => text.includes('Show All'))).toBe(false)
  })

  it('orders upcoming banners from oldest to newest', async () => {
    const wrapper = await mountSuspended(GachaPage)
    const cards = wrapper.find('.gacha-page__upcoming').findAllComponents(GachaBannerCard)

    expect(cards[0]!.props('banner').id).toBe('SPECIAL_73_0_3')
    expect(cards[cards.length - 1]!.props('banner').id).toBe('SINGLE_78_0_1')

    for (let i = 0; i < cards.length - 1; i++) {
      const current = cards[i]!.props('banner')
      const next = cards[i + 1]!.props('banner')
      expect(current.openTime).toBeLessThanOrEqual(next.openTime)
    }
  })

  it('renders CN-local banner dates and EST Global dates from the dataset', async () => {
    const wrapper = await mountSuspended(GachaPage)
    const cards = wrapper.find('.gacha-page__upcoming').findAllComponents(GachaBannerCard)

    // SPECIAL_73_0_3: CN 2026-05-15 … 2026-05-29, EST 2026-10-25
    const first = cards[0]!
    expect(first.props('banner').id).toBe('SPECIAL_73_0_3')
    const firstDates = first.find('.gacha-banner__dates').text()
    expect(firstDates).toContain('May 15')
    expect(firstDates).toContain('May 29')
    expect(firstDates).toContain('Oct 25')

    // LINKAGE_74_0_1: CN 2026-06-01 … 2026-06-15
    const linkage = cards.find((card) => card.props('banner').id === 'LINKAGE_74_0_1')
    expect(linkage).toBeDefined()
    const linkageDates = linkage!.find('.gacha-banner__dates').text()
    expect(linkageDates).toContain('Jun 1')
    expect(linkageDates).toContain('Jun 15')

    // SINGLE_78_0_1: CN 2026-10-09 … 2026-10-23, EST 2027-03-21
    const last = cards[cards.length - 1]!
    expect(last.props('banner').id).toBe('SINGLE_78_0_1')
    const lastDates = last.find('.gacha-banner__dates').text()
    expect(lastDates).toContain('Oct 9')
    expect(lastDates).toContain('Oct 23')
    expect(lastDates).toContain('Mar 21')
  })

  it('marks the current CN banner (SINGLE_78_0_1) as active', async () => {
    const wrapper = await mountSuspended(GachaPage)
    const cards = wrapper.find('.gacha-page__upcoming').findAllComponents(GachaBannerCard)
    const active = cards.find((card) => card.props('banner').id === 'SINGLE_78_0_1')

    expect(active).toBeDefined()
    expect(active!.classes()).toContain('gacha-banner--active')
    expect(active!.text()).toContain('ACTIVE NOW')
  })

  it('marks exactly one banner as NOT ON GLOBAL YET', async () => {
    const wrapper = await mountSuspended(GachaPage)
    const upcoming = wrapper.find('.gacha-page__upcoming')
    const cards = upcoming.findAllComponents(GachaBannerCard)
    const badges = upcoming.findAll('.gacha-banner__countdown-badge--not-on-en')

    expect(badges).toHaveLength(1)

    const limited = cards.find((card) => card.props('banner').id === 'LIMITED_76_0_1')
    expect(limited).toBeDefined()
    expect(limited!.find('.gacha-banner__countdown-badge--not-on-en').exists()).toBe(true)
  })

  it('marks the first upcoming banner with NEXT ON GLOBAL and an EST estimate', async () => {
    const wrapper = await mountSuspended(GachaPage)
    const upcoming = wrapper.find('.gacha-page__upcoming')
    const cards = upcoming.findAllComponents(GachaBannerCard)
    const first = cards[0]!

    expect(upcoming.findAll('.gacha-banner__countdown-badge--next')).toHaveLength(1)
    expect(first.find('.gacha-banner__countdown-badge--next').text()).toBe('NEXT ON GLOBAL')
    expect(first.find('.gacha-banner__est-badge').text()).toBe('EST')
    expect(first.find('.gacha-banner__dates').text()).toContain('≈')
  })

  it('filters upcoming banners by type and shows an empty state', async () => {
    const wrapper = await mountSuspended(GachaPage)
    const filters = wrapper.findAll('.gacha-page__filter-btn')
    const upcoming = () => wrapper.find('.gacha-page__upcoming')

    await filters[1]!.trigger('click')
    expect(upcoming().findAllComponents(GachaBannerCard)).toHaveLength(7)

    await filters[2]!.trigger('click')
    expect(upcoming().findAllComponents(GachaBannerCard)).toHaveLength(4)

    await filters[3]!.trigger('click')
    expect(upcoming().findAllComponents(GachaBannerCard)).toHaveLength(0)
    expect(upcoming().findComponent(AkEmptyState).exists()).toBe(true)
  })

  it('toggles calculator visibility when calculator toggle button is clicked', async () => {
    const wrapper = await mountSuspended(GachaPage)
    expect(wrapper.find('.gacha-page__calculator-section').exists()).toBe(true)

    const toggleBtn = wrapper.find('.gacha-page__calc-toggle')
    await toggleBtn.trigger('click')

    expect(wrapper.find('.gacha-page__calculator-section').exists()).toBe(false)
  })

  it('passes single and ten-roll permits from depot to gacha forecast', async () => {
    const wrapper = await mountSuspended(GachaPage)
    const depotStore = useDepotStore()
    depotStore.currencies.orundum = 0
    depotStore.currencies.originitePrime = 0
    depotStore.items['7003'] = 5
    depotStore.items['7004'] = 1

    await wrapper.vm.$nextTick()

    // 5 single + 1 ten-roll = 15 pulls now
    const breakdown = wrapper.find('.gacha-forecast-card__breakdown')
    expect(breakdown.exists()).toBe(true)
    expect(breakdown.text()).toContain('Current pulls: 15')
  })
})
