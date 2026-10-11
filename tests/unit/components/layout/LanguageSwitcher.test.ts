import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import LanguageSwitcher from '../../../../app/components/layout/LanguageSwitcher.vue'

describe('LanguageSwitcher', () => {
  it('renders available language buttons and sets active state', async () => {
    const wrapper = await mountSuspended(LanguageSwitcher)
    const buttons = wrapper.findAll('.language-switcher__btn')

    expect(buttons.length).toBe(2)
    expect(buttons[0]?.text()).toBe('EN')
    expect(buttons[1]?.text()).toBe('RU')

    // In default test environment, locale is 'en'
    expect(buttons[0]?.attributes('lang')).toBe('en')
    expect(buttons[0]?.attributes('hreflang')).toBe('en')
    expect(buttons[0]?.attributes('aria-current')).toBe('true')
    expect(buttons[0]?.classes()).toContain('language-switcher__btn--active')

    expect(buttons[1]?.attributes('lang')).toBe('ru')
    expect(buttons[1]?.attributes('hreflang')).toBe('ru')
    expect(buttons[1]?.attributes('aria-current')).toBeUndefined()
  })
})
