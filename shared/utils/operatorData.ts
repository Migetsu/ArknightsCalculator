/**
 * Shared contract for the per-operator JSON datasets served by Nitro.
 *
 * The datasets live in `data/operators/` and `data/handbook/` as one file per
 * operator. Serving them as individual dynamic imports made Vite/Nitro emit one
 * server (and client) chunk per file (~866 chunks). Instead, the build groups
 * them into a fixed number of bucket files that are exposed as Nitro server
 * assets under `assets:operators` / `assets:handbook`.
 */

export type OperatorDataDatasetName = 'operators' | 'handbook'

export interface OperatorDataDataset {
  /** Nitro server asset base name, also the `data/` subdirectory name. */
  name: OperatorDataDatasetName
  /** Number of aggregated bucket files generated for the dataset. */
  bucketCount: number
}

/**
 * Bucket counts keep each parsed bucket small (~2-4 MB) while adding only
 * 12 chunks to the server bundle.
 */
export const OPERATOR_DATA_DATASETS: readonly OperatorDataDataset[] = [
  { name: 'operators', bucketCount: 8 },
  { name: 'handbook', bucketCount: 4 },
]

/**
 * Dataset file names are operator ids (`char_002_amiya`). Anything else is
 * rejected before it reaches the storage layer (path traversal defence).
 */
export const OPERATOR_DATA_ID_PATTERN = /^[a-zA-Z0-9_]+$/

export function isValidOperatorDataId(id: unknown): id is string {
  return typeof id === 'string' && OPERATOR_DATA_ID_PATTERN.test(id)
}

/**
 * FNV-1a hash mapped to a bucket index. Deterministic across build and runtime,
 * so no id -> bucket manifest is needed.
 */
export function bucketIndexForId(id: string, bucketCount: number): number {
  if (!Number.isInteger(bucketCount) || bucketCount <= 0) {
    throw new Error(`Invalid bucket count: ${bucketCount}`)
  }
  let hash = 0x811c9dc5
  for (let index = 0; index < id.length; index++) {
    hash ^= id.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash % bucketCount
}

/**
 * Minimal fetch signature accepted by the data composables. `$fetch` and
 * `useRequestFetch()` both satisfy it, and tests can pass a stub.
 */
export type OperatorDataFetcher = (url: string) => Promise<unknown>
