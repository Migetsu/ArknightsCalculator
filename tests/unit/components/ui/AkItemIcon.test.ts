import { describe, it, expect, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import AkItemIcon from '~/components/ui/AkItemIcon.vue'
import { PRIMARY_CDN_BASE, SECONDARY_CDN_BASE } from '../../../../shared/utils/resolveAsset'
import { readOperatorDataFixture } from '../../support/operatorDataFixture'

const mockFetch = vi.hoisted(() => vi.fn())
mockNuxtImport('$fetch', () => mockFetch)
mockFetch.mockImplementation((url: string) => readOperatorDataFixture(url))

describe('AkItemIcon', () => {
  it('renders image element when itemId is provided', async () => {
    const wrapper = await mountSuspended(AkItemIcon, {
      props: {
        itemId: 'mod_unlock_token',
        name: 'Data Update Chip',
        tier: 5,
      },
    })

    const img = wrapper.find('.ak-item-icon__image')
    expect(img.exists()).toBe(true)
    expect(img.attributes('src')).toBe(`${PRIMARY_CDN_BASE}/item/mod_unlock_token.png`)
    expect(img.attributes('alt')).toBe('Data Update Chip')
  })

  it('prefers iconId over itemId when provided', async () => {
    const wrapper = await mountSuspended(AkItemIcon, {
      props: {
        itemId: '30012',
        iconId: 'MTL_SL_G2',
        name: 'Orirock Cube',
        tier: 2,
      },
    })

    const img = wrapper.find('.ak-item-icon__image')
    expect(img.attributes('src')).toBe(`${PRIMARY_CDN_BASE}/item/MTL_SL_G2.png`)
  })

  it('cycles through CDN candidates and then fallback initials on error', async () => {
    const wrapper = await mountSuspended(AkItemIcon, {
      props: {
        itemId: 'mod_unlock_token',
        name: 'Data Update Chip',
        tier: 5,
      },
    })

    const img = wrapper.find('.ak-item-icon__image')
    await img.trigger('error')

    expect(wrapper.find('.ak-item-icon__image').attributes('src')).toBe(
      `${SECONDARY_CDN_BASE}/item/mod_unlock_token.png`,
    )

    // Trigger error on all remaining candidate URLs
    await wrapper.find('.ak-item-icon__image').trigger('error')
    await wrapper.find('.ak-item-icon__image').trigger('error')
    await wrapper.find('.ak-item-icon__image').trigger('error')

    expect(wrapper.find('.ak-item-icon__image').exists()).toBe(false)
    expect(wrapper.find('.ak-item-icon__fallback').exists()).toBe(true)
    expect(wrapper.find('.ak-item-icon__initials').text()).toBe('DUC')
  })

  it('automatically resolves material 30012 to MTL_SL_G2.png without explicit iconId or tier', async () => {
    const wrapper = await mountSuspended(AkItemIcon, {
      props: {
        itemId: '30012',
      },
    })

    const img = wrapper.find('.ak-item-icon__image')
    expect(img.exists()).toBe(true)
    expect(img.attributes('src')).toBe(`${PRIMARY_CDN_BASE}/item/MTL_SL_G2.png`)
    expect(img.attributes('alt')).toBe('Orirock Cube')
    expect(wrapper.classes()).toContain('ak-item-icon--tier-2')
  })

  it('automatically resolves currency 4001 LMD to GOLD.png without explicit iconId', async () => {
    const wrapper = await mountSuspended(AkItemIcon, {
      props: {
        itemId: '4001',
        name: 'LMD',
        tier: 4,
      },
    })

    const img = wrapper.find('.ak-item-icon__image')
    expect(img.exists()).toBe(true)
    expect(img.attributes('src')).toBe(`${PRIMARY_CDN_BASE}/item/GOLD.png`)
  })

  it('renders count badge when count prop is provided', async () => {
    const wrapper = await mountSuspended(AkItemIcon, {
      props: {
        itemId: '30011',
        name: 'Orirock',
        tier: 1,
        count: '×240',
      },
    })

    const badge = wrapper.find('.ak-item-icon__count')
    expect(badge.exists()).toBe(true)
    expect(badge.text()).toBe('×240')
  })

  it('does not render count badge when count is omitted', async () => {
    const wrapper = await mountSuspended(AkItemIcon, {
      props: {
        itemId: '30011',
        name: 'Orirock',
        tier: 1,
      },
    })

    expect(wrapper.find('.ak-item-icon__count').exists()).toBe(false)
  })

  it('applies correct tier modifier class', async () => {
    const wrapper = await mountSuspended(AkItemIcon, {
      props: {
        itemId: '30115',
        name: 'D32 Steel',
        tier: 5,
      },
    })

    expect(wrapper.classes()).toContain('ak-item-icon--tier-5')
  })

  it('sets width and height attributes according to size prop', async () => {
    const wrapper = await mountSuspended(AkItemIcon, {
      props: {
        itemId: '30012',
        name: 'Orirock Cube',
        size: 56,
      },
    })

    const img = wrapper.find('.ak-item-icon__image')
    expect(img.attributes('width')).toBe('56')
    expect(img.attributes('height')).toBe('56')
    expect(wrapper.classes()).toContain('ak-item-icon--size-56')
  })
})
