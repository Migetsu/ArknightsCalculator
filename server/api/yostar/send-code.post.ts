import {
  createError,
  defineEventHandler,
  readValidatedBody,
  setHeader,
  setResponseStatus,
} from 'h3'
import {
  createBodyValidator,
  isYostarSyncEnabled,
  requestYostarEmailCode,
  SendCodeInputSchema,
  YostarError,
  yostarHttpStatus,
} from '../../utils/yostar'

/**
 * Stateless proxy for the Yostar e-mail verification code.
 *
 * The e-mail is forwarded to the official SDK and never stored or logged.
 * The endpoint answers 404 when `NUXT_PUBLIC_YOSTAR_SYNC_ENABLED=false`.
 */
export default defineEventHandler(async (event) => {
  setHeader(event, 'cache-control', 'no-store')

  if (!isYostarSyncEnabled(useRuntimeConfig(event))) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }

  const input = await readValidatedBody(event, createBodyValidator(SendCodeInputSchema))

  try {
    await requestYostarEmailCode(input.email)
    return { ok: true as const }
  } catch (error) {
    const reason = error instanceof YostarError ? error.reason : 'unavailable'
    setResponseStatus(event, yostarHttpStatus(reason))
    return { ok: false as const, error: reason }
  }
})
