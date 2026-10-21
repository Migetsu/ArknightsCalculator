import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import {
  readStoredYostarSession,
  readYostarErrorReason,
  useYostarSync,
  writeStoredYostarSession,
} from '../../../app/composables/useYostarSync'
import { YOSTAR_SESSION_STORAGE_KEY } from '../../../shared/schemas/yostar'

const { mockFetch } = vi.hoisted(() => ({ mockFetch: vi.fn() }))
mockNuxtImport('$fetch', () => mockFetch)

const payload = {
  doctor: { name: 'Doctor', level: 108, server: 'en' },
  operators: [
    {
      charId: 'char_003_kalts',
      elite: 2,
      level: 90,
      skillLevel: 7,
      potential: 4,
      favor: 150,
      skills: { skchr_kalts_2: 3 },
      modules: { uniequip_002_kalts: 3 },
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

const session = {
  uid: 'channel-uid',
  token: 'yostar-account-token',
  expiresAt: '2026-11-20T10:00:00.000Z',
}

function httpError(status: number, data?: unknown): Error {
  return Object.assign(new Error(`HTTP ${status}`), { statusCode: status, data })
}

describe('useYostarSync', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.localStorage.clear()
  })

  afterEach(() => {
    window.localStorage.clear()
  })

  it('starts idle, enabled and without a stored session', () => {
    const sync = useYostarSync()
    expect(sync.enabled.value).toBe(true)
    expect(sync.sendingCode.value).toBe(false)
    expect(sync.syncing.value).toBe(false)
    expect(sync.codeSent.value).toBe(false)
    expect(sync.error.value).toBeNull()
    expect(sync.result.value).toBeNull()
    expect(sync.hasSession.value).toBe(false)
  })

  it('requests a code and marks it as sent', async () => {
    mockFetch.mockResolvedValue({ ok: true })
    const sync = useYostarSync()

    await expect(sync.sendCode('test@example.com')).resolves.toBe(true)

    expect(mockFetch).toHaveBeenCalledWith('/api/yostar/send-code', {
      method: 'POST',
      body: { email: 'test@example.com' },
    })
    expect(sync.codeSent.value).toBe(true)
    expect(sync.sendingCode.value).toBe(false)
    expect(sync.error.value).toBeNull()
  })

  it('keeps the proxy error reason for the send-code step', async () => {
    mockFetch.mockRejectedValue(httpError(400, { ok: false, error: 'invalid_email' }))
    const sync = useYostarSync()

    await expect(sync.sendCode('nope@example.com')).resolves.toBe(false)
    expect(sync.error.value).toBe('invalid_email')
    expect(sync.codeSent.value).toBe(false)
  })

  it('stores the account token on the device after a fresh login', async () => {
    mockFetch.mockResolvedValue({ ok: true, ...payload, session })
    const sync = useYostarSync()

    await expect(sync.startSync('test@example.com', '123456')).resolves.toBe(true)

    expect(mockFetch).toHaveBeenCalledWith('/api/yostar/login', {
      method: 'POST',
      body: { email: 'test@example.com', code: '123456' },
    })
    expect(sync.result.value?.operators[0]?.charId).toBe('char_003_kalts')
    expect(sync.hasSession.value).toBe(true)
    expect(readStoredYostarSession(Date.parse('2026-10-21T10:00:00.000Z'))).toEqual(session)
    expect(window.localStorage.getItem(YOSTAR_SESSION_STORAGE_KEY)).toContain(
      'yostar-account-token',
    )
  })

  it('rejects a login response without a session', async () => {
    mockFetch.mockResolvedValue({ ok: true, ...payload })
    const sync = useYostarSync()

    await expect(sync.startSync('test@example.com', '123456')).resolves.toBe(false)
    expect(sync.error.value).toBe('invalid_payload')
    expect(sync.hasSession.value).toBe(false)
    expect(window.localStorage.getItem(YOSTAR_SESSION_STORAGE_KEY)).toBeNull()
  })

  it('rejects a payload that does not match the contract', async () => {
    mockFetch.mockResolvedValue({ ok: true, doctor: { name: 'Doctor' } })
    const sync = useYostarSync()

    await expect(sync.startSync('test@example.com', '123456')).resolves.toBe(false)
    expect(sync.error.value).toBe('invalid_payload')
    expect(sync.result.value).toBeNull()
  })

  it('re-syncs with the stored token and sends no e-mail or code', async () => {
    writeStoredYostarSession(session)
    mockFetch.mockResolvedValue({ ok: true, ...payload })
    const sync = useYostarSync()

    expect(sync.hasSession.value).toBe(true)
    await expect(sync.syncWithSession()).resolves.toBe(true)

    expect(mockFetch).toHaveBeenCalledWith('/api/yostar/sync', {
      method: 'POST',
      body: { uid: 'channel-uid', token: 'yostar-account-token' },
    })
    expect(sync.result.value?.depot.items).toEqual({ '30115': 4 })
    expect(sync.hasSession.value).toBe(true)
  })

  it('forgets the token when the server rejects the session', async () => {
    writeStoredYostarSession(session)
    mockFetch.mockRejectedValue(httpError(401, { ok: false, error: 'invalid_session' }))
    const sync = useYostarSync()

    await expect(sync.syncWithSession()).resolves.toBe(false)

    expect(sync.error.value).toBe('invalid_session')
    expect(sync.hasSession.value).toBe(false)
    expect(window.localStorage.getItem(YOSTAR_SESSION_STORAGE_KEY)).toBeNull()
  })

  it('does not call the proxy without a stored token', async () => {
    const sync = useYostarSync()

    await expect(sync.syncWithSession()).resolves.toBe(false)
    expect(sync.error.value).toBe('invalid_session')
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('drops the token on disconnect', async () => {
    writeStoredYostarSession(session)
    const sync = useYostarSync()

    sync.forget()

    expect(sync.hasSession.value).toBe(false)
    expect(sync.result.value).toBeNull()
    expect(window.localStorage.getItem(YOSTAR_SESSION_STORAGE_KEY)).toBeNull()
  })

  it('resets transient state without touching the stored token', async () => {
    writeStoredYostarSession(session)
    mockFetch.mockResolvedValue({ ok: true, ...payload })
    const sync = useYostarSync()
    await sync.syncWithSession()

    sync.reset()

    expect(sync.result.value).toBeNull()
    expect(sync.error.value).toBeNull()
    expect(sync.codeSent.value).toBe(false)
    expect(sync.hasSession.value).toBe(true)
  })
})

describe('stored Yostar session', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('ignores and removes malformed entries', () => {
    window.localStorage.setItem(YOSTAR_SESSION_STORAGE_KEY, 'not-json')
    expect(readStoredYostarSession()).toBeNull()
    expect(window.localStorage.getItem(YOSTAR_SESSION_STORAGE_KEY)).toBeNull()

    window.localStorage.setItem(YOSTAR_SESSION_STORAGE_KEY, JSON.stringify({ uid: 'x' }))
    expect(readStoredYostarSession()).toBeNull()
    expect(window.localStorage.getItem(YOSTAR_SESSION_STORAGE_KEY)).toBeNull()
  })

  it('removes an expired token instead of using it', () => {
    writeStoredYostarSession(session)
    expect(readStoredYostarSession(Date.parse('2026-12-01T00:00:00.000Z'))).toBeNull()
    expect(window.localStorage.getItem(YOSTAR_SESSION_STORAGE_KEY)).toBeNull()
  })

  it('clears the entry when the session is null', () => {
    writeStoredYostarSession(session)
    writeStoredYostarSession(null)
    expect(window.localStorage.getItem(YOSTAR_SESSION_STORAGE_KEY)).toBeNull()
  })
})

describe('readYostarErrorReason', () => {
  it('prefers the proxy error body', () => {
    expect(readYostarErrorReason(httpError(400, { error: 'invalid_email' }), 'invalid_code')).toBe(
      'invalid_email',
    )
  })

  it('falls back to the HTTP status', () => {
    expect(readYostarErrorReason(httpError(401), 'invalid_code')).toBe('invalid_session')
    expect(readYostarErrorReason(httpError(429), 'invalid_code')).toBe('rate_limited')
    expect(readYostarErrorReason(httpError(504), 'invalid_code')).toBe('timeout')
    expect(readYostarErrorReason(httpError(404), 'invalid_code')).toBe('disabled')
    expect(readYostarErrorReason(httpError(500), 'invalid_code')).toBe('unavailable')
  })

  it('uses the caller fallback for an ambiguous 400', () => {
    expect(readYostarErrorReason(httpError(400), 'invalid_email')).toBe('invalid_email')
    expect(readYostarErrorReason(httpError(400), 'invalid_code')).toBe('invalid_code')
  })

  it('ignores unknown reasons and non-error values', () => {
    expect(readYostarErrorReason(httpError(400, { error: 'teapot' }), 'invalid_code')).toBe(
      'invalid_code',
    )
    expect(readYostarErrorReason('boom', 'invalid_code')).toBe('unavailable')
    expect(readYostarErrorReason(null, 'invalid_code')).toBe('unavailable')
  })
})
