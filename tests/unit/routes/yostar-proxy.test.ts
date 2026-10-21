import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  fetchYostarSyncUser,
  isYostarSyncEnabled,
  requestYostarEmailCode,
  YostarError,
  yostarHttpStatus,
  YOSTAR_ENDPOINTS,
  type YostarRequestDeps,
} from '../../../server/utils/yostar'

/**
 * Transport-level tests for the Yostar proxy.
 *
 * Endpoint shapes mirror the verified flow documented in `docs/yostar-sync.md`.
 * No real e-mail, code or token is used anywhere in these tests.
 */

const TEST_EMAIL = 'test@example.com'
const TEST_CODE = '123456'

interface FetchCall {
  url: string
  init: RequestInit
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

/**
 * Minimal fake of the Yostar/Arknights transport. `handlers` map a URL suffix to
 * a response factory so each test can override a single step.
 */
function createDeps(
  handlers: Record<string, (call: FetchCall) => Response | Promise<Response>>,
  calls: FetchCall[] = [],
): YostarRequestDeps {
  return {
    timeoutMs: 1000,
    fetchImpl: (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString()
      const call: FetchCall = { url, init: init ?? {} }
      calls.push(call)
      const match = Object.keys(handlers)
        .sort((a, b) => b.length - a.length)
        .find((suffix) => url.endsWith(suffix))
      if (!match) throw new Error(`Unexpected upstream call: ${url}`)
      return handlers[match]!(call)
    }) as unknown as typeof fetch,
  }
}

function happyHandlers(overrides: Record<string, (call: FetchCall) => Response> = {}) {
  return {
    '/yostar/send-code': () => jsonResponse({ Code: 200, Data: {} }),
    '/yostar/get-auth': () => jsonResponse({ Code: 200, Data: { Token: 'email-token' } }),
    '/user/login': () =>
      jsonResponse({ Code: 200, Data: { UserInfo: { ID: 'channel-uid', Token: 'yostar-token' } } }),
    '/network_config': () =>
      jsonResponse({
        sign: 'signature',
        content: JSON.stringify({
          configVer: '1',
          funcVer: 'V074',
          configs: {
            V074: {
              network: {
                gs: 'https://gs.example.test:8443',
                u8: 'https://u8.example.test',
                hv: 'https://hv.example.test/{0}/version',
              },
            },
          },
        }),
      }),
    '/version': () => jsonResponse({ resVersion: 'res-1', clientVersion: '37.7.41' }),
    '/user/v1/getToken': () => jsonResponse({ result: 0, uid: 'u8-uid', token: 'u8-token' }),
    '/account/login': () =>
      jsonResponse({ result: 0, uid: 'player-uid', secret: 'session-secret' }),
    '/account/syncData': () =>
      jsonResponse({
        result: 0,
        user: {
          status: { nickName: 'Doctor', level: 12, gold: 10, diamondShard: 2 },
          troop: { chars: { 1: { charId: 'char_002_amiya' } } },
          inventory: { '30012': 3 },
        },
      }),
    ...overrides,
  }
}

let consoleSpies: Array<{ mock: { calls: unknown[][] }; mockRestore: () => void }> = []

beforeEach(() => {
  consoleSpies = [
    vi.spyOn(console, 'log'),
    vi.spyOn(console, 'info'),
    vi.spyOn(console, 'warn'),
    vi.spyOn(console, 'error'),
    vi.spyOn(console, 'debug'),
  ]
})

afterEach(() => {
  for (const spy of consoleSpies) spy.mockRestore()
})

describe('requestYostarEmailCode', () => {
  it('posts the e-mail to the official send-code endpoint and returns nothing', async () => {
    const calls: FetchCall[] = []
    const deps = createDeps(happyHandlers(), calls)

    await expect(requestYostarEmailCode(TEST_EMAIL, deps)).resolves.toBeUndefined()

    expect(calls).toHaveLength(1)
    expect(calls[0]?.url).toBe(`${YOSTAR_ENDPOINTS.sdkBase}/yostar/send-code`)
    expect(calls[0]?.init.method).toBe('POST')
    expect(JSON.parse(String(calls[0]?.init.body))).toEqual({
      Account: TEST_EMAIL,
      Randstr: '',
      Ticket: '',
    })
    const headers = calls[0]?.init.headers as Record<string, string>
    expect(headers['Content-Type']).toBe('application/json')
    expect(JSON.parse(headers.Authorization ?? '{}')).toHaveProperty('Sign')
  })

  it('maps an invalid e-mail rejection to invalid_email', async () => {
    const deps = createDeps(
      happyHandlers({
        '/yostar/send-code': () => jsonResponse({ Code: 100400, Msg: 'bad email' }),
      }),
    )

    await expect(requestYostarEmailCode(TEST_EMAIL, deps)).rejects.toMatchObject({
      reason: 'invalid_email',
    })
  })

  it('maps HTTP 429 to rate_limited', async () => {
    const deps = createDeps(happyHandlers({ '/yostar/send-code': () => jsonResponse({}, 429) }))

    await expect(requestYostarEmailCode(TEST_EMAIL, deps)).rejects.toMatchObject({
      reason: 'rate_limited',
    })
  })

  it('maps a hung upstream request to timeout', async () => {
    const timeoutError = Object.assign(new Error('aborted'), { name: 'TimeoutError' })
    const deps = createDeps(
      happyHandlers({
        '/yostar/send-code': () => {
          throw timeoutError
        },
      }),
    )

    await expect(requestYostarEmailCode(TEST_EMAIL, deps)).rejects.toMatchObject({
      reason: 'timeout',
    })
  })

  it('maps a network failure to unavailable', async () => {
    const deps = createDeps(
      happyHandlers({
        '/yostar/send-code': () => {
          throw new Error('ECONNRESET')
        },
      }),
    )

    await expect(requestYostarEmailCode(TEST_EMAIL, deps)).rejects.toMatchObject({
      reason: 'unavailable',
    })
  })
})

describe('fetchYostarSyncUser', () => {
  it('walks the documented login chain and returns the raw syncData user', async () => {
    const calls: FetchCall[] = []
    const deps = createDeps(happyHandlers(), calls)

    const user = await fetchYostarSyncUser(TEST_EMAIL, TEST_CODE, deps)

    expect(calls.map((call) => new URL(call.url).pathname)).toEqual([
      '/yostar/get-auth',
      '/user/login',
      '/config/prod/official/network_config',
      '/Android/version',
      '/user/v1/getToken',
      '/account/login',
      '/account/syncData',
    ])
    expect(user).toMatchObject({ status: { nickName: 'Doctor' } })

    const syncDataCall = calls[6]
    const headers = syncDataCall?.init.headers as Record<string, string>
    expect(headers.secret).toBe('session-secret')
    expect(headers.uid).toBe('player-uid')
    expect(headers.seqnum).toBe('2')
    expect(JSON.parse(String(syncDataCall?.init.body))).toEqual({ platform: 1 })
  })

  it('submits the e-mail code and never puts the code in a URL', async () => {
    const calls: FetchCall[] = []
    const deps = createDeps(happyHandlers(), calls)

    await fetchYostarSyncUser(TEST_EMAIL, TEST_CODE, deps)

    expect(JSON.parse(String(calls[0]?.init.body))).toEqual({
      Account: TEST_EMAIL,
      Code: TEST_CODE,
    })
    for (const call of calls) {
      expect(call.url).not.toContain(TEST_CODE)
      expect(call.url).not.toContain(encodeURIComponent(TEST_EMAIL))
    }
  })

  it('maps a rejected verification code to invalid_code', async () => {
    const deps = createDeps(
      happyHandlers({ '/yostar/get-auth': () => jsonResponse({ Code: 100303, Data: {} }) }),
    )

    await expect(fetchYostarSyncUser(TEST_EMAIL, TEST_CODE, deps)).rejects.toMatchObject({
      reason: 'invalid_code',
    })
  })

  it('rejects a token exchange failure without leaking the upstream message', async () => {
    const deps = createDeps(
      happyHandlers({
        '/user/login': () => jsonResponse({ Code: 100190, Msg: 'Yostar授权失败' }),
      }),
    )

    await expect(fetchYostarSyncUser(TEST_EMAIL, TEST_CODE, deps)).rejects.toMatchObject({
      reason: 'invalid_code',
    })
  })

  it('rejects a code response without a token', async () => {
    const deps = createDeps(
      happyHandlers({ '/yostar/get-auth': () => jsonResponse({ Code: 200, Data: {} }) }),
    )

    await expect(fetchYostarSyncUser(TEST_EMAIL, TEST_CODE, deps)).rejects.toMatchObject({
      reason: 'invalid_payload',
    })
  })

  it('rejects a syncData response with a non-zero result', async () => {
    const deps = createDeps(
      happyHandlers({ '/account/syncData': () => jsonResponse({ result: 5574, user: null }) }),
    )

    await expect(fetchYostarSyncUser(TEST_EMAIL, TEST_CODE, deps)).rejects.toMatchObject({
      reason: 'unavailable',
    })
  })

  it('fails without any console output and never echoes credentials in errors', async () => {
    const deps = createDeps(happyHandlers({ '/account/login': () => jsonResponse({ result: 1 }) }))

    const error = await fetchYostarSyncUser(TEST_EMAIL, TEST_CODE, deps).catch(
      (err: unknown) => err,
    )

    expect(error).toBeInstanceOf(YostarError)
    const message = (error as Error).message
    expect(message).not.toContain(TEST_EMAIL)
    expect(message).not.toContain(TEST_CODE)
    expect(message).not.toContain('session-secret')
    for (const spy of consoleSpies) {
      expect(spy.mock.calls).toEqual([])
    }
  })
})

describe('isYostarSyncEnabled', () => {
  it('defaults to enabled', () => {
    expect(isYostarSyncEnabled({ public: {} })).toBe(true)
    expect(isYostarSyncEnabled({ public: { yostarSyncEnabled: true } })).toBe(true)
  })

  it('is disabled only by an explicit false', () => {
    expect(isYostarSyncEnabled({ public: { yostarSyncEnabled: false } })).toBe(false)
  })
})

describe('yostarHttpStatus', () => {
  it('maps failure reasons to HTTP statuses', () => {
    expect(yostarHttpStatus('invalid_email')).toBe(400)
    expect(yostarHttpStatus('invalid_code')).toBe(400)
    expect(yostarHttpStatus('rate_limited')).toBe(429)
    expect(yostarHttpStatus('timeout')).toBe(504)
    expect(yostarHttpStatus('unavailable')).toBe(502)
    expect(yostarHttpStatus('invalid_payload')).toBe(502)
    expect(yostarHttpStatus('disabled')).toBe(404)
  })
})
