import { describe, it, expect, beforeEach } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { setActivePinia, createPinia } from 'pinia'
import GachaPityTooltip from '~/components/gacha/GachaPityTooltip.vue'

describe('GachaPityTooltip', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders trigger button with accessible attributes and closed state', async () => {
    const wrapper = await mountSuspended(GachaPityTooltip)

    const trigger = wrapper.find('.gacha-pity-tooltip__trigger')
    expect(trigger.exists()).toBe(true)
    expect(trigger.attributes('aria-haspopup')).toBe('dialog')
    expect(trigger.attributes('aria-expanded')).toBe('false')
    expect(trigger.attributes('aria-label')).toBeTruthy()
    expect(wrapper.find('.gacha-pity-tooltip__popover').exists()).toBe(false)
  })

  it('opens popover on click and displays 4 pity sections', async () => {
    const wrapper = await mountSuspended(GachaPityTooltip)

    const trigger = wrapper.find('.gacha-pity-tooltip__trigger')
    await trigger.trigger('click')

    expect(trigger.attributes('aria-expanded')).toBe('true')
    const popover = wrapper.find('.gacha-pity-tooltip__popover')
    expect(popover.exists()).toBe(true)
    expect(popover.attributes('role')).toBe('dialog')

    const sections = wrapper.findAll('.gacha-pity-tooltip__section')
    expect(sections.length).toBe(4)
  })

  it('closes popover when close button is clicked', async () => {
    const wrapper = await mountSuspended(GachaPityTooltip)

    const trigger = wrapper.find('.gacha-pity-tooltip__trigger')
    await trigger.trigger('click')
    expect(wrapper.find('.gacha-pity-tooltip__popover').exists()).toBe(true)

    const closeBtn = wrapper.find('.gacha-pity-tooltip__close-btn')
    await closeBtn.trigger('click')
    expect(wrapper.find('.gacha-pity-tooltip__popover').exists()).toBe(false)
    expect(trigger.attributes('aria-expanded')).toBe('false')
  })

  it('closes popover on Escape keydown', async () => {
    const wrapper = await mountSuspended(GachaPityTooltip)

    const trigger = wrapper.find('.gacha-pity-tooltip__trigger')
    await trigger.trigger('click')
    expect(wrapper.find('.gacha-pity-tooltip__popover').exists()).toBe(true)

    const event = new KeyboardEvent('keydown', { key: 'Escape' })
    document.dispatchEvent(event)
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.gacha-pity-tooltip__popover').exists()).toBe(false)
  })
})
