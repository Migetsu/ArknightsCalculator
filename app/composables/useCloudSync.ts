import { watch, getCurrentInstance, onBeforeUnmount, type Ref } from 'vue'
import type { Database, Json } from '~/types/database.types'
import {
  UserDataRowSchema,
  type UserDataRow,
  type UserDataPayload,
} from '~~/shared/schemas/userData'

export interface UseCloudSyncReturn {
  cloudUserData: Ref<UserDataRow | null>
  pulling: Ref<boolean>
  pushing: Ref<boolean>
  lastSyncedAt: Ref<Date | null>
  error: Ref<string | null>
  hasPendingChanges: Ref<boolean>
  pull: (opts?: { acceptEmpty?: boolean }) => Promise<'loaded' | 'empty' | 'error'>
  push: (payload: UserDataPayload) => Promise<boolean>
  forget: () => Promise<boolean>
  reset: () => void
  startAutoSync: (sources: () => UserDataPayload, opts?: { debounceMs?: number }) => () => void
}

export function useCloudSync(): UseCloudSyncReturn {
  const supabase = useSupabaseClient<Database>()
  const { userId } = useProfile()

  const cloudUserData = useState<UserDataRow | null>('cloud_user_data', () => null)
  const pulling = useState<boolean>('cloud_sync_pulling', () => false)
  const pushing = useState<boolean>('cloud_sync_pushing', () => false)
  const lastSyncedAt = useState<Date | null>('cloud_sync_last_synced_at', () => null)
  const error = useState<string | null>('cloud_sync_error', () => null)
  const hasPendingChanges = useState<boolean>('cloud_sync_has_pending', () => false)

  async function pull(_opts?: { acceptEmpty?: boolean }): Promise<'loaded' | 'empty' | 'error'> {
    const uid = userId.value
    if (!uid) {
      error.value = 'User not authenticated'
      return 'error'
    }

    pulling.value = true
    error.value = null

    try {
      const { data, error: dbError } = await supabase
        .from('user_data')
        .select('*')
        .eq('user_id', uid)
        .maybeSingle()

      if (dbError) {
        error.value = dbError.message
        return 'error'
      }

      if (!data) {
        return 'empty'
      }

      const parsed = UserDataRowSchema.safeParse(data)
      if (!parsed.success) {
        error.value = `Failed to validate cloud user data schema: ${parsed.error.message}`
        return 'error'
      }

      cloudUserData.value = parsed.data
      lastSyncedAt.value = new Date(parsed.data.updated_at)
      return 'loaded'
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error during pull'
      return 'error'
    } finally {
      pulling.value = false
    }
  }

  async function push(payload: UserDataPayload): Promise<boolean> {
    const uid = userId.value
    if (!uid) {
      error.value = 'User not authenticated'
      return false
    }

    pushing.value = true
    error.value = null

    try {
      const rowToUpsert = {
        user_id: uid,
        plans: payload.plans as unknown as Json,
        settings: payload.settings as unknown as Json,
        depot: payload.depot as unknown as Json,
        roster_synced_at: payload.roster_synced_at ?? null,
        updated_at: new Date().toISOString(),
      }

      const { data, error: dbError } = await supabase
        .from('user_data')
        .upsert(rowToUpsert)
        .select('*')
        .maybeSingle()

      if (dbError) {
        error.value = dbError.message
        return false
      }

      if (data) {
        const parsed = UserDataRowSchema.safeParse(data)
        if (parsed.success) {
          cloudUserData.value = parsed.data
          lastSyncedAt.value = new Date(parsed.data.updated_at)
        } else {
          lastSyncedAt.value = new Date()
        }
      } else {
        lastSyncedAt.value = new Date()
      }

      hasPendingChanges.value = false
      return true
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error during push'
      return false
    } finally {
      pushing.value = false
    }
  }

  async function forget(): Promise<boolean> {
    const uid = userId.value
    if (!uid) {
      error.value = 'User not authenticated'
      return false
    }

    error.value = null

    try {
      const { error: dbError } = await supabase.from('user_data').delete().eq('user_id', uid)

      if (dbError) {
        error.value = dbError.message
        return false
      }

      cloudUserData.value = null
      lastSyncedAt.value = null
      hasPendingChanges.value = false
      return true
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error during forget'
      return false
    }
  }

  function startAutoSync(
    sources: () => UserDataPayload,
    opts?: { debounceMs?: number },
  ): () => void {
    const debounceMs = opts?.debounceMs ?? 2000
    let timer: ReturnType<typeof setTimeout> | null = null

    const unwatch = watch(
      sources,
      (newVal) => {
        if (!userId.value) return
        hasPendingChanges.value = true
        if (timer) clearTimeout(timer)
        timer = setTimeout(() => {
          void push(newVal)
        }, debounceMs)
      },
      { deep: true },
    )

    const cleanup = () => {
      if (timer) {
        clearTimeout(timer)
        timer = null
      }
      unwatch()
    }

    if (getCurrentInstance()) {
      onBeforeUnmount(cleanup)
    }

    return cleanup
  }

  function reset(): void {
    cloudUserData.value = null
    lastSyncedAt.value = null
    error.value = null
    pulling.value = false
    pushing.value = false
    hasPendingChanges.value = false
  }

  return {
    cloudUserData,
    pulling,
    pushing,
    lastSyncedAt,
    error,
    hasPendingChanges,
    pull,
    push,
    forget,
    reset,
    startAutoSync,
  }
}
