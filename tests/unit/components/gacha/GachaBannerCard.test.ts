import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import GachaBannerCard from '~/components/gacha/GachaBannerCard.vue'
import AkAvatar from '~/components/ui/AkAvatar.vue'
import type { GachaBanner } from '~/../shared/schemas/banner'
import type { OperatorSummary } from '~/../shared/schemas/operator'

describe('GachaBannerCard', () => {
  const mockBanner: GachaBanner = {
    id: 'banner_orienteering_7',
    server: 'cn',
    ruleType: 'NORMAL',
    type: 'standard',
    tag: 'ORIENTEERING',
    title: {
      en: '[Standard Headhunting] Orienteering #7',
      zh: '[Standard Headhunting] Orienteering #7',
      source: 'official',
      isMachineTranslation: false,
    },
    description: 'Choose 3 of the 6★ operators: only these 6★ appear on this banner.',
    cnStartDate: '2026/05/15',
    cnEndDate: '2026/05/29',
    rateUp6: ['char_003_kalts'],
    rateUp5: ['char_422_aurora'],
  }

  const mockOperatorsMap = new Map<string, OperatorSummary>([
    [
      'char_003_kalts',
      {
        id: 'char_003_kalts',
        name: { en: "Kal'tsit", zh: '凯尔希', source: 'official', isMachineTranslation: false },
        displayNumber: 'B003',
        rarity: 6,
        class: 'MEDIC',
        subclass: 'physician',
        faction: 'rhodes',
        position: 'RANGED',
        tagList: ['Summon', 'Healing'],
        servers: ['cn', 'global'],
        hasIcon: true,
        isClassChange: false,
      },
    ],
    [
      'char_422_aurora',
      {
        id: 'char_422_aurora',
        name: { en: 'Aurora', zh: '极光', source: 'official', isMachineTranslation: false },
        displayNumber: 'JC01',
        rarity: 5,
        class: 'DEFENDER',
        subclass: 'duelist',
        faction: 'kjerag',
        position: 'MELEE',
        tagList: ['Defense', 'Survival'],
        servers: ['cn', 'global'],
        hasIcon: true,
        isClassChange: false,
      },
    ],
  ])

  it('renders banner card title and banner tag', async () => {
    const wrapper = await mountSuspended(GachaBannerCard, {
      props: {
        banner: mockBanner,
        operatorsMap: mockOperatorsMap,
      },
    })

    expect(wrapper.find('.gacha-banner__badge-bar').text()).toBe(
      '[Standard Headhunting] Orienteering #7',
    )
    expect(wrapper.find('.gacha-banner__art-tag').text()).toBe('ORIENTEERING')
  })

  it('renders translation badge for pending and machine-translated titles', async () => {
    const pendingBanner: GachaBanner = {
      ...mockBanner,
      id: 'banner_pending_test',
      title: {
        en: '[Pending Translation]',
        zh: '未翻译卡池',
        source: 'pending',
        isMachineTranslation: false,
      },
    }
    const wrapperPending = await mountSuspended(GachaBannerCard, {
      props: { banner: pendingBanner, operatorsMap: mockOperatorsMap },
    })
    expect(wrapperPending.find('.ak-translation-badge--pending').exists()).toBe(true)
    expect(wrapperPending.find('.ak-translation-badge').text()).toBe('PENDING')

    const machineBanner: GachaBanner = {
      ...mockBanner,
      id: 'banner_machine_test',
      title: {
        en: 'Ruts and Winds',
        zh: '车辙与风',
        source: 'machine',
        isMachineTranslation: true,
      },
    }
    const wrapperMachine = await mountSuspended(GachaBannerCard, {
      props: { banner: machineBanner, operatorsMap: mockOperatorsMap },
    })
    expect(wrapperMachine.find('.ak-translation-badge--machine').exists()).toBe(true)
    expect(wrapperMachine.find('.ak-translation-badge').text()).toBe('MT')
  })

  it('calculates and displays CN dates and projected Global dates (+175 days)', async () => {
    const wrapper = await mountSuspended(GachaBannerCard, {
      props: {
        banner: mockBanner,
        operatorsMap: mockOperatorsMap,
      },
    })

    const datesText = wrapper.find('.gacha-banner__dates').text()
    expect(datesText).toContain('May 15, 2026 – May 29, 2026')
    expect(datesText).toContain('Nov 6, 2026 – Nov 20, 2026')
  })

  it('renders rate-up 6★ and 5★ avatars with operator navigation links', async () => {
    const wrapper = await mountSuspended(GachaBannerCard, {
      props: {
        banner: mockBanner,
        operatorsMap: mockOperatorsMap,
      },
    })

    const avatars = wrapper.findAllComponents(AkAvatar)
    expect(avatars.length).toBe(2)

    const kaltsitAvatar = avatars.find((av) => av.props('id') === 'char_003_kalts')
    expect(kaltsitAvatar?.exists()).toBe(true)
    expect(kaltsitAvatar?.props('rarity')).toBe(6)

    const auroraAvatar = avatars.find((av) => av.props('id') === 'char_422_aurora')
    expect(auroraAvatar?.exists()).toBe(true)
    expect(auroraAvatar?.props('rarity')).toBe(5)
  })

  it('does NOT render rate-up block when rateUp6 and rateUp5 are empty', async () => {
    const emptyBanner: GachaBanner = {
      id: 'NORM_0_1_1',
      server: 'cn',
      ruleType: 'NORMAL',
      type: 'standard',
      tag: 'NORMAL',
      title: {
        en: 'Standard Pool 1',
        zh: 'Standard Pool 1',
        source: 'official',
        isMachineTranslation: false,
      },
      openTime: 1548727200,
      endTime: 1557950399,
      openIso: '2019-01-29T02:00:00.000Z',
      endIso: '2019-05-15T19:59:59.000Z',
      rateUp6: [],
      rateUp5: [],
    }

    const wrapper = await mountSuspended(GachaBannerCard, {
      props: {
        banner: emptyBanner,
        operatorsMap: mockOperatorsMap,
      },
    })

    // Content column and ops sections are omitted
    expect(wrapper.find('.gacha-banner__content').exists()).toBe(false)
    expect(wrapper.find('.gacha-banner__ops-section').exists()).toBe(false)
    expect(wrapper.classes()).toContain('gacha-banner--no-rateup')
  })

  it('renders "NOT ON GLOBAL YET" badge ONLY for proven limited CN banner (LIMITED_76_0_1)', async () => {
    const nextLimitedBanner: GachaBanner = {
      id: 'LIMITED_76_0_1',
      server: 'cn',
      ruleType: 'LIMITED',
      type: 'limited',
      tag: 'LIMITED',
      title: {
        en: 'Where the Ruts and Winds Return',
        zh: '车辙与风的归所',
        source: 'machine',
        isMachineTranslation: true,
      },
      openTime: 1785502800,
      endTime: 1786712399,
      openIso: '2026-07-31T23:00:00.000Z',
      endIso: '2026-08-14T22:59:59.000Z',
      pairedBannerId: null,
      isNextEnBanner: true,
      rateUp6: [],
      rateUp5: [],
    }

    const wrapper = await mountSuspended(GachaBannerCard, {
      props: {
        banner: nextLimitedBanner,
        operatorsMap: mockOperatorsMap,
      },
    })

    const badge = wrapper.find('.gacha-banner__countdown-badge--not-on-en')
    expect(badge.exists()).toBe(true)
    expect(badge.text()).toBe('NOT ON GLOBAL YET')
  })

  it('does NOT render "NOT ON GLOBAL YET" badge for non-limited banners even if pairedBannerId is null', async () => {
    const normalBanner: GachaBanner = {
      id: 'NORM_0_1_1',
      server: 'cn',
      ruleType: 'NORMAL',
      type: 'standard',
      tag: 'NORMAL',
      title: {
        en: 'Standard Pool 1',
        zh: 'Standard Pool 1',
        source: 'official',
        isMachineTranslation: false,
      },
      openTime: 1548727200,
      endTime: 1557950399,
      pairedBannerId: null,
      rateUp6: [],
      rateUp5: [],
    }

    const wrapper = await mountSuspended(GachaBannerCard, {
      props: {
        banner: normalBanner,
        operatorsMap: mockOperatorsMap,
      },
    })

    expect(wrapper.find('.gacha-banner__countdown-badge--not-on-en').exists()).toBe(false)
  })

  it('does NOT render "NOT ON GLOBAL YET" badge for paired limited banners', async () => {
    const pairedLimitedBanner: GachaBanner = {
      id: 'LIMITED_73_0_1',
      server: 'cn',
      ruleType: 'LIMITED',
      type: 'limited',
      tag: 'LIMITED',
      title: {
        en: 'Promise',
        zh: '承诺',
        source: 'official',
        isMachineTranslation: false,
      },
      openTime: 1791982800,
      endTime: 1793185199,
      pairedBannerId: 'LIMITED_EN_42_0_1',
      rateUp6: [],
      rateUp5: [],
    }

    const wrapper = await mountSuspended(GachaBannerCard, {
      props: {
        banner: pairedLimitedBanner,
        operatorsMap: mockOperatorsMap,
      },
    })

    expect(wrapper.find('.gacha-banner__countdown-badge--not-on-en').exists()).toBe(false)
  })
})
