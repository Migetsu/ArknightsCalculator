import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import AkOperatorFilters from '~/components/operators/AkOperatorFilters.vue'
import { DEFAULT_OPERATOR_FILTERS } from '~/../shared/utils/operatorFilters'

describe('AkOperatorFilters', () => {
  it('renders search input and emits updated search value', async () => {
    const wrapper = await mountSuspended(AkOperatorFilters, {
      props: {
        modelValue: { ...DEFAULT_OPERATOR_FILTERS },
        subclasses: ['physician', 'sword'],
        factions: ['rhodes', 'lungmen'],
      },
    })

    const input = wrapper.find('input[type="search"]')
    expect(input.exists()).toBe(true)

    await input.setValue('amiya')
    const updateEvents = wrapper.emitted('update:modelValue')
    expect(updateEvents).toBeTruthy()
    expect(updateEvents?.[0]?.[0]).toMatchObject({ search: 'amiya' })
  })

  it('toggles class filter on chip click', async () => {
    const wrapper = await mountSuspended(AkOperatorFilters, {
      props: {
        modelValue: { ...DEFAULT_OPERATOR_FILTERS },
      },
    })

    // Find MEDIC chip button
    const buttons = wrapper.findAll('.ak-operator-filters__chip')
    const medicButton = buttons.find((btn) => btn.text().toLowerCase().includes('medic'))
    expect(medicButton).toBeDefined()

    await medicButton?.trigger('click')
    const updateEvents = wrapper.emitted('update:modelValue')
    expect(updateEvents).toBeTruthy()
    expect(updateEvents?.[0]?.[0]).toMatchObject({ classes: ['MEDIC'] })
  })

  it('toggles rarity filter on rarity chip click', async () => {
    const wrapper = await mountSuspended(AkOperatorFilters, {
      props: {
        modelValue: { ...DEFAULT_OPERATOR_FILTERS },
      },
    })

    // Find 6★ chip
    const sixStarChip = wrapper.find('.ak-operator-filters__chip--rarity-6')
    expect(sixStarChip.exists()).toBe(true)

    await sixStarChip.trigger('click')
    const updateEvents = wrapper.emitted('update:modelValue')
    expect(updateEvents).toBeTruthy()
    expect(updateEvents?.[0]?.[0]).toMatchObject({ rarities: [6] })
  })

  it('does not render a server switcher', async () => {
    const wrapper = await mountSuspended(AkOperatorFilters, {
      props: {
        modelValue: { ...DEFAULT_OPERATOR_FILTERS },
      },
    })

    expect(wrapper.findAll('.ak-operator-filters__server-btn')).toHaveLength(0)
  })

  it('displays and handles reset filters button when filters are active', async () => {
    const wrapper = await mountSuspended(AkOperatorFilters, {
      props: {
        modelValue: {
          ...DEFAULT_OPERATOR_FILTERS,
          search: 'texas',
          rarities: [5],
        },
      },
    })

    const resetBtn = wrapper.find('.ak-operator-filters__reset-btn')
    expect(resetBtn.exists()).toBe(true)

    await resetBtn.trigger('click')
    expect(wrapper.emitted('reset')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')?.[0]?.[0]).toEqual(DEFAULT_OPERATOR_FILTERS)
  })
})
