import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import AkAvatar from '~/components/ui/AkAvatar.vue'
import { PRIMARY_CDN_BASE, SECONDARY_CDN_BASE } from '../../../../shared/utils/resolveAsset'

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

  it('resolves primary CDN image candidate when operator id is provided', async () => {
    const wrapper = await mountSuspended(AkAvatar, {
      props: {
        id: 'char_102_texas',
        name: 'Texas',
        rarity: 5,
      },
    })

    const img = wrapper.find('.ak-avatar__image')
    expect(img.exists()).toBe(true)
    expect(img.attributes('src')).toBe(`${PRIMARY_CDN_BASE}/avatar/char_102_texas.png`)
    expect(img.attributes('alt')).toBe('Texas')
  })

  it('cycles through fallback candidates on error, ending with initials fallback', async () => {
    const wrapper = await mountSuspended(AkAvatar, {
      props: {
        id: 'char_102_texas',
        name: 'Texas',
        rarity: 5,
      },
    })

    const img = wrapper.find('.ak-avatar__image')
    expect(img.attributes('src')).toBe(`${PRIMARY_CDN_BASE}/avatar/char_102_texas.png`)

    // First error: switch to secondary CDN candidate
    await img.trigger('error')
    expect(wrapper.find('.ak-avatar__image').attributes('src')).toBe(
      `${SECONDARY_CDN_BASE}/avatar/char_102_texas.png`,
    )

    // Second error: all candidates exhausted, render initials fallback
    await wrapper.find('.ak-avatar__image').trigger('error')
    expect(wrapper.find('.ak-avatar__image').exists()).toBe(false)
    expect(wrapper.find('.ak-avatar__fallback').exists()).toBe(true)
    expect(wrapper.find('.ak-avatar__initials').text()).toBe('TE')
  })

  it('sets width, height, loading lazy and decoding async attributes to prevent layout shift', async () => {
    const wrapper = await mountSuspended(AkAvatar, {
      props: {
        id: 'char_102_texas',
        name: 'Texas',
        size: 'lg',
        rarity: 5,
      },
    })

    const img = wrapper.find('.ak-avatar__image')
    expect(img.attributes('width')).toBe('56')
    expect(img.attributes('height')).toBe('56')
    expect(img.attributes('loading')).toBe('lazy')
    expect(img.attributes('decoding')).toBe('async')
  })

  it('renders initials fallback when neither src nor id is provided', async () => {
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
