import { computed, ref } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import {
  YOSTAR_SESSION_STORAGE_KEY,
  YostarErrorReasonSchema,
  YostarSessionSchema,
  YostarSyncPayloadSchema,
  type YostarErrorReason,
  type YostarSession,
  type YostarSyncPayload,
} from '~~/shared/schemas/yostar'

/**
 * Client state for the Yostar e-mail login flow.
 *
 * Credentials (e-mail, code) live in component refs and are never persisted. The
 * Yostar account token is different: by owner decision (2026-10-21) it is kept in
 * `localStorage` under a namespaced key so a repeat sync does not ask for the code
 * again. It never goes to Supabase or any server storage; the proxy is stateless.
 * Nothing here logs the token.
 */

export interface UseYostarSyncReturn {
  /** False when the deployment disabled the integration (`NUXT_PUBLIC_YOSTAR_SYNC_ENABLED`). */
  enabled: ComputedRef<boolean>
  sendingCode: Ref<boolean>
  syncing: Ref<boolean>
  codeSent: Ref<boolean>
  error: Ref<YostarErrorReason | null>
  result: Ref<YostarSyncPayload | null>
  /** Valid (non-expired) token found on this device, if any. */
  session: Ref<YostarSession | null>
  hasSession: ComputedRef<boolean>
  sendCode: (email: string) => Promise<boolean>
  /** Fresh login with e-mail + code; stores the account token on success. */
  startSync: (email: string, code: string) => Promise<boolean>
  /** Repeat sync with the stored token; no e-mail or code needed. */
  syncWithSession: () => Promise<boolean>
  /** Drops the stored token and everything derived from it. */
  forget: () => void
  reset: () => void
}

function readStatus(error: unknown): number | null {
  if (typeof error !== 'object' || error === null) return null
  const record = error as { statusCode?: unknown; status?: unknown; response?: unknown }
  if (typeof record.statusCode === 'number') return record.statusCode
  if (typeof record.status === 'number') return record.status
  if (typeof record.response === 'object' && record.response !== null) {
    const status = (record.response as { status?: unknown }).status
    if (typeof status === 'number') return status
  }
  return null
}

/**
 * Normalizes a `$fetch` failure into a user-facing reason. The proxy always
 * answers with `{ ok: false, error }`, so the body wins over the status code.
 */
export function readYostarErrorReason(
  error: unknown,
  fallback: YostarErrorReason,
): YostarErrorReason {
  if (typeof error === 'object' && error !== null) {
    const body = (error as { data?: unknown }).data
    if (typeof body === 'object' && body !== null) {
      const parsed = YostarErrorReasonSchema.safeParse((body as { error?: unknown }).error)
      if (parsed.success) return parsed.data
    }
  }

  const status = readStatus(error)
  if (status === 401) return 'invalid_session'
  if (status === 429) return 'rate_limited'
  if (status === 504) return 'timeout'
  if (status === 404) return 'disabled'
  if (status === 400) return fallback
  return 'unavailable'
}

function storageAvailable(): boolean {
  try {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
  } catch {
    return false
  }
}

/**
 * Reads the token kept on this device. Expired, unreadable or foreign-shaped
 * entries are removed instead of being trusted.
 */
export function readStoredYostarSession(now = Date.now()): YostarSession | null {
  if (!storageAvailable()) return null

  try {
    const raw = window.localStorage.getItem(YOSTAR_SESSION_STORAGE_KEY)
    if (!raw) return null

    const parsed = YostarSessionSchema.safeParse(JSON.parse(raw))
    if (!parsed.success) {
      window.localStorage.removeItem(YOSTAR_SESSION_STORAGE_KEY)
      return null
    }

    const expiresAt = Date.parse(parsed.data.expiresAt)
    if (!Number.isFinite(expiresAt) || expiresAt <= now) {
      window.localStorage.removeItem(YOSTAR_SESSION_STORAGE_KEY)
      return null
    }

    return parsed.data
  } catch {
    // Unreadable JSON is not a session: drop it instead of failing every time.
    try {
      window.localStorage.removeItem(YOSTAR_SESSION_STORAGE_KEY)
    } catch {
      // Nothing else to do; the caller still sees "no session".
    }
    return null
  }
}

/** Persists the token on this device, or clears it when `session` is null. */
export function writeStoredYostarSession(session: YostarSession | null): void {
  if (!storageAvailable()) return

  try {
    if (session) {
      window.localStorage.setItem(YOSTAR_SESSION_STORAGE_KEY, JSON.stringify(session))
    } else {
      window.localStorage.removeItem(YOSTAR_SESSION_STORAGE_KEY)
    }
  } catch {
    // Private mode or a full quota: the flow still works, it just forgets sooner.
  }
}

export function useYostarSync(): UseYostarSyncReturn {
  const config = useRuntimeConfig()
  const enabled = computed(() => config.public.yostarSyncEnabled !== false)

  const sendingCode = ref(false)
  const syncing = ref(false)
  const codeSent = ref(false)
  const error = ref<YostarErrorReason | null>(null)
  const result = ref<YostarSyncPayload | null>(null)
  const session = ref<YostarSession | null>(readStoredYostarSession())
  const hasSession = computed(() => session.value !== null)

  function dropSession(): void {
    session.value = null
    writeStoredYostarSession(null)
  }

  async function sendCode(email: string): Promise<boolean> {
    if (!enabled.value) {
      error.value = 'disabled'
      return false
    }

    sendingCode.value = true
    error.value = null
    codeSent.value = false

    try {
      await $fetch('/api/yostar/send-code', { method: 'POST', body: { email } })
      codeSent.value = true
      return true
    } catch (err: unknown) {
      error.value = readYostarErrorReason(err, 'invalid_email')
      return false
    } finally {
      sendingCode.value = false
    }
  }

  async function startSync(email: string, code: string): Promise<boolean> {
    if (!enabled.value) {
      error.value = 'disabled'
      return false
    }

    syncing.value = true
    error.value = null
    result.value = null

    try {
      const response = await $fetch('/api/yostar/login', {
        method: 'POST',
        body: { email, code },
      })
      const payload = YostarSyncPayloadSchema.safeParse(response)
      const nextSession = YostarSessionSchema.safeParse(
        (response as { session?: unknown } | null)?.session,
      )
      if (!payload.success || !nextSession.success) {
        error.value = 'invalid_payload'
        return false
      }

      result.value = payload.data
      session.value = nextSession.data
      writeStoredYostarSession(nextSession.data)
      return true
    } catch (err: unknown) {
      error.value = readYostarErrorReason(err, 'invalid_code')
      return false
    } finally {
      syncing.value = false
    }
  }

  async function syncWithSession(): Promise<boolean> {
    const current = session.value
    if (!enabled.value) {
      error.value = 'disabled'
      return false
    }
    if (!current) {
      error.value = 'invalid_session'
      return false
    }

    syncing.value = true
    error.value = null
    result.value = null

    try {
      const response = await $fetch('/api/yostar/sync', {
        method: 'POST',
        body: { uid: current.uid, token: current.token },
      })
      const payload = YostarSyncPayloadSchema.safeParse(response)
      if (!payload.success) {
        error.value = 'invalid_payload'
        return false
      }
      result.value = payload.data
      return true
    } catch (err: unknown) {
      const reason = readYostarErrorReason(err, 'invalid_session')
      // A rejected token is useless: forget it so the UI asks for a fresh code.
      if (reason === 'invalid_session') dropSession()
      error.value = reason
      return false
    } finally {
      syncing.value = false
    }
  }

  function forget(): void {
    dropSession()
    result.value = null
    error.value = null
    codeSent.value = false
  }

  function reset(): void {
    sendingCode.value = false
    syncing.value = false
    codeSent.value = false
    error.value = null
    result.value = null
  }

  return {
    enabled,
    sendingCode,
    syncing,
    codeSent,
    error,
    result,
    session,
    hasSession,
    sendCode,
    startSync,
    syncWithSession,
    forget,
    reset,
  }
}
