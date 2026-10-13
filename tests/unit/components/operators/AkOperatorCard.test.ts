import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import AkOperatorCard from '~/components/operators/AkOperatorCard.vue'
import type { OperatorSummary } from '~/../shared/schemas/operator'

const kaltsit: OperatorSummary = {
  id: 'char_003_kalts',
  name: { en: "Kal'tsit", zh: '凯尔希', ru: 'Кельцит' },
  appellation: "Kal'tsit",
  displayNumber: 'B003',
  rarity: 6,
  class: 'MEDIC',
  subclass: 'physician',
  faction: 'rhodes',
  position: 'RANGED',
  tagList: ['Summon', 'Healing'],
  servers: ['cn', 'global'],
  hasIcon: true,
}

const cnOperator: OperatorSummary = {
  id: 'char_1037_amiya3',
  name: { en: 'Amiya (Medic)', zh: '阿米娅(医疗)' },
  appellation: 'Amiya',
  displayNumber: 'R001',
  rarity: 5,
  class: 'MEDIC',
  subclass: 'wandering',
  faction: 'rhodes',
  position: 'RANGED',
  tagList: ['Healing'],
  servers: ['cn'],
  hasIcon: false,
}

describe('AkOperatorCard', () => {
  it('renders operator name, class, and rarity stars', async () => {
    const wrapper = await mountSuspended(AkOperatorCard, {
      props: {
        operator: kaltsit,
      },
    })

    expect(wrapper.text()).toContain("Kal'tsit")
    expect(wrapper.text()).toContain('B003')
    expect(wrapper.text()).toContain('Medic')
    expect(wrapper.text()).toContain('★★★★★★')
    expect(wrapper.find('.ak-operator-card__cn-badge').exists()).toBe(false)
  })

  it('links to the operator detail page', async () => {
    const wrapper = await mountSuspended(AkOperatorCard, {
      props: {
        operator: kaltsit,
      },
    })

    const link = wrapper.find('a')
    expect(link.attributes('href')).toBe('/operators/char_003_kalts')
  })

  it('never displays a CN badge (server flags are unreliable)', async () => {
    const wrapper = await mountSuspended(AkOperatorCard, {
      props: {
        operator: cnOperator,
      },
    })

    expect(wrapper.find('.ak-operator-card__cn-badge').exists()).toBe(false)
  })

  it('has comprehensive aria-label for screen reader accessibility', async () => {
    const wrapper = await mountSuspended(AkOperatorCard, {
      props: {
        operator: kaltsit,
      },
    })

    const ariaLabel = wrapper.attributes('aria-label')
    expect(ariaLabel).toContain("Kal'tsit")
    expect(ariaLabel).toContain('6 stars')
  })
})
