import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { useProfile } from '../../../app/composables/useProfile'

const mockUser = ref<{ sub?: string; id?: string; email?: string } | null>(null)

const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockMaybeSingle = vi.fn()
const mockUpdate = vi.fn()

const mockSupabase = {
  from: vi.fn(() => ({
    select: mockSelect,
    update: mockUpdate,
  })),
  auth: {
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
  },
}

mockNuxtImport('useSupabaseClient', () => () => mockSupabase)
mockNuxtImport('useSupabaseUser', () => () => mockUser)

describe('useProfile composable', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUser.value = null
    mockSelect.mockReturnValue({ eq: mockEq })
    mockEq.mockReturnValue({ maybeSingle: mockMaybeSingle })
    mockUpdate.mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
  })

  it('initializes with unauthenticated state when user is null', () => {
    const { isAuthenticated, userId, userEmail, profile, loading, error } = useProfile()
    expect(isAuthenticated.value).toBe(false)
    expect(userId.value).toBeNull()
    expect(userEmail.value).toBeNull()
    expect(profile.value).toBeNull()
    expect(loading.value).toBe(false)
    expect(error.value).toBeNull()
  })

  it('detects user authenticated state and extracts sub/id and email', () => {
    mockUser.value = {
      sub: 'usr-12345',
      email: 'doctor@rhodes.island',
    }
    const { isAuthenticated, userId, userEmail } = useProfile()
    expect(isAuthenticated.value).toBe(true)
    expect(userId.value).toBe('usr-12345')
    expect(userEmail.value).toBe('doctor@rhodes.island')
  })

  it('fetches profile successfully for authenticated user', async () => {
    mockUser.value = {
      sub: 'usr-12345',
      email: 'doctor@rhodes.island',
    }
    mockMaybeSingle.mockResolvedValueOnce({
      data: {
        id: 'usr-12345',
        display_name: 'Dr. Kaltsit',
        created_at: '2026-10-19T10:00:00Z',
        updated_at: '2026-10-19T10:00:00Z',
      },
      error: null,
    })

    const { fetchProfile, profile, error } = useProfile()
    const result = await fetchProfile()

    expect(result).not.toBeNull()
    expect(result?.displayName).toBe('Dr. Kaltsit')
    expect(profile.value?.displayName).toBe('Dr. Kaltsit')
    expect(error.value).toBeNull()
  })

  it('handles fetchProfile error gracefully', async () => {
    mockUser.value = {
      sub: 'usr-12345',
      email: 'doctor@rhodes.island',
    }
    mockMaybeSingle.mockResolvedValueOnce({
      data: null,
      error: { message: 'Database connection failed' },
    })

    const { fetchProfile, profile, error } = useProfile()
    const result = await fetchProfile()

    expect(result).toBeNull()
    expect(profile.value).toBeNull()
    expect(error.value).toBe('Database connection failed')
  })

  it('updates display name successfully', async () => {
    mockUser.value = {
      sub: 'usr-12345',
      email: 'doctor@rhodes.island',
    }
    const { updateDisplayName, profile } = useProfile()
    profile.value = {
      id: 'usr-12345',
      displayName: 'Old Name',
      createdAt: '2026-10-19T10:00:00Z',
      updatedAt: '2026-10-19T10:00:00Z',
    }

    const success = await updateDisplayName('New Doctor Name')
    expect(success).toBe(true)
    expect(profile.value.displayName).toBe('New Doctor Name')
  })

  it('signs in with email and password successfully', async () => {
    mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
      data: { user: { id: 'usr-12345' } },
      error: null,
    })

    const { signInWithEmail, error } = useProfile()
    const res = await signInWithEmail('test@example.com', 'password123')

    expect(res.success).toBe(true)
    expect(error.value).toBeNull()
    expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    })
  })

  it('handles signIn error and sets error state', async () => {
    mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
      data: { user: null },
      error: { message: 'Invalid login credentials' },
    })

    const { signInWithEmail, error } = useProfile()
    const res = await signInWithEmail('test@example.com', 'wrong')

    expect(res.success).toBe(false)
    expect(res.error).toBe('Invalid login credentials')
    expect(error.value).toBe('Invalid login credentials')
  })

  it('signs up with email, password, and display name', async () => {
    mockSupabase.auth.signUp.mockResolvedValueOnce({
      data: { user: { id: 'usr-67890' } },
      error: null,
    })

    const { signUpWithEmail } = useProfile()
    const res = await signUpWithEmail('new@example.com', 'pass1234', 'NewDoctor')

    expect(res.success).toBe(true)
    expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
      email: 'new@example.com',
      password: 'pass1234',
      options: {
        data: {
          display_name: 'NewDoctor',
        },
      },
    })
  })

  it('signs out and resets profile', async () => {
    mockSupabase.auth.signOut.mockResolvedValueOnce({ error: null })
    const { signOut, profile } = useProfile()
    profile.value = {
      id: 'usr-12345',
      displayName: 'Test',
      createdAt: '2026-10-19T10:00:00Z',
      updatedAt: '2026-10-19T10:00:00Z',
    }

    const res = await signOut()
    expect(res).toBe(true)
    expect(profile.value).toBeNull()
  })
})
