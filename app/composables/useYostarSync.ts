import { computed, ref } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import {
  YostarErrorReasonSchema,
  YostarSyncPayloadSchema,
  type YostarErrorReason,
  type YostarSyncPayload,
} from '~~/shared/schemas/yostar'

/**
 * Client state for the Yostar e-mail login flow.
 *
 * Only two round trips happen here: request a code and exchange e-mail + code
 * for a sanitized import payload. Credentials are kept in component refs and
 * are never persisted; the payload carries no token to persist.
 */

export interface UseYostarSyncReturn {
  /** False when the deployment disabled the integration (`NUXT_PUBLIC_YOSTAR_SYNC_ENABLED`). */
  enabled: ComputedRef<boolean>
  sendingCode: Ref<boolean>
  syncing: Ref<boolean>
  codeSent: Ref<boolean>
  error: Ref<YostarErrorReason | null>
  result: Ref<YostarSyncPayload | null>
  sendCode: (email: string) => Promise<boolean>
  startSync: (email: string, code: string) => Promise<boolean>
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
  if (status === 429) return 'rate_limited'
  if (status === 504) return 'timeout'
  if (status === 404) return 'disabled'
  if (status === 400) return fallback
  return 'unavailable'
}

export function useYostarSync(): UseYostarSyncReturn {
  const config = useRuntimeConfig()
  const enabled = computed(() => config.public.yostarSyncEnabled !== false)

  const sendingCode = ref(false)
  const syncing = ref(false)
  const codeSent = ref(false)
  const error = ref<YostarErrorReason | null>(null)
  const result = ref<YostarSyncPayload | null>(null)

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
      const parsed = YostarSyncPayloadSchema.safeParse(response)
      if (!parsed.success) {
        error.value = 'invalid_payload'
        return false
      }
      result.value = parsed.data
      return true
    } catch (err: unknown) {
      error.value = readYostarErrorReason(err, 'invalid_code')
      return false
    } finally {
      syncing.value = false
    }
  }

  function reset(): void {
    sendingCode.value = false
    syncing.value = false
    codeSent.value = false
    error.value = null
    result.value = null
  }

  return { enabled, sendingCode, syncing, codeSent, error, result, sendCode, startSync, reset }
}
