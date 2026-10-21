import type { H3Event } from 'h3'
import { createError, getRouterParam } from 'h3'
import type { OperatorHandbook } from '../../shared/schemas/handbook'
import type { OperatorDetail } from '../../shared/schemas/operator'
import {
  OPERATOR_DATA_DATASETS,
  bucketIndexForId,
  isValidOperatorDataId,
} from '../../shared/utils/operatorData'
import type { OperatorDataDatasetName } from '../../shared/utils/operatorData'

type JsonRecord = Record<string, unknown>

/**
 * Parsed buckets are immutable per deployment, so they are cached for the
 * lifetime of the server process. The cache is bounded by the bucket count.
 */
const bucketCache = new Map<string, JsonRecord>()

function bucketCountFor(name: OperatorDataDatasetName): number {
  const dataset = OPERATOR_DATA_DATASETS.find((entry) => entry.name === name)
  if (!dataset) {
    throw new Error(`Unknown operator data dataset: ${name}`)
  }
  return dataset.bucketCount
}

async function readBucket(
  name: OperatorDataDatasetName,
  bucketIndex: number,
): Promise<JsonRecord | null> {
  const cacheKey = `${name}:${bucketIndex}`
  const cached = bucketCache.get(cacheKey)
  if (cached) return cached

  try {
    const value = await useStorage(`assets:${name}`).getItem(`${bucketIndex}.json`)
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
      return null
    }
    const record = value as JsonRecord
    bucketCache.set(cacheKey, record)
    return record
  } catch (_err) {
    return null
  }
}

async function readRecord<T>(name: OperatorDataDatasetName, id: string): Promise<T | null> {
  if (!isValidOperatorDataId(id)) return null

  const bucket = await readBucket(name, bucketIndexForId(id, bucketCountFor(name)))
  const entry = bucket?.[id]
  if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) {
    return null
  }
  return entry as T
}

export async function readOperatorDetail(id: string): Promise<OperatorDetail | null> {
  return readRecord<OperatorDetail>('operators', id)
}

export async function readOperatorHandbook(id: string): Promise<OperatorHandbook | null> {
  return readRecord<OperatorHandbook>('handbook', id)
}

/**
 * Reads and validates the `[id]` route param before any storage access.
 */
export function readOperatorDataIdParam(event: H3Event): string {
  const id = getRouterParam(event, 'id') ?? ''
  if (!isValidOperatorDataId(id)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid operator data id' })
  }
  return id
}
