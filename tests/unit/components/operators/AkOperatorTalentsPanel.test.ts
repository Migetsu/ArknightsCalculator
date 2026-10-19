import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import AkOperatorTalentsPanel from '~/components/operators/AkOperatorTalentsPanel.vue'
import AkTranslationBadge from '~/components/ui/AkTranslationBadge.vue'
import makotoData from '../../../../data/operators/char_4217_makoto.json'
import type { OperatorDetail } from '../../../../shared/schemas/operator'

describe('AkOperatorTalentsPanel', () => {
  const makoto = makotoData as unknown as OperatorDetail

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
})
