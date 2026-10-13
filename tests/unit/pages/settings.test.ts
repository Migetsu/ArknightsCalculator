import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import SettingsPage from '../../../app/pages/settings.vue'

describe('SettingsPage', () => {
  it('renders settings title and sections', async () => {
    const wrapper = await mountSuspended(SettingsPage)
    expect(wrapper.find('.settings-page__title').text()).toBe('Settings')

    const sections = wrapper.findAll('.settings-page__section')
    expect(sections.length).toBe(6) // Language, Server, Account, Your data, Game data, About
  })

  it('renders language toggle buttons', async () => {
    const wrapper = await mountSuspended(SettingsPage)
    const toggleBtns = wrapper.findAll('.settings-page__toggle-btn')
    expect(toggleBtns.length).toBeGreaterThanOrEqual(4) // 2 for lang + 2 for server
  })
})
