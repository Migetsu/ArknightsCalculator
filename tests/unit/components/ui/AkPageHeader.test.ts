import { describe, it, expect } from 'vitest'
import { h } from 'vue'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import AkPageHeader from '~/components/ui/AkPageHeader.vue'

describe('AkPageHeader', () => {
  it('renders title, code, tagLabel, and subtitle', async () => {
    const wrapper = await mountSuspended(AkPageHeader, {
      props: {
        code: 'PLN-01',
        tagLabel: 'OPERATOR PLANNER',
        title: 'Promotion Planner',
        subtitle: 'Calculate elite promotion and mastery materials.',
        watermark: 'PLANNER',
        badge: 'SOON',
        badgeVariant: 'amber',
      },
    })

    expect(wrapper.find('.ak-page-header__title').text()).toBe('Promotion Planner')
    expect(wrapper.find('.ak-page-header__code').text()).toContain('PLN-01 // OPERATOR PLANNER')
    expect(wrapper.find('.ak-page-header__subtitle').text()).toBe(
      'Calculate elite promotion and mastery materials.',
    )
    expect(wrapper.find('.ak-page-header__watermark').text()).toBe('PLANNER')
    expect(wrapper.find('.ak-page-header__badge').text()).toBe('SOON')
  })

  it('renders actions and badge slots when provided', async () => {
    const wrapper = await mountSuspended(AkPageHeader, {
      props: {
        title: 'Gacha Calculator',
      },
      slots: {
        actions: () => h('button', { class: 'test-action-btn' }, 'Action'),
        badge: () => h('span', { class: 'test-custom-badge' }, 'CUSTOM'),
      },
    })

    expect(wrapper.find('.test-action-btn').exists()).toBe(true)
    expect(wrapper.find('.test-custom-badge').exists()).toBe(true)
  })
})
