import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import AkOperatorTalentsPanel from '~/components/operators/AkOperatorTalentsPanel.vue'
import AkTranslationBadge from '~/components/ui/AkTranslationBadge.vue'
import makotoData from '../../../../data/operators/char_4217_makoto.json'
import aglnaData from '../../../../data/operators/char_1015_aglna2.json'
import type { OperatorDetail } from '../../../../shared/schemas/operator'

describe('AkOperatorTalentsPanel', () => {
  const makoto = makotoData as unknown as OperatorDetail
  const aglna = aglnaData as unknown as OperatorDetail

  it('renders talents and properly resolves AkTranslationBadge for machine translated descriptions', async () => {
    const wrapper = await mountSuspended(AkOperatorTalentsPanel, {
      props: {
        talents: makoto.talents,
      },
    })

    // 1. Guard against unresolvable custom element:
    // When AkTranslationBadge is NOT imported, Vue renders literal <aktranslationbadge> or <ak-translation-badge> tags.
    const html = wrapper.html()
    expect(html).not.toContain('<aktranslationbadge')
    expect(html).not.toContain('<ak-translation-badge')

    // 2. Verify that AkTranslationBadge component actually renders
    const translationBadges = wrapper.findAllComponents(AkTranslationBadge)
    expect(translationBadges.length).toBeGreaterThan(0)

    // Verify DOM class exists from AkTranslationBadge
    const badgeElements = wrapper.findAll('.ak-translation-badge')
    expect(badgeElements.length).toBeGreaterThan(0)
    expect(wrapper.text()).toContain('MT')

    // Verify talent name is rendered
    expect(wrapper.text()).toContain('Wild Card')
  })

  it('renders empty message when no talents are available', async () => {
    const wrapper = await mountSuspended(AkOperatorTalentsPanel, {
      props: {
        talents: [],
      },
    })

    expect(wrapper.find('.ak-operator-talents-panel__empty').exists()).toBe(true)
  })

  it('groups talent candidates into single card per talent without duplicating talent headers', async () => {
    const wrapper = await mountSuspended(AkOperatorTalentsPanel, {
      props: {
        talents: aglna.talents ?? [],
      },
    })

    // Angelina alter has 2 talents: Talent 1 has 4 progression stages, Talent 2 has 2 stages
    const talentCards = wrapper.findAll('.ak-operator-talents-panel__talent-card')
    expect(talentCards.length).toBe(2)

    // First talent card
    const firstCard = talentCards[0]!
    const names = firstCard.findAll('.ak-operator-talents-panel__name')
    expect(names.length).toBe(1)
    expect(names[0]!.text()).toBe('Floating Above the Earth')

    // 4 stages inside first talent card
    const stages = firstCard.findAll('.ak-operator-talents-panel__stage-row')
    expect(stages.length).toBe(4)

    // Second talent card
    const secondCard = talentCards[1]!
    const secondNames = secondCard.findAll('.ak-operator-talents-panel__name')
    expect(secondNames.length).toBe(1)
    expect(secondNames[0]!.text()).toBe('Dancing in the Sky')

    const secondStages = secondCard.findAll('.ak-operator-talents-panel__stage-row')
    expect(secondStages.length).toBe(2)
  })
})
