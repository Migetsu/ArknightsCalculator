import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import GachaBannerCard from '~/components/gacha/GachaBannerCard.vue'
import AkAvatar from '~/components/ui/AkAvatar.vue'
import type { GachaBanner } from '~/../shared/schemas/banner'
import type { OperatorSummary } from '~/../shared/schemas/operator'

describe('GachaBannerCard', () => {
  const mockBanner: GachaBanner = {
    id: 'banner_orienteering_7',
    type: 'standard',
    tag: 'ORIENTEERING',
    title: '[Standard Headhunting] Orienteering #7',
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

  it('calculates and displays CN dates and projected Global dates (+175 days)', async () => {
    const wrapper = await mountSuspended(GachaBannerCard, {
      props: {
        banner: mockBanner,
        operatorsMap: mockOperatorsMap,
      },
    })

    const datesText = wrapper.find('.gacha-banner__dates').text()
    expect(datesText).toContain('2026/05/15 to 2026/05/29')
    expect(datesText).toContain('2026/11/06 to 2026/11/20')
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
})
