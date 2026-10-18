import { z } from 'zod'

/**
 * Minimal REST client for the Gemini API `generateContent` endpoint.
 *
 * Deliberately dependency-free: uses the platform `fetch` (Node >= 22) and only
 * reads the fields this pipeline needs. The API key is sent in the
 * `x-goog-api-key` header and is never included in thrown errors or logs.
 */

export const DEFAULT_GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com'
export const DEFAULT_GEMINI_MODEL = 'gemini-3.8-flash'
export const DEFAULT_TIMEOUT_MS = 120_000
export const DEFAULT_MAX_RETRIES = 5

const INITIAL_BACKOFF_MS = 1_000
const MAX_BACKOFF_MS = 30_000

/** HTTP statuses worth retrying: quota exhaustion, transient upstream failures. */
const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504])

export interface GeminiClientOptions {
  apiKey: string
  model: string
  baseUrl?: string
  maxRetries?: number
  timeoutMs?: number
  /** Injectable for tests; defaults to the global `fetch`. */
  fetchImpl?: typeof fetch
  /** Injectable for tests; defaults to `setTimeout`-based sleep. */
  sleepImpl?: (ms: number) => Promise<void>
  /** Structured log sink; defaults to `console.warn`. */
  logWarn?: (message: string) => void
}

export interface GenerateJsonParams {
  systemInstruction: string
  userPrompt: string
  /** OpenAPI-subset schema passed as `generationConfig.responseSchema`. */
  responseSchema: Record<string, unknown>
  temperature?: number
  /**
   * Gemini 3.x reasoning budget. `thinkingBudget: 0` is rejected by
   * gemini-3.5-flash-lite / 3.8-flash (HTTP 400), so we control thinking with
   * `thinkingLevel` instead. `low` keeps translation cheap and fast.
   */
  thinkingLevel?: 'low' | 'high'
  signal?: AbortSignal
}

export interface GeminiClient {
  readonly model: string
  generateJson<T>(params: GenerateJsonParams): Promise<T>
}

export class GeminiApiError extends Error {
  readonly status: number
  readonly retryable: boolean
  /** Server-suggested wait before retrying, when the API provides one. */
  readonly retryAfterMs: number | undefined

  constructor(
    message: string,
    status: number,
    retryable: boolean,
    retryAfterMs?: number,
  ) {
    super(message)
    this.name = 'GeminiApiError'
    this.status = status
    this.retryable = retryable
    this.retryAfterMs = retryAfterMs
  }
}

const PartSchema = z.object({ text: z.string().optional() })

const CandidateSchema = z.object({
  content: z.object({ parts: z.array(PartSchema).optional() }).optional(),
  finishReason: z.string().optional(),
})

const ErrorEnvelopeSchema = z.object({
  error: z
    .object({
      code: z.number().optional(),
      message: z.string().optional(),
      status: z.string().optional(),
      details: z
        .array(z.object({ '@type': z.string().optional(), retryDelay: z.string().optional() }))
        .optional(),
    })
    .optional(),
})

const ResponseEnvelopeSchema = z.object({
  candidates: z.array(CandidateSchema).optional(),
  promptFeedback: z.object({ blockReason: z.string().optional() }).optional(),
})

/** Pulls a retry delay hint out of a Gemini error payload (`"retryDelay": "31s"`). */
function extractRetryDelayMs(body: unknown): number | null {
  const parsed = ErrorEnvelopeSchema.safeParse(body)
  if (!parsed.success) return null

  for (const detail of parsed.data.error?.details ?? []) {
    const raw = detail.retryDelay
    if (!raw) continue
    const match = /^(\d+(?:\.\d+)?)s$/.exec(raw.trim())
    if (match?.[1]) return Math.ceil(Number(match[1]) * 1000)
  }
  return null
}

function parseRetryAfterHeader(value: string | null): number | null {
  if (!value) return null
  const seconds = Number(value.trim())
  if (Number.isFinite(seconds) && seconds >= 0) return Math.ceil(seconds * 1000)
  const date = Date.parse(value)
  if (Number.isFinite(date)) return Math.max(0, date - Date.now())
  return null
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Backoff with full jitter, capped so a stuck run cannot sleep forever. */
function computeBackoffMs(attempt: number): number {
  const exponential = Math.min(INITIAL_BACKOFF_MS * 2 ** (attempt - 1), MAX_BACKOFF_MS)
  return Math.round(exponential / 2 + Math.random() * (exponential / 2))
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError'
}

export function createGeminiClient(options: GeminiClientOptions): GeminiClient {
  const baseUrl = (options.baseUrl ?? DEFAULT_GEMINI_BASE_URL).replace(/\/+$/, '')
  const model = options.model
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const doFetch = options.fetchImpl ?? fetch
  const sleep = options.sleepImpl ?? defaultSleep
  const logWarn = options.logWarn ?? ((message: string) => console.warn(message))

  async function callOnce(params: GenerateJsonParams): Promise<unknown> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    const onExternalAbort = (): void => controller.abort()
    params.signal?.addEventListener('abort', onExternalAbort, { once: true })

    const body = {
      systemInstruction: { parts: [{ text: params.systemInstruction }] },
      contents: [{ role: 'user', parts: [{ text: params.userPrompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: params.responseSchema,
        temperature: params.temperature ?? 0,
        thinkingConfig: { thinkingLevel: params.thinkingLevel ?? 'low' },
      },
    }

    try {
      const response = await doFetch(`${baseUrl}/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-goog-api-key': options.apiKey,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      })

      const text = await response.text()
      let parsed: unknown = null
      try {
        parsed = text ? JSON.parse(text) : null
      } catch {
        parsed = null
      }

      if (!response.ok) {
        const retryAfter =
          parseRetryAfterHeader(response.headers.get('retry-after')) ??
          extractRetryDelayMs(parsed)
        const apiMessage =
          ErrorEnvelopeSchema.safeParse(parsed).data?.error?.message ??
          (text ? text.slice(0, 300) : 'no response body')
        const error = new GeminiApiError(
          `Gemini request failed with HTTP ${response.status}: ${apiMessage}`,
          response.status,
          RETRYABLE_STATUSES.has(response.status),
          retryAfter ?? undefined,
        )
        throw error
      }

      return parsed
    } catch (error) {
      if (isAbortError(error)) {
        throw new GeminiApiError(
          `Gemini request timed out after ${timeoutMs}ms or was aborted`,
          0,
          true,
        )
      }
      if (error instanceof GeminiApiError) throw error
      // Network-level failure: retryable.
      throw new GeminiApiError(
        `Gemini request failed: ${error instanceof Error ? error.message : String(error)}`,
        0,
        true,
      )
    } finally {
      clearTimeout(timer)
      params.signal?.removeEventListener('abort', onExternalAbort)
    }
  }

  function readText(payload: unknown): string {
    const parsed = ResponseEnvelopeSchema.safeParse(payload)
    if (!parsed.success) {
      throw new GeminiApiError(
        `Unexpected Gemini response shape: ${parsed.error.issues.map((i) => i.message).join('; ')}`,
        0,
        false,
      )
    }

    const blockReason = parsed.data.promptFeedback?.blockReason
    if (blockReason) {
      throw new GeminiApiError(`Gemini blocked the prompt: ${blockReason}`, 0, false)
    }

    const candidates = parsed.data.candidates ?? []
    const candidate = candidates[0]
    if (!candidate) {
      throw new GeminiApiError('Gemini returned no candidates', 0, false)
    }

    const text = (candidate.content?.parts ?? [])
      .map((part) => part.text ?? '')
      .join('')
      .trim()

    if (!text) {
      throw new GeminiApiError(
        `Gemini returned an empty candidate (finishReason: ${candidate.finishReason ?? 'unknown'})`,
        0,
        false,
      )
    }

    return text
  }

  async function generateJson<T>(params: GenerateJsonParams): Promise<T> {
    let lastError: GeminiApiError | null = null

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const payload = await callOnce(params)
        const text = readText(payload)
        try {
          return JSON.parse(text) as T
        } catch {
          throw new GeminiApiError(
            `Gemini returned text that is not valid JSON: ${text.slice(0, 200)}`,
            0,
            true,
          )
        }
      } catch (error) {
        if (!(error instanceof GeminiApiError)) throw error
        lastError = error

        if (!error.retryable || attempt === maxRetries) throw error

        const delay = error.retryAfterMs ?? computeBackoffMs(attempt)
        logWarn(
          `[gemini] attempt ${attempt}/${maxRetries} failed (HTTP ${error.status}), retrying in ${delay}ms`,
        )
        await sleep(delay)
      }
    }

    throw lastError ?? new GeminiApiError('Gemini request failed without a recorded error', 0, false)
  }

  return { model, generateJson }
}
