import { describe, it, expect, vi } from 'vitest'
import {
  createGeminiClient,
  GeminiApiError,
  DEFAULT_GEMINI_BASE_URL,
} from '../../../scripts/data/lib/gemini-client'

const API_KEY = 'test-key-should-never-leak'

interface FetchCall {
  url: string
  init: RequestInit
}

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  })
}

function candidate(text: string, finishReason = 'STOP'): unknown {
  return {
    candidates: [{ content: { parts: [{ text }] }, finishReason }],
    usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5, totalTokenCount: 15 },
  }
}

function makeClient(
  responses: Array<() => Promise<Response> | Response>,
  overrides: Partial<Parameters<typeof createGeminiClient>[0]> = {},
): {
  client: ReturnType<typeof createGeminiClient>
  calls: FetchCall[]
  sleep: ReturnType<typeof vi.fn>
} {
  const calls: FetchCall[] = []
  let index = 0
  const fetchImpl = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} })
    const factory = responses[Math.min(index, responses.length - 1)]
    index += 1
    if (!factory) throw new Error('no response factory configured')
    return factory()
  }) as unknown as typeof fetch

  const sleep = vi.fn(async () => {})

  const client = createGeminiClient({
    apiKey: API_KEY,
    model: 'gemini-3.8-flash',
    fetchImpl,
    sleepImpl: sleep as unknown as (ms: number) => Promise<void>,
    logWarn: () => {},
    ...overrides,
  })

  return { client, calls, sleep }
}

const params = {
  systemInstruction: 'Translate to English.',
  userPrompt: '[{"id":"a1","zh":"新月的苏醒"}]',
  responseSchema: { type: 'array' },
}

describe('gemini-client', () => {
  it('parses a successful JSON response', async () => {
    const { client, calls } = makeClient([
      () => jsonResponse(candidate('[{"id":"a1","en":"Awakening"}]')),
    ])

    const result = await client.generateJson<Array<{ id: string; en: string }>>(params)

    expect(result).toEqual([{ id: 'a1', en: 'Awakening' }])
    expect(calls).toHaveLength(1)
    expect(calls[0]?.url).toBe(
      `${DEFAULT_GEMINI_BASE_URL}/v1beta/models/gemini-3.8-flash:generateContent`,
    )
  })

  it('sends the API key in the x-goog-api-key header and never in the URL', async () => {
    const { client, calls } = makeClient([() => jsonResponse(candidate('[]'))])

    await client.generateJson(params)

    const headers = calls[0]?.init.headers as Record<string, string>
    expect(headers['x-goog-api-key']).toBe(API_KEY)
    expect(calls[0]?.url).not.toContain(API_KEY)
  })

  it('retries on 429 and succeeds on the second attempt', async () => {
    const { client, calls, sleep } = makeClient([
      () => jsonResponse({ error: { code: 429, status: 'RESOURCE_EXHAUSTED' } }, 429),
      () => jsonResponse(candidate('[{"id":"a1","en":"Ok"}]')),
    ])

    const result = await client.generateJson<Array<{ id: string; en: string }>>(params)

    expect(result).toEqual([{ id: 'a1', en: 'Ok' }])
    expect(calls).toHaveLength(2)
    expect(sleep).toHaveBeenCalledTimes(1)
  })

  it('does not retry on 400 and surfaces the API message', async () => {
    const { client, calls } = makeClient([
      () =>
        jsonResponse(
          { error: { code: 400, message: 'Request contains an invalid argument.' } },
          400,
        ),
    ])

    await expect(client.generateJson(params)).rejects.toThrow(/invalid argument/i)
    expect(calls).toHaveLength(1)
  })

  it('honours retryDelay from the error payload', async () => {
    const { client, sleep } = makeClient([
      () =>
        jsonResponse(
          {
            error: {
              code: 429,
              status: 'RESOURCE_EXHAUSTED',
              details: [{ '@type': 'type.googleapis.com/google.rpc.RetryInfo', retryDelay: '7s' }],
            },
          },
          429,
        ),
      () => jsonResponse(candidate('[]')),
    ])

    await client.generateJson(params)

    expect(sleep).toHaveBeenCalledWith(7000)
  })

  it('honours the Retry-After header', async () => {
    const { client, sleep } = makeClient([
      () => jsonResponse({ error: { code: 429 } }, 429, { 'retry-after': '3' }),
      () => jsonResponse(candidate('[]')),
    ])

    await client.generateJson(params)

    expect(sleep).toHaveBeenCalledWith(3000)
  })

  it('aborts and reports a timeout when the request hangs', async () => {
    const hanging = (_url: string | URL | Request, init?: RequestInit): Promise<Response> =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          const error = new Error('aborted')
          error.name = 'AbortError'
          reject(error)
        })
      })

    const client = createGeminiClient({
      apiKey: API_KEY,
      model: 'gemini-3.8-flash',
      timeoutMs: 10,
      maxRetries: 1,
      fetchImpl: hanging as unknown as typeof fetch,
      logWarn: () => {},
    })

    await expect(client.generateJson(params)).rejects.toThrow(/timed out/i)
  })

  it('throws a clear error when no candidates are returned', async () => {
    const { client } = makeClient([() => jsonResponse({ candidates: [] })])

    await expect(client.generateJson(params)).rejects.toThrow(/no candidates/i)
  })

  it('throws a clear error when the prompt is blocked', async () => {
    const { client } = makeClient([
      () => jsonResponse({ promptFeedback: { blockReason: 'SAFETY' } }),
    ])

    await expect(client.generateJson(params)).rejects.toThrow(/blocked the prompt: SAFETY/)
  })

  it('reports the finish reason when the candidate text is empty', async () => {
    const { client } = makeClient([() => jsonResponse(candidate('', 'MAX_TOKENS'))])

    await expect(client.generateJson(params)).rejects.toThrow(/MAX_TOKENS/)
  })

  it('retries once when the model returns non-JSON text, then gives up', async () => {
    const { client, calls } = makeClient([() => jsonResponse(candidate('not json at all'))], {
      maxRetries: 2,
    })

    await expect(client.generateJson(params)).rejects.toThrow(/not valid JSON/i)
    expect(calls).toHaveLength(2)
  })

  it('never leaks the API key in thrown errors', async () => {
    const { client } = makeClient([
      () => jsonResponse({ error: { code: 400, message: 'bad request' } }, 400),
    ])

    const error = await client.generateJson(params).catch((e: unknown) => e)

    expect(error).toBeInstanceOf(GeminiApiError)
    expect(String((error as Error).message)).not.toContain(API_KEY)
    expect(String((error as Error).stack ?? '')).not.toContain(API_KEY)
  })
})
