import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import AkTabs from '../../../../app/components/ui/AkTabs.vue'

describe('AkTabs', () => {
  const sampleItems = [
    { id: 'tab1', label: 'Tab One' },
    { id: 'tab2', label: 'Tab Two' },
    { id: 'tab3', label: 'Tab Three', disabled: true },
  ]

  it('renders tablist, tabs and active tabpanel with WAI-ARIA roles', async () => {
    const wrapper = await mountSuspended(AkTabs, {
      props: {
        modelValue: 'tab1',
        items: sampleItems,
        ariaLabel: 'System Navigation',
      },
      slots: {
        default: ({ activeTab }) => `Content for ${activeTab}`,
      },
    })

    const tablist = wrapper.find('[role="tablist"]')
    expect(tablist.exists()).toBe(true)
    expect(tablist.attributes('aria-label')).toBe('System Navigation')

    const tabs = wrapper.findAll('[role="tab"]')
    expect(tabs.length).toBe(3)
    expect(tabs[0]?.attributes('aria-selected')).toBe('true')
    expect(tabs[0]?.attributes('tabindex')).toBe('0')
    expect(tabs[1]?.attributes('aria-selected')).toBe('false')
    expect(tabs[1]?.attributes('tabindex')).toBe('-1')
    expect(tabs[2]?.attributes('disabled')).toBeDefined()

    const panel = wrapper.find('[role="tabpanel"]')
    expect(panel.attributes('id')).toBe('panel-tab1')
    expect(panel.attributes('aria-labelledby')).toBe('tab-tab1')
    expect(panel.text()).toContain('Content for tab1')
  })

  it('emits update:modelValue on tab click', async () => {
    const wrapper = await mountSuspended(AkTabs, {
      props: {
        modelValue: 'tab1',
        items: sampleItems,
      },
    })

    const tabs = wrapper.findAll('[role="tab"]')
    await tabs[1]?.trigger('click')

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['tab2'])
  })

  it('does not emit update:modelValue when disabled tab is clicked', async () => {
    const wrapper = await mountSuspended(AkTabs, {
      props: {
        modelValue: 'tab1',
        items: sampleItems,
      },
    })

    const tabs = wrapper.findAll('[role="tab"]')
    await tabs[2]?.trigger('click')

    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('navigates through tabs using keyboard arrow keys', async () => {
    const wrapper = await mountSuspended(AkTabs, {
      props: {
        modelValue: 'tab1',
        items: sampleItems,
      },
    })

    const tabs = wrapper.findAll('[role="tab"]')
    // ArrowRight moves from tab1 to tab2 (skipping disabled tab3 on further navigation)
    await tabs[0]?.trigger('keydown', { key: 'ArrowRight' })
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['tab2'])

    // ArrowLeft moves back to tab1
    await tabs[1]?.trigger('keydown', { key: 'ArrowLeft' })
    expect(wrapper.emitted('update:modelValue')?.[1]).toEqual(['tab1'])
  })
})
