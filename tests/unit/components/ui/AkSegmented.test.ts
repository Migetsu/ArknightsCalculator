import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import AkSegmented from '~/components/ui/AkSegmented.vue'

describe('AkSegmented', () => {
  const options = [
    { value: 'global', label: 'Global' },
    { value: 'cn', label: 'CN' },
    { value: 'jp', label: 'JP', disabled: true },
  ]

  it('renders options with active option highlighted', async () => {
    const wrapper = await mountSuspended(AkSegmented, {
      props: {
        modelValue: 'global',
        options,
      },
    })

    const buttons = wrapper.findAll('.ak-segmented__btn')
    expect(buttons.length).toBe(3)
    expect(buttons[0]?.classes()).toContain('ak-segmented__btn--active')
    expect(buttons[0]?.attributes('aria-pressed')).toBe('true')
    expect(buttons[1]?.classes()).not.toContain('ak-segmented__btn--active')
    expect(buttons[2]?.attributes('disabled')).toBeDefined()
  })

  it('emits update:modelValue on click', async () => {
    const wrapper = await mountSuspended(AkSegmented, {
      props: {
        modelValue: 'global',
        options,
      },
    })

    const buttons = wrapper.findAll('.ak-segmented__btn')
    await buttons[1]?.trigger('click')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['cn'])
  })

  it('does not emit on click of disabled option', async () => {
    const wrapper = await mountSuspended(AkSegmented, {
      props: {
        modelValue: 'global',
        options,
      },
    })

    const buttons = wrapper.findAll('.ak-segmented__btn')
    await buttons[2]?.trigger('click')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })
})
