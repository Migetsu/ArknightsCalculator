import type { AsyncData, NuxtError } from '#app'
import type { Ref, ComputedRef } from 'vue'
import type { RangeTableEntry, RangesDictionary } from '~~/shared/schemas/range'

let rangesCache: Map<string, RangeTableEntry> | null = null

/**
 * Loads the full attack range dictionary into an in-memory cache.
 * Asynchronously imports data/ranges.json in a separate lazy chunk to keep initial bundle lean.
 */
async function loadRangesMap(): Promise<Map<string, RangeTableEntry>> {
  if (rangesCache) {
    return rangesCache
  }

  try {
    const module = await import('~/../data/ranges.json')
    const rawData = (module.default ?? module) as RangesDictionary
    const map = new Map<string, RangeTableEntry>()
    for (const [id, entry] of Object.entries(rawData)) {
      if (entry && typeof entry === 'object' && entry.id) {
        map.set(id, entry)
      }
    }
    rangesCache = map
    return map
  } catch (_err) {
    return new Map()
  }
}

/**
 * Loads a single attack range by its unique ID (e.g. '3-6', '3-1', '4-3').
 * Returns null if the range ID is invalid or missing.
 */
export async function fetchRange(
  rangeId: string | null | undefined,
): Promise<RangeTableEntry | null> {
  if (!rangeId || typeof rangeId !== 'string') return null
  const cleanId = rangeId.trim()
  if (!cleanId) return null

  const map = await loadRangesMap()
  return map.get(cleanId) ?? null
}

/**
 * Loads multiple attack ranges by an array of IDs.
 */
export async function fetchRanges(rangeIds: string[]): Promise<Record<string, RangeTableEntry>> {
  if (!Array.isArray(rangeIds) || rangeIds.length === 0) return {}
  const map = await loadRangesMap()
  const result: Record<string, RangeTableEntry> = {}
  for (const id of rangeIds) {
    if (typeof id === 'string') {
      const cleanId = id.trim()
      const entry = map.get(cleanId)
      if (entry) {
        result[cleanId] = entry
      }
    }
  }
  return result
}

/**
 * Reactive composable providing a single attack range with SSR support and in-memory caching.
 */
export function useRange(
  rangeId:
    | Ref<string | null | undefined>
    | ComputedRef<string | null | undefined>
    | string
    | null
    | undefined,
): AsyncData<RangeTableEntry | null, NuxtError | undefined> {
  const getId = () => {
    const raw = typeof rangeId === 'object' && rangeId !== null ? toValue(rangeId) : rangeId
    return typeof raw === 'string' ? raw.trim() : null
  }

  const initialId = getId() ?? 'none'

  return useAsyncData<RangeTableEntry | null>(
    `operator-range-${initialId}`,
    () => fetchRange(getId()),
    {
      default: () => null,
      watch: typeof rangeId === 'object' && rangeId !== null ? [() => toValue(rangeId)] : [],
    },
  )
}

/**
 * Reactive composable providing multiple attack ranges keyed by range ID.
 */
export function useOperatorRanges(
  rangeIds: Ref<string[]> | ComputedRef<string[]> | string[],
): AsyncData<Record<string, RangeTableEntry>, NuxtError | undefined> {
  const getIds = () => {
    const raw = Array.isArray(rangeIds) ? rangeIds : toValue(rangeIds)
    return Array.isArray(raw) ? raw : []
  }

  const initialKey = getIds().sort().join(',') || 'none'

  return useAsyncData<Record<string, RangeTableEntry>>(
    `operator-ranges-${initialKey}`,
    () => fetchRanges(getIds()),
    {
      default: () => ({}),
      watch: Array.isArray(rangeIds) ? [] : [() => toValue(rangeIds)],
    },
  )
}
