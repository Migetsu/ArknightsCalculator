import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import AkStepper from '~/components/ui/AkStepper.vue'

describe('AkStepper', () => {
  it('renders input with value and plus/minus buttons', async () => {
    const wrapper = await mountSuspended(AkStepper, {
      props: {
        modelValue: 5,
        min: 0,
        max: 10,
      },
    })

    const input = wrapper.find('input[type="number"]')
    expect(input.exists()).toBe(true)
    expect((input.element as HTMLInputElement).value).toBe('5')

    const decBtn = wrapper.find('.ak-stepper__btn--dec')
    const incBtn = wrapper.find('.ak-stepper__btn--inc')
    expect(decBtn.exists()).toBe(true)
    expect(incBtn.exists()).toBe(true)
  })

  it('increments value on plus button click', async () => {
    const wrapper = await mountSuspended(AkStepper, {
      props: {
        modelValue: 5,
        min: 0,
        max: 10,
      },
    })

    const incBtn = wrapper.find('.ak-stepper__btn--inc')
    await incBtn.trigger('click')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([6])
  })

  it('decrements value on minus button click', async () => {
    const wrapper = await mountSuspended(AkStepper, {
      props: {
        modelValue: 5,
        min: 0,
        max: 10,
      },
    })

    const decBtn = wrapper.find('.ak-stepper__btn--dec')
    await decBtn.trigger('click')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([4])
  })

  it('respects min and max bounds', async () => {
    const wrapperMin = await mountSuspended(AkStepper, {
      props: {
        modelValue: 0,
        min: 0,
        max: 10,
      },
    })
    const decBtn = wrapperMin.find('.ak-stepper__btn--dec')
    expect(decBtn.attributes('disabled')).toBeDefined()

    const wrapperMax = await mountSuspended(AkStepper, {
      props: {
        modelValue: 10,
        min: 0,
        max: 10,
      },
    })
    const incBtn = wrapperMax.find('.ak-stepper__btn--inc')
    expect(incBtn.attributes('disabled')).toBeDefined()
  })

  it('handles keyboard ArrowUp and ArrowDown keys', async () => {
    const wrapper = await mountSuspended(AkStepper, {
      props: {
        modelValue: 5,
        min: 0,
        max: 10,
      },
    })

    const input = wrapper.find('input')
    await input.trigger('keydown', { key: 'ArrowUp' })
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([6])

    await input.trigger('keydown', { key: 'ArrowDown' })
    expect(wrapper.emitted('update:modelValue')?.[1]).toEqual([4])
  })

  it('applies wide modifier class when wide prop is true', async () => {
    const wrapper = await mountSuspended(AkStepper, {
      props: {
        modelValue: 450000,
        wide: true,
      },
    })

    const input = wrapper.find('.ak-stepper__input--wide')
    expect(input.exists()).toBe(true)
  })
})
