import { createError, defineEventHandler, readValidatedBody, setHeader } from 'h3'
import {
  createBodyValidator,
  createYostarSessionExpiry,
  fetchYostarSyncUser,
  isYostarSyncEnabled,
  LoginInputSchema,
} from '../../utils/yostar'
import { mapSyncPayload, yostarErrorResponse } from '../../utils/yostarRoutes'

/**
 * Stateless Yostar login + `syncData` proxy.
 *
 * The e-mail, the verification code and every intermediate token stay inside
 * `fetchYostarSyncUser`. The response is the sanitized import payload plus the
 * Yostar account token, which the client keeps on the device by owner decision
 * (see `docs/yostar-sync.md`); it is never stored or logged server-side.
 * Answers 404 when `NUXT_PUBLIC_YOSTAR_SYNC_ENABLED=false`.
 */
export default defineEventHandler(async (event) => {
  setHeader(event, 'cache-control', 'no-store')

  if (!isYostarSyncEnabled(useRuntimeConfig(event))) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }

  const input = await readValidatedBody(event, createBodyValidator(LoginInputSchema))

  try {
    const { account, user } = await fetchYostarSyncUser(input.email, input.code)
    const payload = mapSyncPayload(user)
    return {
      ok: true as const,
      ...payload,
      session: {
        uid: account.uid,
        token: account.token,
        expiresAt: createYostarSessionExpiry(),
      },
    }
  } catch (error) {
    return yostarErrorResponse(event, error)
  }
})
