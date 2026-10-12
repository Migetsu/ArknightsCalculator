import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import AkAvatar from '~/components/ui/AkAvatar.vue'

describe('AkAvatar', () => {
  it('renders image element when src is provided', async () => {
    const wrapper = await mountSuspended(AkAvatar, {
      props: {
        src: 'https://example.com/blaze.png',
        name: 'Blaze',
        rarity: 6,
      },
    })

    const img = wrapper.find('.ak-avatar__image')
    expect(img.exists()).toBe(true)
    expect(img.attributes('src')).toBe('https://example.com/blaze.png')
    expect(img.attributes('alt')).toBe('Blaze')
  })

  it('renders initials fallback when src is missing', async () => {
    const wrapper = await mountSuspended(AkAvatar, {
      props: {
        name: 'Silver Ash',
        rarity: 6,
      },
    })

    expect(wrapper.find('.ak-avatar__image').exists()).toBe(false)
    const fallback = wrapper.find('.ak-avatar__fallback')
    expect(fallback.exists()).toBe(true)
    expect(fallback.text()).toBe('SA')
  })

  it('switches to fallback initials when image encounters error', async () => {
    const wrapper = await mountSuspended(AkAvatar, {
      props: {
        src: 'https://example.com/non-existent.png',
        name: 'Doctor',
        rarity: 6,
      },
    })

    const img = wrapper.find('.ak-avatar__image')
    expect(img.exists()).toBe(true)

    await img.trigger('error')

    expect(wrapper.find('.ak-avatar__fallback').exists()).toBe(true)
    expect(wrapper.find('.ak-avatar__initials').text()).toBe('DO')
  })

  it('applies rarity modifier classes correctly', async () => {
    const wrapper = await mountSuspended(AkAvatar, {
      props: {
        name: 'Amiya',
        rarity: 5,
      },
    })

    expect(wrapper.classes()).toContain('ak-avatar--rarity-5')
  })
})
