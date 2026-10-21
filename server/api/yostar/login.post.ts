import {
  createError,
  defineEventHandler,
  readValidatedBody,
  setHeader,
  setResponseStatus,
} from 'h3'
import { mapYostarSync, type YostarMapContext } from '../../../shared/utils/yostar'
import rawItemsData from '../../../data/items.json'
import rawOperatorsData from '../../../data/operators-index.json'
import {
  createBodyValidator,
  fetchYostarSyncUser,
  isYostarSyncEnabled,
  LoginInputSchema,
  YostarError,
  yostarHttpStatus,
} from '../../utils/yostar'

/**
 * Stateless Yostar login + `syncData` proxy.
 *
 * The verification code, every intermediate token and the session secret stay
 * inside `fetchYostarSyncUser` and are dropped when the request ends. The
 * response is a sanitized import payload: no e-mail, no uid, no token.
 * Processes answer 404 when `NUXT_PUBLIC_YOSTAR_SYNC_ENABLED=false`.
 */

interface CatalogEntry {
  id: string
}

/** Parsed once per server process; the catalog is immutable per deployment. */
let catalogCache: YostarMapContext | null = null

function readCatalog(): YostarMapContext {
  if (catalogCache) return catalogCache
  const operatorIds = new Set(
    (rawOperatorsData as unknown as CatalogEntry[]).map((entry) => entry.id),
  )
  const itemIds = new Set((rawItemsData as unknown as CatalogEntry[]).map((entry) => entry.id))
  catalogCache = { knownOperatorIds: operatorIds, knownItemIds: itemIds }
  return catalogCache
}

export default defineEventHandler(async (event) => {
  setHeader(event, 'cache-control', 'no-store')

  if (!isYostarSyncEnabled(useRuntimeConfig(event))) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }

  const input = await readValidatedBody(event, createBodyValidator(LoginInputSchema))

  try {
    const rawUser = await fetchYostarSyncUser(input.email, input.code)
    const payload = mapYostarSync(rawUser, readCatalog())
    return { ok: true as const, ...payload }
  } catch (error) {
    const reason = error instanceof YostarError ? error.reason : 'unavailable'
    setResponseStatus(event, yostarHttpStatus(reason))
    return { ok: false as const, error: reason }
  }
})
