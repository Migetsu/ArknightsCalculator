import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref } from 'vue'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { usePlannerStore } from '~/stores/planner'
import { useDepotStore } from '~/stores/depot'
import IndexPage from '../../../app/pages/index.vue'

const mockIsAuthenticated = ref(false)
const mockUserId = ref<string | null>(null)
const mockUserEmail = ref<string | null>(null)
const mockProfile = ref<{ displayName?: string } | null>(null)
const mockLoading = ref(false)

mockNuxtImport('useProfile', () => () => ({
  isAuthenticated: mockIsAuthenticated,
  userId: mockUserId,
  userEmail: mockUserEmail,
  profile: mockProfile,
  loading: mockLoading,
  error: ref(null),
  fetchProfile: vi.fn(),
  updateDisplayName: vi.fn(),
  signInWithEmail: vi.fn(),
  signUpWithEmail: vi.fn(),
  signOut: vi.fn(),
}))

describe('IndexPage', () => {
  beforeEach(() => {
    mockIsAuthenticated.value = false
    mockUserId.value = null
    mockUserEmail.value = null
    mockProfile.value = null
    mockLoading.value = false
  })

  it('mounts in Nuxt environment and displays dashboard overview title when unauthenticated', async () => {
    const wrapper = await mountSuspended(IndexPage)
    expect(wrapper.find('.dashboard-page__title').exists()).toBe(true)
    expect(wrapper.find('.dashboard-page__title').text()).toBe('Welcome back, Doctor')
    expect(wrapper.find('.dashboard-page__stats-grid').exists()).toBe(true)

    // Sync button and Load Demo buttons exist
    const primaryBtn = wrapper.find('.dashboard-page__btn-primary')
    expect(primaryBtn.element.tagName).toBe('BUTTON')
    expect(primaryBtn.text()).toBe('Sync account')

    const demoBtn = wrapper.find('.dashboard-page__btn-outline')
    expect(demoBtn.exists()).toBe(true)
    expect(demoBtn.text()).toContain('LOAD DEMO DATA')
  })

  it('displays user displayName and manage account link when authenticated with profile', async () => {
    mockIsAuthenticated.value = true
    mockUserId.value = 'doctor-123'
    mockProfile.value = { displayName: 'Amiya' }

    const wrapper = await mountSuspended(IndexPage)
    expect(wrapper.find('.dashboard-page__title').text()).toBe('Welcome back, Amiya')

    // Primary action is link to /settings, and demo button is hidden
    const manageLink = wrapper.find('a.dashboard-page__btn-primary')
    expect(manageLink.exists()).toBe(true)
    expect(manageLink.attributes('href')).toBe('/settings')
    expect(manageLink.text()).toBe('Manage account')

    expect(wrapper.find('.dashboard-page__btn-outline').exists()).toBe(false)
  })

  it('falls back to user email when profile displayName is absent', async () => {
    mockIsAuthenticated.value = true
    mockUserId.value = 'doctor-123'
    mockUserEmail.value = 'doctor@rhodes.island'
    mockProfile.value = null

    const wrapper = await mountSuspended(IndexPage)
    expect(wrapper.find('.dashboard-page__title').text()).toBe('Welcome back, doctor@rhodes.island')
  })

  it('renders countdown timer with days, hours, minutes, and seconds units', async () => {
    const wrapper = await mountSuspended(IndexPage)
    const units = wrapper.findAll('.dashboard-page__countdown-unit').map((u) => u.text())
    expect(units).toEqual(['DAYS', 'HRS', 'MIN', 'SEC'])
    const nums = wrapper.findAll('.dashboard-page__countdown-num')
    expect(nums.length).toBe(4)
  })

  it('displays real active plans count from plannerStore in ACTIVE PLANS metric tile', async () => {
    const plannerStore = usePlannerStore()
    plannerStore.plans = [
      {
        id: 'plan_1',
        operatorId: 'char_002_amiya',
        current: { elite: 0, level: 1, skillLevels: {}, masteries: {}, modules: {} },
        target: { elite: 2, level: 50, skillLevels: {}, masteries: {}, modules: {} },
        priority: 1,
        note: '',
        createdAt: '2026-10-25T12:00:00Z',
      },
      {
        id: 'plan_2',
        operatorId: 'char_003_kalts',
        current: { elite: 1, level: 1, skillLevels: {}, masteries: {}, modules: {} },
        target: { elite: 2, level: 90, skillLevels: {}, masteries: {}, modules: {} },
        priority: 2,
        note: '',
        createdAt: '2026-10-25T12:00:00Z',
      },
    ]

    const wrapper = await mountSuspended(IndexPage)
    const statCards = wrapper.findAll('.dashboard-page__stat-card')
    const plansCard = statCards.find((c) => c.text().includes('ACTIVE PLANS'))
    expect(plansCard?.find('.dashboard-page__stat-val').text()).toBe('2')
  })

  it('displays real available pulls from depotStore currencies and tickets in PULLS metric tile', async () => {
    const depotStore = useDepotStore()
    depotStore.currencies.orundum = 12000 // 20 pulls
    depotStore.currencies.originitePrime = 30 // 30*180/600 = 9 pulls
    depotStore.items['7003'] = 5 // 5 pulls
    depotStore.items['7004'] = 1 // 10 pulls
    // Total = 20 + 9 + 5 + 10 = 44 pulls

    const wrapper = await mountSuspended(IndexPage)
    const statCards = wrapper.findAll('.dashboard-page__stat-card')
    const pullsCard = statCards.find((c) => c.text().includes('PULLS'))
    expect(pullsCard?.find('.dashboard-page__stat-val').text()).toBe('44')
  })

  it('displays active banner commemorative coins from depotStore in SPARK metric tile', async () => {
    const depotStore = useDepotStore()
    depotStore.items['LMTGS_COIN_7301'] = 58

    const wrapper = await mountSuspended(IndexPage)
    const statCards = wrapper.findAll('.dashboard-page__stat-card')
    const sparkCard = statCards.find((c) => c.text().includes('SPARK'))
    expect(sparkCard?.find('.dashboard-page__stat-val').text()).toBe('58 / 300')
  })
})
