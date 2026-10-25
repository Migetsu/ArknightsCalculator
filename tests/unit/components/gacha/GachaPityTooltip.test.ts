import { describe, it, expect, beforeEach } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { setActivePinia, createPinia } from 'pinia'
import GachaPityTooltip from '~/components/gacha/GachaPityTooltip.vue'

describe('GachaPityTooltip', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders trigger button with accessible attributes and closed state', async () => {
    const wrapper = await mountSuspended(GachaPityTooltip, {
      props: {
        teleport: false,
      },
    })

    const trigger = wrapper.find('.gacha-pity-tooltip__trigger')
    expect(trigger.exists()).toBe(true)
    expect(trigger.attributes('aria-haspopup')).toBe('dialog')
    expect(trigger.attributes('aria-expanded')).toBe('false')
    expect(trigger.attributes('aria-label')).toBeTruthy()
    expect(wrapper.find('.ak-modal').exists()).toBe(false)
  })

  it('opens modal on click and displays 4 pity sections', async () => {
    const wrapper = await mountSuspended(GachaPityTooltip, {
      props: {
        teleport: false,
      },
    })

    const trigger = wrapper.find('.gacha-pity-tooltip__trigger')
    await trigger.trigger('click')

    expect(trigger.attributes('aria-expanded')).toBe('true')
    const modal = wrapper.find('.ak-modal')
    expect(modal.exists()).toBe(true)
    expect(modal.attributes('role')).toBe('dialog')

    const sections = wrapper.findAll('.gacha-pity-tooltip__section')
    expect(sections.length).toBe(4)

    expect(sections[0]?.text()).toContain('Base Rate & Soft Pity')
    expect(sections[0]?.text()).toContain('Base chance 2.0%')
    expect(sections[1]?.text()).toContain('Limited Banners & 300 Spark')
    expect(sections[1]?.text()).toContain('300 spark certificates')
    expect(sections[2]?.text()).toContain('Standard Solo Banners (150 Guarantee)')
    expect(sections[2]?.text()).toContain('150th pull')
    expect(sections[3]?.text()).toContain('Currency Conversions')
    expect(sections[3]?.text()).toContain('3.33 OP per 1 pull')
  })

  it('closes modal when close button is clicked', async () => {
    const wrapper = await mountSuspended(GachaPityTooltip, {
      props: {
        teleport: false,
      },
    })

    const trigger = wrapper.find('.gacha-pity-tooltip__trigger')
    await trigger.trigger('click')
    expect(wrapper.find('.ak-modal').exists()).toBe(true)

    const closeBtn = wrapper.find('.ak-modal__close')
    expect(closeBtn.exists()).toBe(true)
    await closeBtn.trigger('click')
    expect(wrapper.find('.ak-modal').exists()).toBe(false)
    expect(trigger.attributes('aria-expanded')).toBe('false')
  })

  it('closes modal on Escape keydown', async () => {
    const wrapper = await mountSuspended(GachaPityTooltip, {
      props: {
        teleport: false,
      },
    })

    const trigger = wrapper.find('.gacha-pity-tooltip__trigger')
    await trigger.trigger('click')
    expect(wrapper.find('.ak-modal').exists()).toBe(true)

    const event = new KeyboardEvent('keydown', { key: 'Escape' })
    window.dispatchEvent(event)
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.ak-modal').exists()).toBe(false)
  })
})
