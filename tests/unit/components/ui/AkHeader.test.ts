import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import AkHeader from '../../../app/components/ui/AkHeader.vue'

describe('AkHeader', () => {
  it('renders ARKCALC brand logo and title', async () => {
    const wrapper = await mountSuspended(AkHeader)
    expect(wrapper.find('.ak-header__brand-title').text()).toBe('ARKCALC')
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
})
