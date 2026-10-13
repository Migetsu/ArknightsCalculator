import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import AkChip from '~/components/ui/AkChip.vue'

describe('AkChip', () => {
  it('renders default state without active class', async () => {
    const wrapper = await mountSuspended(AkChip, {
      slots: {
        default: () => 'Guard',
      },
    })

    expect(wrapper.text()).toContain('Guard')
    expect(wrapper.classes()).toContain('ak-chip')
    expect(wrapper.classes()).not.toContain('ak-chip--active')
    expect(wrapper.attributes('aria-pressed')).toBe('false')
  })

  it('renders active state with active class and aria-pressed', async () => {
    const wrapper = await mountSuspended(AkChip, {
      props: {
        modelValue: true,
      },
      slots: {
        default: () => 'Caster',
      },
    })

    expect(wrapper.classes()).toContain('ak-chip--active')
    expect(wrapper.attributes('aria-pressed')).toBe('true')
  })

  it('emits update:modelValue and click event when clicked', async () => {
    const wrapper = await mountSuspended(AkChip, {
      props: {
        modelValue: false,
      },
      slots: {
        default: () => 'Medic',
      },
    })

    await wrapper.trigger('click')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([true])
    expect(wrapper.emitted('click')).toBeDefined()
  })

  it('does not emit events when disabled', async () => {
    const wrapper = await mountSuspended(AkChip, {
      props: {
        modelValue: false,
        disabled: true,
      },
      slots: {
        default: () => 'Disabled Chip',
      },
    })

    await wrapper.trigger('click')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })
})
