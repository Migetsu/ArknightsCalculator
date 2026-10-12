import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import AkContainer from '~/components/ui/AkContainer.vue'

describe('AkContainer', () => {
  it('renders default container with lg size and padded modifier', async () => {
    const wrapper = await mountSuspended(AkContainer, {
      slots: {
        default: () => 'Container Content',
      },
    })

    expect(wrapper.text()).toContain('Container Content')
    expect(wrapper.classes()).toContain('ak-container')
    expect(wrapper.classes()).toContain('ak-container--size-lg')
    expect(wrapper.classes()).toContain('ak-container--padded')
  })

  it('renders specified size and can disable padding', async () => {
    const wrapper = await mountSuspended(AkContainer, {
      props: {
        size: 'sm',
        padded: false,
        tag: 'section',
      },
    })

    expect(wrapper.element.tagName.toLowerCase()).toBe('section')
    expect(wrapper.classes()).toContain('ak-container--size-sm')
    expect(wrapper.classes()).not.toContain('ak-container--padded')
  })
})
