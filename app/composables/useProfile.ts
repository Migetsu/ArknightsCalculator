import { ref, computed } from 'vue'
import type { Ref, ComputedRef } from 'vue'
import type { JwtPayload } from '@supabase/supabase-js'
import type { Profile, RawProfile } from '~~/shared/schemas/profile'
import { mapRawProfile } from '~~/shared/schemas/profile'
import type { Database } from '~/types/database.types'

export interface UseProfileReturn {
  user: Ref<JwtPayload | null>
  profile: Ref<Profile | null>
  loading: Ref<boolean>
  error: Ref<string | null>
  isAuthenticated: ComputedRef<boolean>
  userId: ComputedRef<string | null>
  userEmail: ComputedRef<string | null>
  fetchProfile: () => Promise<Profile | null>
  updateDisplayName: (displayName: string) => Promise<boolean>
  signInWithEmail: (
    email: string,
    password: string,
  ) => Promise<{ success: boolean; error?: string }>
  signUpWithEmail: (
    email: string,
    password: string,
    displayName?: string,
  ) => Promise<{ success: boolean; error?: string }>
  signOut: () => Promise<boolean>
}

export function useProfile(): UseProfileReturn {
  const supabase = useSupabaseClient<Database>()
  const user = useSupabaseUser()

  const profile = useState<Profile | null>('supabase_user_profile', () => null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const isAuthenticated = computed(() => !!user.value)

  const userId = computed(() => {
    if (!user.value) return null
    return (user.value as { id?: string; sub?: string }).id ?? user.value.sub ?? null
  })

  const userEmail = computed(() => {
    if (!user.value) return null
    return user.value.email ?? null
  })

  async function fetchProfile(): Promise<Profile | null> {
    const uid = userId.value
    if (!uid) {
      profile.value = null
      return null
    }

    loading.value = true
    error.value = null

    try {
      const res = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle()

      if (res?.error) {
        error.value = res.error.message
        profile.value = null
        return null
      }

      if (res?.data) {
        profile.value = mapRawProfile(res.data as RawProfile)
      } else {
        profile.value = null
      }
      return profile.value
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Unknown error fetching profile'
      profile.value = null
      return null
    } finally {
      loading.value = false
    }
  }

  async function updateDisplayName(displayName: string): Promise<boolean> {
    const uid = userId.value
    if (!uid) {
      error.value = 'User not authenticated'
      return false
    }

    loading.value = true
    error.value = null

    try {
      const { error: updateErr } = await supabase
        .from('profiles')
        .update({ display_name: displayName })
        .eq('id', uid)

      if (updateErr) {
        error.value = updateErr.message
        return false
      }

      if (profile.value) {
        profile.value.displayName = displayName
      }
      return true
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Unknown error updating profile'
      return false
    } finally {
      loading.value = false
    }
  }

  async function signInWithEmail(
    email: string,
    password: string,
  ): Promise<{ success: boolean; error?: string }> {
    loading.value = true
    error.value = null
    try {
      const authRes = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (authRes?.error) {
        error.value = authRes.error.message
        return { success: false, error: authRes.error.message }
      }
      if (authRes?.data?.user) {
        user.value = authRes.data.user as unknown as JwtPayload
      }
      await fetchProfile()
      return { success: true }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error signing in'
      error.value = msg
      return { success: false, error: msg }
    } finally {
      loading.value = false
    }
  }

  async function signUpWithEmail(
    email: string,
    password: string,
    displayName?: string,
  ): Promise<{ success: boolean; error?: string }> {
    loading.value = true
    error.value = null
    try {
      const authRes = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName || undefined,
          },
        },
      })
      if (authRes?.error) {
        error.value = authRes.error.message
        return { success: false, error: authRes.error.message }
      }
      if (authRes?.data?.user) {
        user.value = authRes.data.user as unknown as JwtPayload
      }
      await fetchProfile()
      return { success: true }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error signing up'
      error.value = msg
      return { success: false, error: msg }
    } finally {
      loading.value = false
    }
  }

  async function signOut(): Promise<boolean> {
    loading.value = true
    error.value = null
    try {
      const signRes = await supabase.auth.signOut()
      if (signRes?.error) {
        error.value = signRes.error.message
        return false
      }
      user.value = null
      profile.value = null
      return true
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Unknown error signing out'
      return false
    } finally {
      loading.value = false
    }
  }

  return {
    user,
    profile,
    loading,
    error,
    isAuthenticated,
    userId,
    userEmail,
    fetchProfile,
    updateDisplayName,
    signInWithEmail,
    signUpWithEmail,
    signOut,
  }
}
