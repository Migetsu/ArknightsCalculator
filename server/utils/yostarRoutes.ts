import { setResponseStatus, type H3Event } from 'h3'
import { mapYostarSync, type YostarMapContext } from '../../shared/utils/yostar'
import type { YostarErrorReason, YostarSyncPayload } from '../../shared/schemas/yostar'
import rawItemsData from '../../data/items.json'
import rawOperatorsData from '../../data/operators-index.json'
import { YostarError, yostarHttpStatus } from './yostar'

/**
 * Shared plumbing for the two Yostar routes: the catalog lookup used to skip
 * unknown ids, and the single place that turns a failure into a neutral body.
 */

interface CatalogEntry {
  id: string
}

/** Parsed once per server process; the catalog is immutable per deployment. */
let catalogCache: YostarMapContext | null = null

export function readYostarCatalog(): YostarMapContext {
  if (catalogCache) return catalogCache
  const operatorIds = new Set(
    (rawOperatorsData as unknown as CatalogEntry[]).map((entry) => entry.id),
  )
  const itemIds = new Set((rawItemsData as unknown as CatalogEntry[]).map((entry) => entry.id))
  catalogCache = { knownOperatorIds: operatorIds, knownItemIds: itemIds }
  return catalogCache
}

export function mapSyncPayload(rawUser: unknown): YostarSyncPayload {
  return mapYostarSync(rawUser, readYostarCatalog())
}

/**
 * Turns any failure into `{ ok: false, error }` with the mapped status. The body
 * never carries an upstream message, an e-mail or a token.
 */
export function yostarErrorResponse(
  event: H3Event,
  error: unknown,
): { ok: false; error: YostarErrorReason } {
  const reason = error instanceof YostarError ? error.reason : 'unavailable'
  setResponseStatus(event, yostarHttpStatus(reason))
  return { ok: false as const, error: reason }
}
