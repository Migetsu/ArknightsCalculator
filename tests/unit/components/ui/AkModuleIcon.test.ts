import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import AkModuleIcon from '~/components/ui/AkModuleIcon.vue'
import {
  PRIMARY_EQUIP_CDN_BASE,
  SECONDARY_EQUIP_CDN_BASE,
} from '../../../../shared/utils/resolveAsset'

describe('AkModuleIcon', () => {
  it('renders image element when moduleId is provided', async () => {
    const wrapper = await mountSuspended(AkModuleIcon, {
      props: {
        moduleId: 'uniequip_002_texas',
        name: 'Private Field Supply Package',
        typeCode: 'Y',
      },
    })

    const img = wrapper.find('.ak-module-icon__image')
    expect(img.exists()).toBe(true)
    expect(img.attributes('src')).toBe(
      `${PRIMARY_EQUIP_CDN_BASE}/equip/icon/uniequip_002_texas.png`,
    )
    expect(img.attributes('alt')).toBe('Private Field Supply Package')
  })

  it('cycles to secondary CDN candidate and then fallback code on error', async () => {
    const wrapper = await mountSuspended(AkModuleIcon, {
      props: {
        moduleId: 'uniequip_002_texas',
        name: 'Private Field Supply Package',
        typeCode: 'Y',
      },
    })

    const img = wrapper.find('.ak-module-icon__image')
    await img.trigger('error')

    expect(wrapper.find('.ak-module-icon__image').attributes('src')).toBe(
      `${SECONDARY_EQUIP_CDN_BASE}/equip/icon/uniequip_002_texas.png`,
    )

    // Trigger error again until fallback
    await wrapper.find('.ak-module-icon__image').trigger('error')
    await wrapper.find('.ak-module-icon__image').trigger('error')
    await wrapper.find('.ak-module-icon__image').trigger('error')

    expect(wrapper.find('.ak-module-icon__image').exists()).toBe(false)
    expect(wrapper.find('.ak-module-icon__fallback').exists()).toBe(true)
    expect(wrapper.find('.ak-module-icon__code').text()).toBe('Y')
  })

  it('renders stage badge when stage prop is provided', async () => {
    const wrapper = await mountSuspended(AkModuleIcon, {
      props: {
        moduleId: 'uniequip_002_texas',
        name: 'Private Field Supply Package',
        stage: 3,
      },
    })

    const stageBadge = wrapper.find('.ak-module-icon__stage')
    expect(stageBadge.exists()).toBe(true)
    expect(stageBadge.text()).toBe('3')
  })

  it('does not render stage badge when stage is omitted', async () => {
    const wrapper = await mountSuspended(AkModuleIcon, {
      props: {
        moduleId: 'uniequip_002_texas',
        name: 'Private Field Supply Package',
      },
    })

    expect(wrapper.find('.ak-module-icon__stage').exists()).toBe(false)
  })

  it('renders diamond border container with explicit size styling', async () => {
    const wrapper = await mountSuspended(AkModuleIcon, {
      props: {
        moduleId: 'uniequip_002_texas',
        name: 'Private Field Supply Package',
        size: 56,
      },
    })

    expect(wrapper.classes()).toContain('ak-module-icon--size-56')
    expect(wrapper.attributes('style')).toContain('width: 56px')
    expect(wrapper.attributes('style')).toContain('height: 56px')
    expect(wrapper.find('.ak-module-icon__diamond-border').exists()).toBe(true)
  })
})
