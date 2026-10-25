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

  it('displays CN dates and real Global dates when available from wiki dataset', async () => {
    const bannerWithGlobal: GachaBanner = {
      ...mockBanner,
      globalStartDate: '2026/10/14',
      globalEndDate: '2026/10/28',
    }
    const wrapper = await mountSuspended(GachaBannerCard, {
      props: {
        banner: bannerWithGlobal,
        operatorsMap: mockOperatorsMap,
      },
    })

    const datesText = wrapper.find('.gacha-banner__dates').text()
    expect(datesText).toContain('May 15, 2026 – May 29, 2026')
    expect(datesText).toContain('Oct 14, 2026 – Oct 28, 2026')
  })

  it('prefers CN-local dates over UTC openIso/endIso on the CN server', async () => {
    const cnBannerWithUtcIso: GachaBanner = {
      ...mockBanner,
      openTime: 1778832000,
      endTime: 1779998399,
      openIso: '2026-05-15T08:00:00.000Z',
      endIso: '2026-05-28T19:59:59.000Z',
    }
    const wrapper = await mountSuspended(GachaBannerCard, {
      props: {
        banner: cnBannerWithUtcIso,
        operatorsMap: mockOperatorsMap,
      },
    })

    const datesText = wrapper.find('.gacha-banner__dates').text()
    expect(datesText).toContain('May 15, 2026 – May 29, 2026')
    expect(datesText).not.toContain('May 28, 2026')
  })

  it('keeps UTC openIso/endIso dates for the EN server', async () => {
    const enBanner: GachaBanner = {
      ...mockBanner,
      server: 'en',
      openIso: '2026-10-14T10:00:00.000Z',
      endIso: '2026-10-28T10:59:59.000Z',
      cnStartDate: '2026/10/15',
      cnEndDate: '2026/10/29',
    }
    const wrapper = await mountSuspended(GachaBannerCard, {
      props: {
        banner: enBanner,
        operatorsMap: mockOperatorsMap,
      },
    })

    const datesText = wrapper.find('.gacha-banner__dates').text()
    expect(datesText).toContain('Oct 14, 2026 – Oct 28, 2026')
    expect(datesText).not.toContain('Oct 15, 2026')
  })

  it('does NOT render Global date row when globalStartDate is absent (no 175-day estimation)', async () => {
    const bannerWithoutGlobal: GachaBanner = {
      ...mockBanner,
      globalStartDate: undefined,
      globalEndDate: undefined,
    }
    const wrapper = await mountSuspended(GachaBannerCard, {
      props: {
        banner: bannerWithoutGlobal,
        operatorsMap: mockOperatorsMap,
      },
    })

    const datesText = wrapper.find('.gacha-banner__dates').text()
    expect(datesText).toContain('May 15, 2026 – May 29, 2026')
    expect(datesText).not.toContain('Global:')
    expect(datesText).not.toContain('Est. Global:')
  })

  it('renders the EST estimate when no real Global date exists', async () => {
    const wrapper = await mountSuspended(GachaBannerCard, {
      props: {
        banner: mockBanner,
        operatorsMap: mockOperatorsMap,
        globalEstimate: '2026-10-25',
      },
    })

    const datesText = wrapper.find('.gacha-banner__dates').text()
    expect(datesText).toContain('Est. Global:')
    expect(datesText).toContain('≈ Oct 25, 2026')
    expect(wrapper.find('.gacha-banner__est-badge').text()).toBe('EST')
  })

  it('prefers a real Global date over the EST estimate', async () => {
    const bannerWithGlobal: GachaBanner = {
      ...mockBanner,
      globalStartDate: '2026/10/14',
      globalEndDate: '2026/10/28',
    }
    const wrapper = await mountSuspended(GachaBannerCard, {
      props: {
        banner: bannerWithGlobal,
        operatorsMap: mockOperatorsMap,
        globalEstimate: '2026-12-01',
      },
    })

    const datesText = wrapper.find('.gacha-banner__dates').text()
    expect(datesText).toContain('Oct 14, 2026 – Oct 28, 2026')
    expect(datesText).not.toContain('≈')
    expect(wrapper.find('.gacha-banner__est-badge').exists()).toBe(false)
  })

  it('renders NEXT ON GLOBAL only when isNext is true', async () => {
    const nextWrapper = await mountSuspended(GachaBannerCard, {
      props: { banner: mockBanner, operatorsMap: mockOperatorsMap, isNext: true },
    })
    expect(nextWrapper.find('.gacha-banner__countdown-badge--next').text()).toBe('NEXT ON GLOBAL')

    const regularWrapper = await mountSuspended(GachaBannerCard, {
      props: { banner: mockBanner, operatorsMap: mockOperatorsMap, isNext: false },
    })
    expect(regularWrapper.find('.gacha-banner__countdown-badge--next').exists()).toBe(false)
  })

  it('renders primary 6★, other 6★, secondary 6★, and 5★ rate-up operators', async () => {
    const complexBanner: GachaBanner = {
      ...mockBanner,
      type: 'limited',
      rateUp6: ['char_003_kalts', 'char_1040_lemuen'],
      primaryRateUp6: 'char_003_kalts',
      secondaryRateUp6: ['char_249_mlyse'],
      rateUp5: ['char_422_aurora'],
    }

    const extendedMap = new Map(mockOperatorsMap)
    extendedMap.set('char_1040_lemuen', {
      id: 'char_1040_lemuen',
      name: { en: 'Lemuen', zh: '蕾缪安', source: 'official', isMachineTranslation: false },
      displayNumber: 'SN01',
      rarity: 6,
      class: 'SNIPER',
      subclass: 'marksman',
      faction: 'laterano',
      position: 'RANGED',
      tagList: ['DPS'],
      servers: ['cn'],
      hasIcon: true,
      isClassChange: false,
    })
    extendedMap.set('char_249_mlyse', {
      id: 'char_249_mlyse',
      name: { en: 'Muelsyse', zh: '缪尔赛思', source: 'official', isMachineTranslation: false },
      displayNumber: 'RL07',
      rarity: 6,
      class: 'VANGUARD',
      subclass: 'tactician',
      faction: 'rhine',
      position: 'MELEE',
      tagList: ['Summon'],
      servers: ['cn', 'global'],
      hasIcon: true,
      isClassChange: false,
    })

    const wrapper = await mountSuspended(GachaBannerCard, {
      props: {
        banner: complexBanner,
        operatorsMap: extendedMap,
      },
    })

    const avatars = wrapper.findAllComponents(AkAvatar)
    expect(avatars.length).toBe(4) // Kal'tsit, Lemuen, Muelsyse, Aurora

    const headings = wrapper.findAll('.gacha-banner__ops-heading').map((h) => h.text())
    expect(headings).toContain('RATE-UP') // Primary 6★
    expect(headings).toContain('OTHER 6★ RATE-UP') // Other 6★ (Lemuen)
    expect(headings).toContain('SECONDARY RATE-UP') // Secondary 6★ (Muelsyse)
    expect(headings).toContain('5★ OPERATORS') // 5★ (Aurora)
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

  describe('banner art rendering', () => {
    it('renders banner art img with lazy loading when hasArt is true', async () => {
      const bannerWithArt: GachaBanner = {
        ...mockBanner,
        hasArt: true,
        artId: 'NORM_10_0_1',
      }

      const wrapper = await mountSuspended(GachaBannerCard, {
        props: {
          banner: bannerWithArt,
          operatorsMap: mockOperatorsMap,
        },
      })

      const img = wrapper.find('img.gacha-banner__art-img')
      expect(img.exists()).toBe(true)
      expect(img.attributes('src')).toContain('/banners/NORM_10_0_1.webp')
      expect(img.attributes('alt')).toBe('[Standard Headhunting] Orienteering #7')
      expect(img.attributes('loading')).toBe('lazy')
      expect(img.attributes('decoding')).toBe('async')

      // Grid watermark placeholder should not be rendered when art is present
      expect(wrapper.find('.gacha-banner__art-watermark').exists()).toBe(false)
    })

    it('prefers the published artId over the legacy stripped EN id', async () => {
      const enBannerWithOwnArt: GachaBanner = {
        ...mockBanner,
        id: 'LIMITED_EN_42_0_1',
        server: 'en',
        type: 'limited',
        hasArt: true,
        artId: 'LIMITED_EN_42_0_1',
      }

      const wrapper = await mountSuspended(GachaBannerCard, {
        props: {
          banner: enBannerWithOwnArt,
          operatorsMap: mockOperatorsMap,
        },
      })

      const src = wrapper.find('img.gacha-banner__art-img').attributes('src')
      expect(src).toContain('/banners/LIMITED_EN_42_0_1.webp')
      expect(src).not.toContain('/banners/LIMITED_42_0_1.webp')
    })

    it('renders placeholder frame when hasArt is false', async () => {
      const bannerWithoutArt: GachaBanner = {
        ...mockBanner,
        hasArt: false,
      }

      const wrapper = await mountSuspended(GachaBannerCard, {
        props: {
          banner: bannerWithoutArt,
          operatorsMap: mockOperatorsMap,
        },
      })

      expect(wrapper.find('img.gacha-banner__art-img').exists()).toBe(false)
      expect(wrapper.find('.gacha-banner__art-grid').exists()).toBe(true)
      expect(wrapper.find('.gacha-banner__art-watermark').exists()).toBe(true)
      expect(wrapper.find('.gacha-banner__art-tag').text()).toBe('ORIENTEERING')
    })

    it('falls back to placeholder frame when image load fails (@error)', async () => {
      const bannerWithArt: GachaBanner = {
        ...mockBanner,
        hasArt: true,
        artId: 'NORM_10_0_1',
      }

      const wrapper = await mountSuspended(GachaBannerCard, {
        props: {
          banner: bannerWithArt,
          operatorsMap: mockOperatorsMap,
        },
      })

      const img = wrapper.find('img.gacha-banner__art-img')
      expect(img.exists()).toBe(true)

      // Trigger image error
      await img.trigger('error')

      // Img is removed, placeholder is shown
      expect(wrapper.find('img.gacha-banner__art-img').exists()).toBe(false)
      expect(wrapper.find('.gacha-banner__art-watermark').exists()).toBe(true)
    })
  })

  describe('accessibility and selection interactions (WCAG 4.1.2)', () => {
    it('does not place role="button" on root container to avoid nested interactive controls', async () => {
      const wrapper = await mountSuspended(GachaBannerCard, {
        props: {
          banner: mockBanner,
          operatorsMap: mockOperatorsMap,
        },
      })

      // The root element must NOT be a button (which would illegally enclose operator <a> links)
      expect(wrapper.attributes('role')).toBeUndefined()
      expect(wrapper.attributes('tabindex')).toBeUndefined()

      // The card column acts as the keyboard-focusable button
      const cardBtn = wrapper.find('.gacha-banner__card')
      expect(cardBtn.attributes('role')).toBe('button')
      expect(cardBtn.attributes('tabindex')).toBe('0')
      expect(cardBtn.attributes('aria-pressed')).toBe('false')

      // The card column must NOT contain any nested links or buttons
      expect(cardBtn.find('a').exists()).toBe(false)
      expect(cardBtn.find('button').exists()).toBe(false)
    })

    it('emits "select" when .gacha-banner__card is clicked', async () => {
      const wrapper = await mountSuspended(GachaBannerCard, {
        props: {
          banner: mockBanner,
          operatorsMap: mockOperatorsMap,
        },
      })

      const cardBtn = wrapper.find('.gacha-banner__card')
      await cardBtn.trigger('click')

      expect(wrapper.emitted('select')).toBeTruthy()
      expect(wrapper.emitted('select')![0]).toEqual(['banner_orienteering_7'])
    })

    it('emits "select" on Enter and Space keydown events on .gacha-banner__card', async () => {
      const wrapper = await mountSuspended(GachaBannerCard, {
        props: {
          banner: mockBanner,
          operatorsMap: mockOperatorsMap,
        },
      })

      const cardBtn = wrapper.find('.gacha-banner__card')
      await cardBtn.trigger('keydown.enter')
      expect(wrapper.emitted('select')).toHaveLength(1)

      await cardBtn.trigger('keydown.space')
      expect(wrapper.emitted('select')).toHaveLength(2)
    })

    it('marks upcoming CN banner as UPCOMING instead of ENDED when openTime is in the past', async () => {
      const pastCnBanner: GachaBanner = {
        ...mockBanner,
        server: 'cn',
        openTime: 1700000000,
        endTime: 1701000000,
        pairedBannerId: null,
      }

      const wrapper = await mountSuspended(GachaBannerCard, {
        props: {
          banner: pastCnBanner,
          operatorsMap: mockOperatorsMap,
        },
      })

      expect(wrapper.classes()).not.toContain('gacha-banner--ended')
      expect(wrapper.classes()).toContain('gacha-banner--upcoming')
      expect(wrapper.find('.gacha-banner__countdown-badge--ended').exists()).toBe(false)
      expect(wrapper.find('.gacha-banner__countdown-badge--upcoming').exists()).toBe(true)
    })

    it('renders days until banner badge with IN ~X DAYS when target date is in the future', async () => {
      // 10 days in the future
      const futureDate = new Date(Date.now() + 10 * 86400000).toISOString()
      const upcomingBanner: GachaBanner = {
        ...mockBanner,
        globalStartDate: futureDate,
      }

      const wrapper = await mountSuspended(GachaBannerCard, {
        props: {
          banner: upcomingBanner,
          operatorsMap: mockOperatorsMap,
        },
      })

      const daysBadge = wrapper.find('.gacha-banner__countdown-badge--days')
      expect(daysBadge.exists()).toBe(true)
      expect(daysBadge.text()).toMatch(/IN ~10 DAYS/i)
    })

    it('renders IN ~1 DAY when 1 day remaining until banner', async () => {
      const oneDayFuture = new Date(Date.now() + 1 * 86400000).toISOString()
      const upcomingBanner: GachaBanner = {
        ...mockBanner,
        globalStartDate: oneDayFuture,
      }

      const wrapper = await mountSuspended(GachaBannerCard, {
        props: {
          banner: upcomingBanner,
          operatorsMap: mockOperatorsMap,
        },
      })

      const daysBadge = wrapper.find('.gacha-banner__countdown-badge--days')
      expect(daysBadge.exists()).toBe(true)
      expect(daysBadge.text()).toBe('IN ~1 DAY')
    })
  })
})
