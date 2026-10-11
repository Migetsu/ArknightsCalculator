import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import AkButton from '../../../../app/components/ui/AkButton.vue'

describe('AkButton', () => {
  it('renders default button with primary variant and md size', async () => {
    const wrapper = await mountSuspended(AkButton, {
      slots: {
        default: () => 'Deploy',
      },
    })

    expect(wrapper.text()).toContain('Deploy')
    expect(wrapper.classes()).toContain('ak-button')
    expect(wrapper.classes()).toContain('ak-button--primary')
    expect(wrapper.classes()).toContain('ak-button--md')
    expect(wrapper.classes()).toContain('ak-button--cut')
  })

  it('applies variant and size modifier classes correctly', async () => {
    const wrapper = await mountSuspended(AkButton, {
      props: {
        variant: 'danger',
        size: 'lg',
        cutCorner: false,
      },
      slots: {
        default: () => 'Retreat',
      },
    })

    expect(wrapper.classes()).toContain('ak-button--danger')
    expect(wrapper.classes()).toContain('ak-button--lg')
    expect(wrapper.classes()).not.toContain('ak-button--cut')
  })

  it('handles disabled state and prevents click event emission', async () => {
    const wrapper = await mountSuspended(AkButton, {
      props: {
        disabled: true,
      },
      slots: {
        default: () => 'Disabled',
      },
    })

    const button = wrapper.find('button')
    expect(button.attributes('disabled')).toBeDefined()
    expect(wrapper.classes()).toContain('ak-button--disabled')

    await button.trigger('click')
    expect(wrapper.emitted('click')).toBeUndefined()
  })

  it('renders loading spinner and sets aria-busy attribute', async () => {
    const wrapper = await mountSuspended(AkButton, {
      props: {
        loading: true,
      },
      slots: {
        default: () => 'Processing',
      },
    })

    expect(wrapper.attributes('aria-busy')).toBe('true')
    expect(wrapper.find('.ak-button__spinner').exists()).toBe(true)

    await wrapper.trigger('click')
    expect(wrapper.emitted('click')).toBeUndefined()
  })

  it('renders as NuxtLink when to prop is provided', async () => {
    const wrapper = await mountSuspended(AkButton, {
      props: {
        to: '/operators',
      },
      slots: {
        default: () => 'Operators Link',
      },
    })

    expect(wrapper.find('a').exists()).toBe(true)
    expect(wrapper.attributes('role')).toBe('button')
  })
})
