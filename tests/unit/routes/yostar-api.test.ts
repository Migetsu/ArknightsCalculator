import { describe, it, expect, vi, beforeEach } from 'vitest'
import sendCodeHandler from '../../../server/api/yostar/send-code.post'
import loginHandler from '../../../server/api/yostar/login.post'
import syncHandler from '../../../server/api/yostar/sync.post'
import { YostarError } from '../../../server/utils/yostar'

/**
 * Route-level tests: h3 is mocked so the handlers run as plain functions, and
 * the Yostar transport is replaced by spies. No upstream call leaves the test.
 */

const h3 = vi.hoisted(() => ({
  setHeader: vi.fn(),
  setResponseStatus: vi.fn(),
  readValidatedBody: vi.fn(),
  createError: vi.fn((options: { statusCode: number; statusMessage?: string }) =>
    Object.assign(new Error(options.statusMessage ?? 'error'), options),
  ),
}))

vi.mock('h3', () => ({
  defineEventHandler: <T>(handler: T): T => handler,
  createError: h3.createError,
  setHeader: h3.setHeader,
  setResponseStatus: h3.setResponseStatus,
  readValidatedBody: h3.readValidatedBody,
}))

const proxy = vi.hoisted(() => ({
  requestYostarEmailCode: vi.fn(),
  fetchYostarSyncUser: vi.fn(),
  fetchYostarSyncUserWithToken: vi.fn(),
}))

vi.mock('../../../server/utils/yostar', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../server/utils/yostar')>()
  return {
    ...actual,
    requestYostarEmailCode: proxy.requestYostarEmailCode,
    fetchYostarSyncUser: proxy.fetchYostarSyncUser,
    fetchYostarSyncUserWithToken: proxy.fetchYostarSyncUserWithToken,
  }
})

const event = { node: { req: {}, res: {} } }
let requestBody: unknown = null
let flagEnabled = true

vi.stubGlobal('useRuntimeConfig', () => ({ public: { yostarSyncEnabled: flagEnabled } }))

const rawUser = {
  status: { nickName: 'Doctor', level: 108, gold: 100, diamondShard: 5, freeDiamond: 1 },
  troop: { chars: { 1: { charId: 'char_003_kalts', level: 90, evolvePhase: 2 } } },
  inventory: { '30115': 4 },
}

const account = { uid: 'channel-uid', token: 'yostar-account-token' }

beforeEach(() => {
  vi.clearAllMocks()
  requestBody = null
  flagEnabled = true
  h3.readValidatedBody.mockImplementation(async (_event, validate: (input: unknown) => unknown) => {
    try {
      return validate(requestBody)
    } catch {
      // Mirrors h3: a throwing validator becomes a 400 Validation Error.
      throw h3.createError({ statusCode: 400, statusMessage: 'Validation Error' })
    }
  })
})

async function call(handler: unknown): Promise<Record<string, unknown>> {
  return (await (handler as (event: unknown) => Promise<unknown>)(event)) as Record<string, unknown>
}

describe('POST /api/yostar/send-code', () => {
  it('returns a neutral ok and forbids caching', async () => {
    requestBody = { email: 'test@example.com' }
    proxy.requestYostarEmailCode.mockResolvedValue(undefined)

    const result = await call(sendCodeHandler)

    expect(result).toEqual({ ok: true })
    expect(proxy.requestYostarEmailCode).toHaveBeenCalledWith('test@example.com')
    expect(h3.setHeader).toHaveBeenCalledWith(event, 'cache-control', 'no-store')
    expect(h3.setResponseStatus).not.toHaveBeenCalled()
  })

  it('rejects a malformed e-mail before calling upstream', async () => {
    requestBody = { email: 'not-an-email' }

    await expect(call(sendCodeHandler)).rejects.toMatchObject({ statusCode: 400 })
    expect(proxy.requestYostarEmailCode).not.toHaveBeenCalled()
  })

  it('answers 404 and calls nothing when the feature flag is off', async () => {
    flagEnabled = false
    requestBody = { email: 'test@example.com' }

    await expect(call(sendCodeHandler)).rejects.toMatchObject({ statusCode: 404 })
    expect(proxy.requestYostarEmailCode).not.toHaveBeenCalled()
  })

  it('maps a rejected e-mail to 400 without echoing it', async () => {
    requestBody = { email: 'test@example.com' }
    proxy.requestYostarEmailCode.mockRejectedValue(new YostarError('invalid_email'))

    const result = await call(sendCodeHandler)

    expect(result).toEqual({ ok: false, error: 'invalid_email' })
    expect(h3.setResponseStatus).toHaveBeenCalledWith(event, 400)
    expect(JSON.stringify(result)).not.toContain('test@example.com')
    expect(JSON.stringify(result)).not.toContain('100400')
  })

  it('maps upstream throttling to 429', async () => {
    requestBody = { email: 'test@example.com' }
    proxy.requestYostarEmailCode.mockRejectedValue(new YostarError('rate_limited'))

    const result = await call(sendCodeHandler)

    expect(result).toEqual({ ok: false, error: 'rate_limited' })
    expect(h3.setResponseStatus).toHaveBeenCalledWith(event, 429)
  })

  it('maps an unexpected failure to 502 without leaking internals', async () => {
    requestBody = { email: 'test@example.com' }
    proxy.requestYostarEmailCode.mockRejectedValue(new Error('socket hang up'))

    const result = await call(sendCodeHandler)

    expect(result).toEqual({ ok: false, error: 'unavailable' })
    expect(JSON.stringify(result)).not.toContain('socket hang up')
  })
})

describe('POST /api/yostar/login', () => {
  beforeEach(() => {
    requestBody = { email: 'test@example.com', code: '123456' }
    proxy.fetchYostarSyncUser.mockResolvedValue({ account, user: rawUser })
  })

  it('returns a sanitized sync payload with an on-device session', async () => {
    const result = (await call(loginHandler)) as {
      ok: boolean
      operators: Array<{ charId: string }>
      depot: { items: Record<string, number>; currencies: { lmd: number } }
      doctor: { name: string }
      session: { uid: string; token: string; expiresAt: string }
    }

    expect(proxy.fetchYostarSyncUser).toHaveBeenCalledWith('test@example.com', '123456')
    expect(result.ok).toBe(true)
    expect(result.operators).toHaveLength(1)
    expect(result.operators[0]?.charId).toBe('char_003_kalts')
    expect(result.depot.items).toEqual({ '30115': 4 })
    expect(result.depot.currencies.lmd).toBe(100)
    expect(result.doctor.name).toBe('Doctor')
    expect(result.session.uid).toBe('channel-uid')
    expect(result.session.token).toBe('yostar-account-token')
    expect(Number.isNaN(Date.parse(result.session.expiresAt))).toBe(false)
    expect(h3.setHeader).toHaveBeenCalledWith(event, 'cache-control', 'no-store')
  })

  it('never returns the e-mail or the verification code', async () => {
    const result = await call(loginHandler)
    const serialized = JSON.stringify(result)

    expect(serialized).not.toContain('test@example.com')
    expect(serialized).not.toContain('123456')
    expect(serialized).not.toContain('session-secret')
    expect(serialized).not.toContain('player-uid')
  })

  it('rejects a code that is not six digits', async () => {
    requestBody = { email: 'test@example.com', code: '12ab' }

    await expect(call(loginHandler)).rejects.toMatchObject({ statusCode: 400 })
    expect(proxy.fetchYostarSyncUser).not.toHaveBeenCalled()
  })

  it('maps a wrong code to 400 invalid_code', async () => {
    proxy.fetchYostarSyncUser.mockRejectedValue(new YostarError('invalid_code'))

    const result = await call(loginHandler)

    expect(result).toEqual({ ok: false, error: 'invalid_code' })
    expect(h3.setResponseStatus).toHaveBeenCalledWith(event, 400)
  })

  it('maps an upstream timeout to 504', async () => {
    proxy.fetchYostarSyncUser.mockRejectedValue(new YostarError('timeout'))

    const result = await call(loginHandler)

    expect(result).toEqual({ ok: false, error: 'timeout' })
    expect(h3.setResponseStatus).toHaveBeenCalledWith(event, 504)
  })

  it('answers 404 when the feature flag is off', async () => {
    flagEnabled = false

    await expect(call(loginHandler)).rejects.toMatchObject({ statusCode: 404 })
    expect(proxy.fetchYostarSyncUser).not.toHaveBeenCalled()
  })
})

describe('POST /api/yostar/sync', () => {
  beforeEach(() => {
    requestBody = { uid: 'channel-uid', token: 'yostar-account-token' }
    proxy.fetchYostarSyncUserWithToken.mockResolvedValue(rawUser)
  })

  it('re-syncs from the stored token and returns no session back', async () => {
    const result = (await call(syncHandler)) as {
      ok: boolean
      operators: Array<{ charId: string }>
      session?: unknown
    }

    expect(proxy.fetchYostarSyncUserWithToken).toHaveBeenCalledWith(account)
    expect(result.ok).toBe(true)
    expect(result.operators).toHaveLength(1)
    expect(result.session).toBeUndefined()
    expect(JSON.stringify(result)).not.toContain('yostar-account-token')
    expect(h3.setHeader).toHaveBeenCalledWith(event, 'cache-control', 'no-store')
  })

  it('rejects a rejected token with 401 invalid_session', async () => {
    proxy.fetchYostarSyncUserWithToken.mockRejectedValue(new YostarError('invalid_session'))

    const result = await call(syncHandler)

    expect(result).toEqual({ ok: false, error: 'invalid_session' })
    expect(h3.setResponseStatus).toHaveBeenCalledWith(event, 401)
  })

  it('rejects an empty token before calling upstream', async () => {
    requestBody = { uid: 'channel-uid', token: '' }

    await expect(call(syncHandler)).rejects.toMatchObject({ statusCode: 400 })
    expect(proxy.fetchYostarSyncUserWithToken).not.toHaveBeenCalled()
  })

  it('answers 404 when the feature flag is off', async () => {
    flagEnabled = false

    await expect(call(syncHandler)).rejects.toMatchObject({ statusCode: 404 })
    expect(proxy.fetchYostarSyncUserWithToken).not.toHaveBeenCalled()
  })
})
