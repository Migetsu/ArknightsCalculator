import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import AkHeader from '../../../app/components/ui/AkHeader.vue'

describe('AkHeader', () => {
  it('renders RhodesLab brand logo and title', async () => {
    const wrapper = await mountSuspended(AkHeader)
    expect(wrapper.find('.ak-header__brand-title').text()).toBe('RHODESLAB')
    expect(wrapper.find('.ak-header__brand-svg').exists()).toBe(true)
  })

  it('renders desktop navigation links excluding settings', async () => {
    const wrapper = await mountSuspended(AkHeader)
    const navLinks = wrapper.findAll('.ak-header__nav-link')
    expect(navLinks.length).toBeGreaterThan(0)

    const linkTexts = navLinks.map((link) => link.text())
    expect(linkTexts.some((text) => text.toLowerCase().includes('settings'))).toBe(false)
  })

  it('renders dedicated settings link in header actions', async () => {
    const wrapper = await mountSuspended(AkHeader)
    const settingsLink = wrapper.find('.ak-header__settings-link')
    expect(settingsLink.exists()).toBe(true)
    expect(settingsLink.attributes('href')).toContain('/settings')
  })

  it('renders sync button with status dot and does not render soon badge in desktop nav', async () => {
    const wrapper = await mountSuspended(AkHeader)
    const syncBtn = wrapper.find('.ak-header__sync-btn')
    expect(syncBtn.exists()).toBe(true)
    expect(syncBtn.find('.ak-header__sync-dot').exists()).toBe(true)

    // No soon badge in desktop navigation
    const nav = wrapper.find('.ak-header__nav')
    expect(nav.find('.ak-header__soon-badge').exists()).toBe(false)
  })
})
