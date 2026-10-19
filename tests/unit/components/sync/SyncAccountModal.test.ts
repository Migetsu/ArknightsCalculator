import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import SyncAccountModal from '../../../../app/components/sync/SyncAccountModal.vue'

const mockUser = ref<{ sub?: string; id?: string; email?: string } | null>(null)
const mockProfile = ref<{
  id: string
  displayName: string | null
  createdAt: string
  updatedAt: string
} | null>(null)
const mockLoading = ref(false)
const mockError = ref<string | null>(null)

const mockSignIn = vi.fn().mockResolvedValue({ success: true })
const mockSignUp = vi.fn().mockResolvedValue({ success: true })
const mockSignOut = vi.fn().mockResolvedValue(true)
const mockFetchProfile = vi.fn().mockResolvedValue(null)

mockNuxtImport('useProfile', () => () => ({
  user: mockUser,
  profile: mockProfile,
  loading: mockLoading,
  error: mockError,
  isAuthenticated: ref(!!mockUser.value),
  userId: ref(mockUser.value?.id ?? mockUser.value?.sub ?? null),
  userEmail: ref(mockUser.value?.email ?? null),
  fetchProfile: mockFetchProfile,
  updateDisplayName: vi.fn(),
  signInWithEmail: mockSignIn,
  signUpWithEmail: mockSignUp,
  signOut: mockSignOut,
}))

describe('SyncAccountModal.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUser.value = null
    mockProfile.value = null
    mockLoading.value = false
    mockError.value = null
  })

  it('renders modal with cloud account tab active by default and unauthenticated status', async () => {
    const wrapper = await mountSuspended(SyncAccountModal, {
      props: { modelValue: true, teleport: false },
    })

    const statusBadge = wrapper.find('.sync-modal__status-badge')
    expect(statusBadge.exists()).toBe(true)
    expect(statusBadge.text().toUpperCase()).toContain('NOT AUTHENTICATED')

    const authForm = wrapper.find('.sync-modal__auth-form')
    expect(authForm.exists()).toBe(true)

    const inputs = wrapper.findAll('.sync-modal__input')
    expect(inputs.length).toBeGreaterThanOrEqual(2) // email and password
  })

  it('switches between Sign In and Register sub-tabs', async () => {
    const wrapper = await mountSuspended(SyncAccountModal, {
      props: { modelValue: true, teleport: false },
    })

    const subTabs = wrapper.findAll('.sync-modal__sub-tab')
    expect(subTabs.length).toBe(2)

    // Switch to Register (tab index 1)
    await subTabs[1]?.trigger('click')

    const labels = wrapper.findAll('.sync-modal__field-label')
    const hasDisplayName = labels.some((l) => l.text().toUpperCase().includes('DISPLAY NAME'))
    expect(hasDisplayName).toBe(true)
  })

  it('renders error alert when authError is present', async () => {
    mockError.value = 'Invalid email or password'
    const wrapper = await mountSuspended(SyncAccountModal, {
      props: { modelValue: true, teleport: false },
    })

    const errorAlert = wrapper.find('.sync-modal__auth-error')
    expect(errorAlert.exists()).toBe(true)
    expect(errorAlert.text()).toBe('Invalid email or password')
  })

  it('renders connecting status badge when authLoading is true', async () => {
    mockLoading.value = true
    const wrapper = await mountSuspended(SyncAccountModal, {
      props: { modelValue: true, teleport: false },
    })

    const statusBadge = wrapper.find('.sync-modal__status-badge')
    expect(statusBadge.classes()).toContain('sync-modal__status-badge--loading')
    expect(statusBadge.text().toUpperCase()).toContain('CONNECTING')
  })

  it('renders authenticated card when user is logged in', async () => {
    mockUser.value = {
      sub: 'usr-42',
      id: 'usr-42',
      email: 'doctor@rhodes.island',
    }
    mockProfile.value = {
      id: 'usr-42',
      displayName: 'Doctor Amiya',
      createdAt: '2026-10-19T10:00:00Z',
      updatedAt: '2026-10-19T10:00:00Z',
    }

    const wrapper = await mountSuspended(SyncAccountModal, {
      props: { modelValue: true, teleport: false },
    })

    const statusBadge = wrapper.find('.sync-modal__status-badge')
    expect(statusBadge.text().toUpperCase()).toContain('AUTHENTICATED')

    const authView = wrapper.find('.sync-modal__authenticated-view')
    expect(authView.exists()).toBe(true)
    expect(authView.text()).toContain('doctor@rhodes.island')
    expect(authView.text()).toContain('Doctor Amiya')
    expect(authView.text()).toContain('usr-42')

    const signOutBtn = wrapper.find('.sync-modal__signout-btn')
    expect(signOutBtn.exists()).toBe(true)

    await signOutBtn.trigger('click')
    expect(mockSignOut).toHaveBeenCalled()
  })

  it('switches to Yostar and Demo tabs seamlessly', async () => {
    const wrapper = await mountSuspended(SyncAccountModal, {
      props: { modelValue: true, teleport: false },
    })

    const tabs = wrapper.findAll('.sync-modal__tab')
    expect(tabs.length).toBe(4) // email, yostar, json, demo

    // Switch to Yostar tab (tab index 1)
    await tabs[1]?.trigger('click')
    expect(wrapper.find('.sync-modal__regions').exists()).toBe(true)

    // Switch to Demo tab (tab index 3)
    await tabs[3]?.trigger('click')
    const loadDemoBtn = wrapper.find('.sync-modal__content .sync-modal__btn-primary')
    expect(loadDemoBtn.exists()).toBe(true)

    await loadDemoBtn.trigger('click')
    expect(wrapper.emitted('load-demo')).toBeTruthy()
  })
})
