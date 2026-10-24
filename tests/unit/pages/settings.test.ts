import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref } from 'vue'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import SettingsPage from '../../../app/pages/settings.vue'

const mockIsAuthenticated = ref(false)
const mockUserId = ref<string | null>(null)

mockNuxtImport('useProfile', () => () => ({
  isAuthenticated: mockIsAuthenticated,
  userId: mockUserId,
  userEmail: ref(null),
  profile: ref(null),
  loading: ref(false),
  error: ref(null),
  fetchProfile: vi.fn(),
  updateProfile: vi.fn(),
  resetProfile: vi.fn(),
}))

describe('SettingsPage', () => {
  beforeEach(() => {
    mockIsAuthenticated.value = false
    mockUserId.value = null
  })

  it('renders settings title and sections', async () => {
    const wrapper = await mountSuspended(SettingsPage)
    expect(wrapper.find('.settings-page__title').text()).toBe('Settings')

    const sections = wrapper.findAll('.settings-page__section')
    // Server, Farming Sanity, Account, Cloud Sync, Your data, Game data, About
    expect(sections.length).toBe(7)
  })

  it('renders drop data server toggle buttons', async () => {
    const wrapper = await mountSuspended(SettingsPage)
    const toggleBtns = wrapper.findAll('.settings-page__toggle-btn')
    expect(toggleBtns.length).toBe(2) // 2 for server (CN, Global)
  })

  it('renders guest prompt and login link in Cloud Sync section when unauthenticated', async () => {
    mockIsAuthenticated.value = false
    mockUserId.value = null

    const wrapper = await mountSuspended(SettingsPage)
    const cloudSyncSection = wrapper.find('.settings-page__section--cloud-sync')

    expect(cloudSyncSection.exists()).toBe(true)
    expect(cloudSyncSection.text()).toContain('Log in to sync across devices')

    const loginLink = cloudSyncSection.find('a[href="/login"]')
    expect(loginLink.exists()).toBe(true)
    expect(loginLink.text()).toContain('Log In')

    // Authenticated-only actions should not be present
    expect(cloudSyncSection.find('.settings-page__cloud-sync-content').exists()).toBe(false)
  })

  it('renders status badge and sync actions in Cloud Sync section when authenticated', async () => {
    mockIsAuthenticated.value = true
    mockUserId.value = 'test-doctor-uuid'

    const wrapper = await mountSuspended(SettingsPage)
    const cloudSyncSection = wrapper.find('.settings-page__section--cloud-sync')

    expect(cloudSyncSection.exists()).toBe(true)
    expect(cloudSyncSection.text()).not.toContain('Log in to sync across devices')

    const content = cloudSyncSection.find('.settings-page__cloud-sync-content')
    expect(content.exists()).toBe(true)
    expect(content.text()).toContain('Last synced:')
    expect(content.text()).toContain('Sync now')
    expect(content.text()).toContain('Disconnect')
  })
})
