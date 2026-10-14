import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import DepotItemCard from '../../../../app/components/depot/DepotItemCard.vue'

describe('DepotItemCard', () => {
  const mockItem = {
    id: '30014',
    name: {
      en: 'Orirock Concentration',
      zh: '提纯源岩',
      source: 'official' as const,
    },
    rarity: 4,
    type: 'material',
    sortId: 100033,
    iconId: 'MTL_SL_G4',
  }

  it('renders item icon, name, and stepper with correct initial count', async () => {
    const wrapper = await mountSuspended(DepotItemCard, {
      props: {
        item: mockItem,
        count: 12,
      },
    })

    expect(wrapper.text()).toContain('Orirock Concentration')
    const input = wrapper.find('input[type="number"]')
    expect(input.exists()).toBe(true)
    expect((input.element as HTMLInputElement).value).toBe('12')
  })

  it('emits update:count when stepper is incremented', async () => {
    const wrapper = await mountSuspended(DepotItemCard, {
      props: {
        item: mockItem,
        count: 5,
      },
    })

    const incBtn = wrapper.find('.ak-stepper__btn--inc')
    await incBtn.trigger('click')

    expect(wrapper.emitted('update:count')?.[0]).toEqual([6])
  })

  it('renders translation badge when item has machine/community translation', async () => {
    const machineItem = {
      ...mockItem,
      name: {
        en: 'Test Machine Item',
        zh: '测试机器翻译',
        source: 'machine' as const,
      },
    }

    const wrapper = await mountSuspended(DepotItemCard, {
      props: {
        item: machineItem,
        count: 0,
      },
    })

    const badge = wrapper.find('.ak-translation-badge')
    expect(badge.exists()).toBe(true)
    expect(badge.text()).toContain('MT')
  })
})
