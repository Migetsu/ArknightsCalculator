import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { readYostarErrorReason, useYostarSync } from '../../../app/composables/useYostarSync'

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

function httpError(status: number, data?: unknown): Error {
  return Object.assign(new Error(`HTTP ${status}`), { statusCode: status, data })
}

describe('useYostarSync', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('starts idle and enabled', () => {
    const sync = useYostarSync()
    expect(sync.enabled.value).toBe(true)
    expect(sync.sendingCode.value).toBe(false)
    expect(sync.syncing.value).toBe(false)
    expect(sync.codeSent.value).toBe(false)
    expect(sync.error.value).toBeNull()
    expect(sync.result.value).toBeNull()
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

  it('imports a validated payload on success', async () => {
    mockFetch.mockResolvedValue({ ok: true, ...payload })
    const sync = useYostarSync()

    await expect(sync.startSync('test@example.com', '123456')).resolves.toBe(true)

    expect(mockFetch).toHaveBeenCalledWith('/api/yostar/login', {
      method: 'POST',
      body: { email: 'test@example.com', code: '123456' },
    })
    expect(sync.result.value?.operators[0]?.charId).toBe('char_003_kalts')
    expect(sync.syncing.value).toBe(false)
  })

  it('rejects a payload that does not match the contract', async () => {
    mockFetch.mockResolvedValue({ ok: true, doctor: { name: 'Doctor' } })
    const sync = useYostarSync()

    await expect(sync.startSync('test@example.com', '123456')).resolves.toBe(false)
    expect(sync.error.value).toBe('invalid_payload')
    expect(sync.result.value).toBeNull()
  })

  it('surfaces a wrong code as invalid_code', async () => {
    mockFetch.mockRejectedValue(httpError(400, { ok: false, error: 'invalid_code' }))
    const sync = useYostarSync()

    await expect(sync.startSync('test@example.com', '000000')).resolves.toBe(false)
    expect(sync.error.value).toBe('invalid_code')
  })

  it('resets all state', async () => {
    mockFetch.mockResolvedValue({ ok: true, ...payload })
    const sync = useYostarSync()
    await sync.startSync('test@example.com', '123456')

    sync.reset()

    expect(sync.result.value).toBeNull()
    expect(sync.error.value).toBeNull()
    expect(sync.codeSent.value).toBe(false)
  })
})

describe('readYostarErrorReason', () => {
  it('prefers the proxy error body', () => {
    expect(readYostarErrorReason(httpError(400, { error: 'invalid_email' }), 'invalid_code')).toBe(
      'invalid_email',
    )
  })

  it('falls back to the HTTP status', () => {
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
