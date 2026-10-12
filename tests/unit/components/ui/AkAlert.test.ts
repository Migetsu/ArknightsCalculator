import { describe, it, expect } from 'vitest'
import { h } from 'vue'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import AkAlert from '~/components/ui/AkAlert.vue'

describe('AkAlert', () => {
  it('renders badge, title, and default slot content', async () => {
    const wrapper = await mountSuspended(AkAlert, {
      props: {
        badge: 'PRTS // STANDBY',
        title: 'NO GAME ACCOUNT SYNCHRONIZED',
        variant: 'warning',
      },
      slots: {
        default: () => 'Alert body message',
      },
    })

    expect(wrapper.find('.ak-alert__badge').text()).toBe('PRTS // STANDBY')
    expect(wrapper.find('.ak-alert__title').text()).toBe('NO GAME ACCOUNT SYNCHRONIZED')
    expect(wrapper.find('.ak-alert__body').text()).toBe('Alert body message')
    expect(wrapper.classes()).toContain('ak-alert--warning')
  })

  it('renders actions slot when provided', async () => {
    const wrapper = await mountSuspended(AkAlert, {
      props: {
        variant: 'info',
      },
      slots: {
        actions: () => h('button', { class: 'test-action' }, 'Action'),
      },
    })

    expect(wrapper.find('.ak-alert__actions').exists()).toBe(true)
    expect(wrapper.find('.test-action').text()).toBe('Action')
  })
})
