import { createError, defineEventHandler, readValidatedBody, setHeader } from 'h3'
import {
  createBodyValidator,
  fetchYostarSyncUserWithToken,
  isYostarSyncEnabled,
  SyncInputSchema,
} from '../../utils/yostar'
import { mapSyncPayload, yostarErrorResponse } from '../../utils/yostarRoutes'

/**
 * Stateless re-sync with the account token the client kept on the device.
 *
 * Accepts `{ uid, token }`, walks u8 -> account/login -> syncData and returns the
 * same sanitized payload as `/api/yostar/login`, without any token. A rejected
 * token maps to `401 invalid_session`, which tells the client to forget it and
 * ask for a fresh e-mail code. Answers 404 when the feature flag is off.
 */
export default defineEventHandler(async (event) => {
  setHeader(event, 'cache-control', 'no-store')

  if (!isYostarSyncEnabled(useRuntimeConfig(event))) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }

  const input = await readValidatedBody(event, createBodyValidator(SyncInputSchema))

  try {
    const user = await fetchYostarSyncUserWithToken({ uid: input.uid, token: input.token })
    return { ok: true as const, ...mapSyncPayload(user) }
  } catch (error) {
    return yostarErrorResponse(event, error)
  }
})
