import { describe, it, expect, vi, beforeEach } from 'vitest'
import { computed, ref } from 'vue'
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
  isAuthenticated: computed(() => !!mockUser.value),
  userId: ref(mockUser.value?.id ?? mockUser.value?.sub ?? null),
  userEmail: ref(mockUser.value?.email ?? null),
  fetchProfile: mockFetchProfile,
  updateDisplayName: vi.fn(),
  signInWithEmail: mockSignIn,
  signUpWithEmail: mockSignUp,
  signOut: mockSignOut,
}))

// Yostar integration state is driven directly so no network call can happen.
const yostarEnabled = ref(true)
const yostarSendingCode = ref(false)
const yostarSyncing = ref(false)
const yostarCodeSent = ref(false)
const yostarError = ref<string | null>(null)
const yostarResult = ref<unknown>(null)
const yostarSession = ref<{ uid: string; token: string; expiresAt: string } | null>(null)
const yostarHasSession = ref(false)
const mockSendCode = vi.fn().mockResolvedValue(true)
const mockStartSync = vi.fn().mockResolvedValue(false)
const mockSyncWithSession = vi.fn().mockResolvedValue(false)
const mockForget = vi.fn()

mockNuxtImport('useYostarSync', () => () => ({
  enabled: yostarEnabled,
  sendingCode: yostarSendingCode,
  syncing: yostarSyncing,
  codeSent: yostarCodeSent,
  error: yostarError,
  result: yostarResult,
  session: yostarSession,
  hasSession: yostarHasSession,
  sendCode: mockSendCode,
  startSync: mockStartSync,
  syncWithSession: mockSyncWithSession,
  forget: mockForget,
  reset: vi.fn(),
}))

const mockRosterImport = vi.fn().mockResolvedValue(undefined)
const mockDepotImport = vi.fn().mockResolvedValue(undefined)

mockNuxtImport('useRosterStore', () => () => ({
  importSync: mockRosterImport,
  operators: ref({}),
  operatorCount: ref(0),
  doctor: ref({ name: '', level: 1 }),
}))
mockNuxtImport('useDepotStore', () => () => ({
  importSnapshot: mockDepotImport,
  items: ref({}),
  currencies: ref({ lmd: 0, orundum: 0, originitePrime: 0 }),
}))

const syncPayload = {
  doctor: { name: 'Doctor', level: 108, server: 'en' },
  operators: [
    {
      charId: 'char_003_kalts',
      elite: 2,
      level: 90,
      skillLevel: 7,
      potential: 4,
      favor: 150,
      skills: {},
      modules: {},
    },
  ],
  depot: {
    currencies: { lmd: 100, orundum: 5, originitePrime: 1 },
    items: { '30115': 4 },
  },
  unknownOperatorIds: [],
  unknownItemCount: 0,
  skippedEntries: 0,
  syncedAt: '2026-10-21T10:00:00.000Z',
}

async function openYostarTab() {
  const wrapper = await mountSuspended(SyncAccountModal, {
    props: { modelValue: true, teleport: false },
  })
  const tabs = wrapper.findAll('.sync-modal__tab')
  await tabs[1]?.trigger('click')
  return wrapper
}

describe('SyncAccountModal.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUser.value = null
    mockProfile.value = null
    mockLoading.value = false
    mockError.value = null
    yostarEnabled.value = true
    yostarSendingCode.value = false
    yostarSyncing.value = false
    yostarCodeSent.value = false
    yostarError.value = null
    yostarResult.value = null
    yostarSession.value = null
    yostarHasSession.value = false
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

  describe('Yostar tab', () => {
    it('disables the send button until an e-mail is typed', async () => {
      const wrapper = await openYostarTab()

      const sendBtn = wrapper.find('.sync-modal__send-btn')
      expect(sendBtn.attributes('disabled')).toBeDefined()

      await wrapper.find('input[name="yostar-email"]').setValue('test@example.com')
      expect(wrapper.find('.sync-modal__send-btn').attributes('disabled')).toBeUndefined()
    })

    it('requests a code and reflects the loading and sent states', async () => {
      const wrapper = await openYostarTab()
      await wrapper.find('input[name="yostar-email"]').setValue('test@example.com')

      await wrapper.find('.sync-modal__send-btn').trigger('click')
      expect(mockSendCode).toHaveBeenCalledWith('test@example.com')

      yostarCodeSent.value = true
      yostarSendingCode.value = true
      await wrapper.vm.$nextTick()

      const sendBtn = wrapper.find('.sync-modal__send-btn')
      expect(sendBtn.text().toUpperCase()).toContain('SENDING')
      expect(sendBtn.attributes('disabled')).toBeDefined()
    })

    it('renders a readable error when the proxy rejects the code', async () => {
      const wrapper = await openYostarTab()

      yostarError.value = 'invalid_code'
      await wrapper.vm.$nextTick()

      const alert = wrapper.find('.sync-modal__auth-error')
      expect(alert.exists()).toBe(true)
      expect(alert.text().toLowerCase()).toContain('verification code')
      expect(alert.text()).not.toContain('invalid_code')
    })

    it('disables the start button until both e-mail and code are present', async () => {
      const wrapper = await openYostarTab()

      const footerButtons = wrapper.findAll('.sync-modal__footer-actions button')
      const startBtn = footerButtons[footerButtons.length - 1]
      expect(startBtn?.attributes('disabled')).toBeDefined()

      await wrapper.find('input[name="yostar-email"]').setValue('test@example.com')
      await wrapper.find('input[name="yostar-code"]').setValue('123456')
      expect(
        wrapper.findAll('.sync-modal__footer-actions button').at(-1)?.attributes('disabled'),
      ).toBeUndefined()
    })

    it('imports the payload into the roster and depot stores, then shows a summary', async () => {
      mockStartSync.mockImplementation(async () => {
        yostarResult.value = syncPayload
        return true
      })

      const wrapper = await openYostarTab()
      await wrapper.find('input[name="yostar-email"]').setValue('test@example.com')
      await wrapper.find('input[name="yostar-code"]').setValue('123456')

      await wrapper.findAll('.sync-modal__footer-actions button').at(-1)?.trigger('click')
      await flushPromises()

      expect(mockStartSync).toHaveBeenCalledWith('test@example.com', '123456')
      expect(mockRosterImport).toHaveBeenCalledWith(syncPayload)
      expect(mockDepotImport).toHaveBeenCalledWith({
        items: syncPayload.depot.items,
        currencies: syncPayload.depot.currencies,
      })

      const success = wrapper.find('.sync-modal__auth-success')
      expect(success.exists()).toBe(true)
      expect(success.text()).toContain('SYNC COMPLETE')
      expect(success.text()).toContain('1 operators')
      expect(wrapper.find('input[name="yostar-email"]').exists()).toBe(false)
    })

    it('closes the modal from the DONE button after a successful sync', async () => {
      yostarResult.value = syncPayload
      const wrapper = await openYostarTab()

      const doneBtn = wrapper.findAll('.sync-modal__footer-actions button').at(-1)
      expect(doneBtn?.text().toUpperCase()).toContain('DONE')

      await doneBtn?.trigger('click')
      expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false])
    })

    it('shows the empty state when the account returned nothing', async () => {
      yostarResult.value = {
        ...syncPayload,
        operators: [],
        depot: { currencies: syncPayload.depot.currencies, items: {} },
      }
      const wrapper = await openYostarTab()

      const success = wrapper.find('.sync-modal__auth-success')
      expect(success.text().toLowerCase()).toContain('no operators')
    })

    it('reports skipped unknown ids instead of hiding them', async () => {
      yostarResult.value = {
        ...syncPayload,
        unknownOperatorIds: ['char_999_future'],
        unknownItemCount: 2,
      }
      const wrapper = await openYostarTab()

      const muted = wrapper.find('.sync-modal__success-muted')
      expect(muted.exists()).toBe(true)
      expect(muted.text()).toContain('1 operators')
      expect(muted.text()).toContain('2 items')
    })

    it('disables the whole tab when the feature flag is off', async () => {
      yostarEnabled.value = false
      const wrapper = await openYostarTab()

      expect(wrapper.find('.sync-modal__regions').exists()).toBe(false)
      expect(wrapper.find('input[name="yostar-email"]').exists()).toBe(false)
      const alert = wrapper.find('.sync-modal__auth-error')
      expect(alert.text().toLowerCase()).toContain('disabled')
      expect(
        wrapper.findAll('.sync-modal__footer-actions button').at(-1)?.attributes('disabled'),
      ).toBeDefined()
    })

    it('marks non-EN regions as unsupported', async () => {
      const wrapper = await openYostarTab()

      const regions = wrapper.findAll('.sync-modal__reg-btn')
      expect(regions).toHaveLength(4)
      expect(regions[0]?.attributes('disabled')).toBeUndefined()
      expect(regions[1]?.attributes('disabled')).toBeDefined()
      expect(regions[1]?.attributes('title')).toBeTruthy()
    })

    it('shows the stored-session panel instead of the code form', async () => {
      yostarSession.value = {
        uid: 'channel-uid',
        token: 'yostar-account-token',
        expiresAt: '2026-11-20T10:00:00.000Z',
      }
      yostarHasSession.value = true

      const wrapper = await openYostarTab()

      const panel = wrapper.find('.sync-modal__auth-success')
      expect(panel.exists()).toBe(true)
      expect(panel.text()).toContain('SAVED SESSION')
      expect(panel.text()).toContain('2026-11-20')
      expect(panel.text().toLowerCase()).toContain('localstorage')

      expect(wrapper.find('input[name="yostar-email"]').exists()).toBe(false)
      expect(wrapper.find('input[name="yostar-code"]').exists()).toBe(false)

      const startBtn = wrapper.findAll('.sync-modal__footer-actions button').at(-1)
      expect(startBtn?.text().toUpperCase()).toContain('SYNC NOW')
      expect(startBtn?.attributes('disabled')).toBeUndefined()
    })

    it('syncs again from the stored session without asking for a code', async () => {
      yostarSession.value = {
        uid: 'channel-uid',
        token: 'yostar-account-token',
        expiresAt: '2026-11-20T10:00:00.000Z',
      }
      yostarHasSession.value = true
      mockSyncWithSession.mockImplementation(async () => {
        yostarResult.value = syncPayload
        return true
      })

      const wrapper = await openYostarTab()
      await wrapper.findAll('.sync-modal__footer-actions button').at(-1)?.trigger('click')
      await flushPromises()

      expect(mockSyncWithSession).toHaveBeenCalled()
      expect(mockStartSync).not.toHaveBeenCalled()
      expect(mockRosterImport).toHaveBeenCalledWith(syncPayload)
      expect(wrapper.find('.sync-modal__auth-success').text()).toContain('SYNC COMPLETE')
    })

    it('disconnects the stored session and returns to the e-mail form', async () => {
      yostarSession.value = {
        uid: 'channel-uid',
        token: 'yostar-account-token',
        expiresAt: '2026-11-20T10:00:00.000Z',
      }
      yostarHasSession.value = true

      const wrapper = await openYostarTab()
      await wrapper.find('.sync-modal__disconnect-btn').trigger('click')
      expect(mockForget).toHaveBeenCalled()

      yostarHasSession.value = false
      yostarSession.value = null
      await wrapper.vm.$nextTick()

      expect(wrapper.find('input[name="yostar-email"]').exists()).toBe(true)
      expect(wrapper.find('.sync-modal__disconnect-btn').exists()).toBe(false)
    })

    it('explains an expired session error and keeps the code form', async () => {
      yostarHasSession.value = false
      yostarError.value = 'invalid_session'

      const wrapper = await openYostarTab()

      const alert = wrapper.find('.sync-modal__auth-error')
      expect(alert.text().toLowerCase()).toContain('session expired')
      expect(wrapper.find('input[name="yostar-code"]').exists()).toBe(true)
    })
  })

  it('reports an immediate sign-in after registration when a session exists', async () => {
    mockSignUp.mockImplementation(async () => {
      // Supabase creates the session during signUp when confirmation is disabled.
      mockUser.value = { sub: 'usr-42', id: 'usr-42', email: 'doctor@rhodes.island' }
      return { success: true }
    })

    const wrapper = await mountSuspended(SyncAccountModal, {
      props: { modelValue: true, teleport: false },
    })

    await wrapper.findAll('.sync-modal__sub-tab')[1]?.trigger('click')
    await wrapper.findAll('input')[0]?.setValue('doctor@rhodes.island')
    await wrapper.findAll('input')[1]?.setValue('secret123')
    await wrapper.find('.sync-modal__auth-submit-btn').trigger('click')
    await flushPromises()

    const success = wrapper.find('.sync-modal__auth-success')
    expect(success.exists()).toBe(true)
    expect(success.text()).toContain('Account created and signed in.')
    expect(success.text().toLowerCase()).not.toContain('check email')
  })
})

async function flushPromises(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0))
}
