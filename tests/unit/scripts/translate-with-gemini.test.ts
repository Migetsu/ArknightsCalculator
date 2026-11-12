import { describe, expect, it } from 'vitest'
import { isTransientGeminiFailure } from '../../../scripts/data/translate-with-gemini'
import { GeminiApiError } from '../../../scripts/data/lib/gemini-client'

/**
 * The scheduled data refresh must survive a Gemini outage, but a misconfigured
 * key or a schema problem must still fail the run loudly.
 */
describe('isTransientGeminiFailure', () => {
  it('treats exhausted retries on 429/5xx and timeouts as transient', () => {
    expect(isTransientGeminiFailure(new GeminiApiError('HTTP 503', 503, true))).toBe(true)
    expect(isTransientGeminiFailure(new GeminiApiError('HTTP 429', 429, true))).toBe(true)
    expect(isTransientGeminiFailure(new GeminiApiError('timed out', 0, true))).toBe(true)
  })

  it('keeps configuration and payload failures fatal', () => {
    expect(isTransientGeminiFailure(new GeminiApiError('HTTP 403', 403, false))).toBe(false)
    expect(isTransientGeminiFailure(new Error('GEMINI_API_KEY is not set'))).toBe(false)
    expect(isTransientGeminiFailure(null)).toBe(false)
    expect(isTransientGeminiFailure('503')).toBe(false)
  })
})
