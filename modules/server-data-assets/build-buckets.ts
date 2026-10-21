import { mkdir, readdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { OPERATOR_DATA_DATASETS, bucketIndexForId } from '../../shared/utils/operatorData'

/**
 * Build-time generator for the operator/handbook server assets.
 *
 * Nitro's `serverAssets` bundles every file as its own lazy `raw:` chunk, so
 * pointing it at the 866 source files would recreate the chunk explosion. This
 * module aggregates them into a handful of bucket files instead. The output
 * lives in the project cache directory (`<rootDir>/.cache/server-data-assets`),
 * so `data/` stays untouched and Nuxt's build-directory cleanup cannot remove
 * the files before Nitro bundles them.
 */

export interface BuildDataAssetBucketsOptions {
  /** Project `data/` directory (source JSON is not modified). */
  dataDir: string
  /** Cache directory for the generated bucket files. */
  outDir: string
}

export interface BuildDataAssetBucketsResult {
  outDir: string
  /** True when the cached output already matched the source files. */
  skipped: boolean
}

interface DatasetSignature {
  files: number
  bytes: number
  mtimeMs: number
}

interface DataAssetsManifest {
  version: number
  datasets: Partial<Record<string, DatasetSignature>>
}

const GENERATOR_VERSION = 1
const MANIFEST_FILE = 'manifest.json'
const TEMP_DIR = '.tmp'

async function listJsonFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true })
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => entry.name)
    .sort()
}

async function readDatasetSignature(dir: string, files: string[]): Promise<DatasetSignature> {
  let bytes = 0
  let mtimeMs = 0
  for (const file of files) {
    const info = await stat(join(dir, file))
    bytes += info.size
    mtimeMs = Math.max(mtimeMs, info.mtimeMs)
  }
  return { files: files.length, bytes, mtimeMs: Math.ceil(mtimeMs) }
}

async function readManifest(outDir: string): Promise<DataAssetsManifest | null> {
  try {
    const raw = await readFile(join(outDir, MANIFEST_FILE), 'utf-8')
    return JSON.parse(raw) as DataAssetsManifest
  } catch (_err) {
    return null
  }
}

async function bucketsExist(outDir: string): Promise<boolean> {
  for (const dataset of OPERATOR_DATA_DATASETS) {
    for (let index = 0; index < dataset.bucketCount; index++) {
      try {
        await stat(join(outDir, dataset.name, `${index}.json`))
      } catch (_err) {
        return false
      }
    }
  }
  return true
}

async function isUpToDate(
  manifest: DataAssetsManifest | null,
  signatures: Partial<Record<string, DatasetSignature>>,
  outDir: string,
): Promise<boolean> {
  if (!manifest || manifest.version !== GENERATOR_VERSION) return false
  const sourcesMatch = OPERATOR_DATA_DATASETS.every((dataset) => {
    const current = signatures[dataset.name]
    const cached = manifest.datasets[dataset.name]
    return (
      current !== undefined &&
      cached !== undefined &&
      current.files === cached.files &&
      current.bytes === cached.bytes &&
      current.mtimeMs === cached.mtimeMs
    )
  })
  return sourcesMatch && (await bucketsExist(outDir))
}

/**
 * Writes through a unique temporary file so concurrent Nuxt/Vitest workers can
 * generate the same deterministic output without observing partial files.
 * Temporary files stay outside the asset directories, which are globbed by
 * Nitro's `serverAssets` pattern.
 */
async function writeJsonAtomic(file: string, value: unknown, tempDir: string): Promise<void> {
  const tempFile = join(tempDir, `${basename(file)}.${process.pid}.${Date.now()}.tmp`)
  await writeFile(tempFile, JSON.stringify(value), 'utf-8')
  await rename(tempFile, file)
}

async function removeStaleBuckets(targetDir: string, expected: Set<string>): Promise<void> {
  for (const entry of await readdir(targetDir)) {
    if (expected.has(entry)) continue
    if (entry.endsWith('.json') || entry.endsWith('.tmp')) {
      await rm(join(targetDir, entry), { force: true })
    }
  }
}

export async function buildDataAssetBuckets(
  options: BuildDataAssetBucketsOptions,
): Promise<BuildDataAssetBucketsResult> {
  const { dataDir, outDir } = options

  const fileLists: Partial<Record<string, string[]>> = {}
  const signatures: Partial<Record<string, DatasetSignature>> = {}
  for (const dataset of OPERATOR_DATA_DATASETS) {
    const sourceDir = join(dataDir, dataset.name)
    const files = await listJsonFiles(sourceDir)
    fileLists[dataset.name] = files
    signatures[dataset.name] = await readDatasetSignature(sourceDir, files)
  }

  const manifest = await readManifest(outDir)
  if (await isUpToDate(manifest, signatures, outDir)) {
    return { outDir, skipped: true }
  }

  const tempDir = join(outDir, TEMP_DIR)
  await mkdir(tempDir, { recursive: true })

  for (const dataset of OPERATOR_DATA_DATASETS) {
    const sourceDir = join(dataDir, dataset.name)
    const targetDir = join(outDir, dataset.name)
    await mkdir(targetDir, { recursive: true })

    const buckets: Array<Record<string, unknown>> = Array.from(
      { length: dataset.bucketCount },
      () => ({}),
    )

    for (const file of fileLists[dataset.name] ?? []) {
      const id = file.slice(0, -'.json'.length)
      const parsed: unknown = JSON.parse(await readFile(join(sourceDir, file), 'utf-8'))
      const bucket = buckets[bucketIndexForId(id, dataset.bucketCount)]
      if (!bucket) {
        throw new Error(`Bucket index is out of range for dataset "${dataset.name}"`)
      }
      bucket[id] = parsed
    }

    const expected = new Set<string>()
    for (const [index, bucket] of buckets.entries()) {
      const fileName = `${index}.json`
      expected.add(fileName)
      await writeJsonAtomic(join(targetDir, fileName), bucket, tempDir)
    }
    await removeStaleBuckets(targetDir, expected)
  }

  await writeJsonAtomic(
    join(outDir, MANIFEST_FILE),
    {
      version: GENERATOR_VERSION,
      datasets: signatures,
    } satisfies DataAssetsManifest,
    tempDir,
  )

  return { outDir, skipped: false }
}
