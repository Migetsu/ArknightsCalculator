import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
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
import { formatBannerDateRange, isProvenNotOnGlobal } from '../../../shared/utils/gacha'

const { mockUseGachaPageData } = vi.hoisted(() => ({ mockUseGachaPageData: vi.fn() }))

/**
 * Fixed instant inside the `SPECIAL_EN_42_0_3` window, the current EN pool in the
 * committed dataset. The banner card derives its lifecycle badge from `Date.now()`,
 * so the file runs on a frozen clock instead of today's rotation.
 */
const FIXED_NOW = new Date('2026-11-01T12:00:00.000Z')
const FIXED_SEC = Math.floor(FIXED_NOW.getTime() / 1000)

/** The committed dataset's upcoming window at the frozen instant, used as the oracle. */
const EXPECTED_UPCOMING = buildGachaPageData(
  bannersDataset as unknown as BannersDataset,
  'global',
  undefined,
  FIXED_SEC,
).upcomingBanners

mockNuxtImport('useGachaPageData', () => mockUseGachaPageData)

describe('GachaPage', () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: FIXED_NOW, toFake: ['Date'] })
    setActivePinia(createPinia())
    // The page now receives a Nitro projection instead of importing the dataset.
    mockUseGachaPageData.mockReturnValue({
      data: ref(
        buildGachaPageData(
          bannersDataset as unknown as BannersDataset,
          'global',
          undefined,
          FIXED_SEC,
        ),
      ),
      status: ref('success'),
      refresh: vi.fn(),
    })
  })

  afterEach(() => {
    vi.useRealTimers()
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
    expect(card.props('banner').id).toBe('SPECIAL_EN_42_0_3')
    expect(card.find('.gacha-banner__badge-bar').text()).toBe('Orienteering Headhunting')

    // 6 rate-up 6★ and 6 rate-up 5★ for SPECIAL_EN_42_0_3
    expect(card.findAllComponents(AkAvatar)).toHaveLength(12)
    expect(card.text()).toContain('6★ OPERATORS')
    expect(card.text()).toContain('5★ OPERATORS')

    // EN dates come from the ISO window, and the active lifecycle badge is shown
    expect(card.props('banner').endIso).toBe('2026-11-11T10:59:59.000Z')
    expect(card.find('.gacha-banner__dates').text()).toContain('Nov 11, 2026')
    expect(card.props('banner').ruleType).toBe('SPECIAL')
    expect(card.classes()).toContain('gacha-banner--active')
    expect(card.text()).toContain('ACTIVE NOW')
  })

  it('renders a CN banner whose estimated Global window is live as the current banner', async () => {
    const dataset = bannersDataset as unknown as BannersDataset
    const base = buildGachaPageData(
      dataset,
      'global',
      undefined,
      Math.floor(FIXED_NOW.getTime() / 1000),
    )
    const placeholder = {
      ...dataset.enBanners.find((banner) => banner.id === 'DOUBLE_EN_42_0_4')!,
      rateUp6: [],
      rateUp5: [],
      hasArt: false,
    }

    // Estimated Global start 2026-10-31 with lag 163 -> CN start 163 days earlier.
    const estimatedStartMs = Date.parse('2026-10-31T00:00:00.000Z')
    const cnStartIso = new Date(estimatedStartMs - 163 * 86_400_000).toISOString().slice(0, 10)
    const cnStart = cnStartIso.replace(/-/g, '/')
    const cnEnd = new Date(Date.parse(`${cnStartIso}T00:00:00.000Z`) + 13 * 86_400_000)
      .toISOString()
      .slice(0, 10)
      .replace(/-/g, '/')

    const liveBanner = {
      ...placeholder,
      id: 'LINKAGE_TEST',
      server: 'cn',
      ruleType: 'LINKAGE',
      type: 'limited',
      name: {
        en: 'Hunters of the Umbral Wilds',
        zh: 'Hunters of the Umbral Wilds',
        source: 'wiki',
        isMachineTranslation: false,
      },
      title: {
        en: 'Hunters of the Umbral Wilds',
        zh: 'Hunters of the Umbral Wilds',
        source: 'wiki',
        isMachineTranslation: false,
      },
      cnStartDate: cnStart,
      cnEndDate: cnEnd,
      globalStartDate: null,
      globalEndDate: null,
      hasArt: true,
      rateUp6: ['char_1048_orchd2'],
      rateUp5: ['char_1049_catap2'],
    }

    mockUseGachaPageData.mockReturnValue({
      data: ref({
        ...base,
        currentBanner: placeholder,
        currentEnBannerId: placeholder.id,
        currentEnFullBanner: placeholder,
        upcomingBanners: [liveBanner],
      }),
      status: ref('success'),
      refresh: vi.fn(),
    })

    const wrapper = await mountSuspended(GachaPage)
    const hero = wrapper.find('.gacha-current-en')
    const card = hero.findComponent(GachaBannerCard)

    expect(card.props('banner').id).toBe('LINKAGE_TEST')
    expect(card.classes()).toContain('gacha-banner--active')
    expect(card.text()).toContain('ACTIVE NOW')
    // The live pool must not be duplicated in the upcoming list.
    expect(wrapper.find('.gacha-page__upcoming').text()).not.toContain(
      'Hunters of the Umbral Wilds',
    )
  })

  it('renders the upcoming CN window without the archive or pagination', async () => {
    const wrapper = await mountSuspended(GachaPage)

    const upcoming = wrapper.find('.gacha-page__upcoming')
    const cards = upcoming.findAllComponents(GachaBannerCard)
    expect(cards).toHaveLength(EXPECTED_UPCOMING.length)
    expect(cards.length).toBeGreaterThan(0)
    // The current Global hero card must not leak into the upcoming section
    expect(upcoming.text()).not.toContain('Sealed With Time')
    expect(wrapper.text()).not.toContain('453')
    expect(wrapper.find('.gacha-page__pagination').exists()).toBe(false)

    const buttonTexts = wrapper.findAll('button').map((button) => button.text())
    expect(buttonTexts.some((text) => text.includes('Show More'))).toBe(false)
    expect(buttonTexts.some((text) => text.includes('Show All'))).toBe(false)
  })

  it('orders upcoming banners from the closest release to the newest', async () => {
    const wrapper = await mountSuspended(GachaPage)
    const cards = wrapper.find('.gacha-page__upcoming').findAllComponents(GachaBannerCard)

    expect(cards.map((card) => card.props('banner').id)).toEqual(
      EXPECTED_UPCOMING.map((banner) => banner.id),
    )
  })

  it('renders CN-local banner dates and the Global estimate from the dataset', async () => {
    const wrapper = await mountSuspended(GachaPage)
    const cards = wrapper.find('.gacha-page__upcoming').findAllComponents(GachaBannerCard)

    const first = cards[0]!
    const firstBanner = first.props('banner')
    expect(firstBanner.id).toBe(EXPECTED_UPCOMING[0]!.id)
    expect(first.find('.gacha-banner__dates').text()).toContain(
      formatBannerDateRange(firstBanner.cnStartDate!, firstBanner.cnEndDate!),
    )

    const last = cards[cards.length - 1]!
    expect(last.props('banner').id).toBe(EXPECTED_UPCOMING[EXPECTED_UPCOMING.length - 1]!.id)
    // A banner without confirmed Global dates shows the estimated Global row.
    expect(last.find('.gacha-banner__dates').text()).toContain('≈')
  })

  it('marks active banner on Global as ACTIVE NOW', async () => {
    const wrapper = await mountSuspended(GachaPage)
    const heroCard = wrapper.find('.gacha-current-en').findComponent(GachaBannerCard)

    expect(heroCard.exists()).toBe(true)
    expect(heroCard.classes()).toContain('gacha-banner--active')
    expect(heroCard.text()).toContain('ACTIVE NOW')
  })

  it('never displays ENDED status badge for banners in upcoming section', async () => {
    const wrapper = await mountSuspended(GachaPage)
    const cards = wrapper.find('.gacha-page__upcoming').findAllComponents(GachaBannerCard)

    expect(cards.length).toBeGreaterThan(0)
    for (const card of cards) {
      expect(card.classes()).not.toContain('gacha-banner--ended')
      expect(card.find('.gacha-banner__countdown-badge--ended').exists()).toBe(false)
      const countdownBadges = card.findAll('.gacha-banner__countdown-badge')
      const badgeTexts = countdownBadges.map((b) => b.text())
      expect(badgeTexts).not.toContain('ENDED')
    }
  })

  it('marks banners proven not to be on Global yet', async () => {
    const wrapper = await mountSuspended(GachaPage)
    const upcoming = wrapper.find('.gacha-page__upcoming')
    const cards = upcoming.findAllComponents(GachaBannerCard)
    const badges = upcoming.findAll('.gacha-banner__countdown-badge--not-on-en')

    const expected = cards.filter((card) => isProvenNotOnGlobal(card.props('banner'))).length
    expect(badges).toHaveLength(expected)

    const limited = cards.find((card) => card.props('banner').id === 'LIMITED_76_0_1')
    expect(limited).toBeDefined()
    expect(limited!.find('.gacha-banner__countdown-badge--not-on-en').exists()).toBe(true)
  })

  it('marks the first upcoming banner with NEXT ON GLOBAL and the right date source', async () => {
    const wrapper = await mountSuspended(GachaPage)
    const upcoming = wrapper.find('.gacha-page__upcoming')
    const cards = upcoming.findAllComponents(GachaBannerCard)
    const first = cards[0]!
    const banner = first.props('banner')

    expect(upcoming.findAll('.gacha-banner__countdown-badge--next')).toHaveLength(1)
    expect(first.find('.gacha-banner__countdown-badge--next').text()).toBe('NEXT ON GLOBAL')

    if (banner.globalStartDate) {
      // A confirmed Global release shows the real window, not an EST estimate.
      expect(first.find('.gacha-banner__est-badge').exists()).toBe(false)
      expect(first.find('.gacha-banner__dates').text()).toContain(
        formatBannerDateRange(banner.globalStartDate, banner.globalEndDate!),
      )
    } else {
      expect(first.find('.gacha-banner__est-badge').text()).toBe('EST')
      expect(first.find('.gacha-banner__dates').text()).toContain('≈')
    }
  })

  it('filters upcoming banners by type and shows an empty state', async () => {
    const wrapper = await mountSuspended(GachaPage)
    const filters = wrapper.findAll('.gacha-page__filter-btn')
    const upcoming = () => wrapper.find('.gacha-page__upcoming')

    const standardCount = EXPECTED_UPCOMING.filter((banner) => banner.type === 'standard').length
    const limitedCount = EXPECTED_UPCOMING.filter((banner) => banner.type === 'limited').length

    await filters[1]!.trigger('click')
    expect(upcoming().findAllComponents(GachaBannerCard)).toHaveLength(standardCount)

    await filters[2]!.trigger('click')
    expect(upcoming().findAllComponents(GachaBannerCard)).toHaveLength(limitedCount)

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
