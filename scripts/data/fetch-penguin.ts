import { promises as fs } from 'node:fs'
import path from 'node:path'
import {
  PenguinMatrixSnapshotSchema,
  type PenguinMatrixSnapshot,
  type PenguinStageMatrix,
  type PenguinDropItem,
} from '../../shared/schemas/farming'
import type { Stage } from '../../shared/schemas/stage'

const DEFAULT_MIN_SAMPLE_SIZE = 300
const USER_AGENT = 'ArknightsCalculator/1.0 (+https://github.com/Migetsu/ArknightsCalculator)'
const CACHE_DIR = path.resolve(process.cwd(), '.cache/penguin')
const DATA_DIR = path.resolve(process.cwd(), 'data/penguin')

interface RawMatrixEntry {
  stageId: string
  itemId: string
  times: number
  quantity: number
  stdDev?: number
  start?: number
  end?: number | null
}

interface RawMatrixResponse {
  matrix: RawMatrixEntry[]
}

interface FetchOptions {
  minSampleSize?: number
  forceNetwork?: boolean
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchWithCache<T>(url: string, cacheFilename: string): Promise<T> {
  const cachePath = path.join(CACHE_DIR, cacheFilename)
  const isCI = Boolean(process.env.CI)

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'application/json',
      },
    })
    if (res.ok) {
      const data = (await res.json()) as T
      await fs.mkdir(CACHE_DIR, { recursive: true })
      await fs.writeFile(cachePath, JSON.stringify(data, null, 2), 'utf-8')
      return data
    }
    const errorMsg = `Penguin Stats API error: HTTP ${res.status} ${res.statusText} (${url})`
    if (isCI) {
      throw new Error(errorMsg)
    }
    console.warn(`[Penguin] ${errorMsg}`)
  } catch (err) {
    if (isCI) {
      throw new Error(`[Penguin] Network fetch failed in CI for ${url}: ${(err as Error).message}`, {
        cause: err,
      })
    }
    console.warn(`[Penguin] Network fetch failed for ${url}:`, (err as Error).message)
  }

  // Fallback to cache (only allowed in local development)
  try {
    const cached = await fs.readFile(cachePath, 'utf-8')
    console.log(`[Penguin] Using cached file: ${cacheFilename}`)
    return JSON.parse(cached) as T
  } catch (cacheErr) {
    throw new Error(`Failed to fetch ${url} and no cache available at ${cachePath}`, {
      cause: cacheErr,
    })
  }
}

export async function fetchAndNormalizePenguin(
  server: 'CN' | 'US',
  stagesMap: Record<string, Stage>,
  options: FetchOptions = {},
): Promise<PenguinMatrixSnapshot> {
  const minSampleSize = options.minSampleSize ?? DEFAULT_MIN_SAMPLE_SIZE
  const serverParam = server === 'CN' ? 'CN' : 'US'

  console.log(`[Penguin] Fetching drop matrix for server: ${server}...`)
  const matrixData = await fetchWithCache<RawMatrixResponse>(
    `https://penguin-stats.io/PenguinStats/api/v2/result/matrix?server=${serverParam}`,
    `matrix_${server}.json`,
  )

  await sleep(400) // Polite pause

  const stagesResult: Record<string, PenguinStageMatrix> = {}

  for (const entry of matrixData.matrix) {
    if (entry.times < minSampleSize) continue
    if (entry.quantity <= 0) continue

    const stage = stagesMap[entry.stageId]
    // Filter: stage must match real game data and exist on this server
    if (!stage || stage.matchedGameData === false) continue

    const apCost = Math.max(0, stage.apCost ?? 0)
    if (apCost <= 0) continue

    const serverKey = server === 'CN' ? 'cn' : 'global'
    if (!stage.servers.includes(serverKey)) continue

    if (!stagesResult[entry.stageId]) {
      stagesResult[entry.stageId] = {
        stageId: entry.stageId,
        code: stage.code,
        apCost,
        drops: [],
      }
    }

    const dropItem: PenguinDropItem = {
      itemId: entry.itemId,
      quantity: entry.quantity,
      times: entry.times,
      dropRate: Math.round((entry.quantity / entry.times) * 10000) / 10000,
      stdDev: entry.stdDev,
    }

    stagesResult[entry.stageId]?.drops.push(dropItem)
  }

  // Sort drops in each stage by dropRate descending
  for (const stage of Object.values(stagesResult)) {
    stage.drops.sort((a, b) => b.dropRate - a.dropRate)
  }

  const snapshot: PenguinMatrixSnapshot = {
    server,
    fetchedAt: new Date().toISOString(),
    minSampleSize,
    stages: stagesResult,
  }

  return PenguinMatrixSnapshotSchema.parse(snapshot)
}

async function writeSnapshotIfChanged(
  filePath: string,
  newSnapshot: PenguinMatrixSnapshot,
): Promise<void> {
  try {
    const existingRaw = await fs.readFile(filePath, 'utf-8')
    const existing = JSON.parse(existingRaw) as PenguinMatrixSnapshot
    if (JSON.stringify(existing.stages) === JSON.stringify(newSnapshot.stages)) {
      // Drops have not changed: preserve existing timestamp to prevent spurious git diffs
      newSnapshot.fetchedAt = existing.fetchedAt
    }
  } catch {
    // File did not exist or was unreadable, proceed with current timestamp
  }

  await fs.writeFile(filePath, JSON.stringify(newSnapshot, null, 2) + '\n', 'utf-8')
}

export async function runPenguinPipeline(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true })

  const stagesRaw = await fs.readFile(
    path.resolve(process.cwd(), 'data/stages.json'),
    'utf-8',
  )
  const stagesMap = JSON.parse(stagesRaw) as Record<string, Stage>

  // 1. Fetch CN
  const cnSnapshot = await fetchAndNormalizePenguin('CN', stagesMap)
  await writeSnapshotIfChanged(path.join(DATA_DIR, 'cn.json'), cnSnapshot)
  console.log(
    `[Penguin] Written data/penguin/cn.json (${Object.keys(cnSnapshot.stages).length} active stages)`,
  )

  await sleep(600) // Polite pause between servers

  // 2. Fetch US
  const usSnapshot = await fetchAndNormalizePenguin('US', stagesMap)
  await writeSnapshotIfChanged(path.join(DATA_DIR, 'us.json'), usSnapshot)
  console.log(
    `[Penguin] Written data/penguin/us.json (${Object.keys(usSnapshot.stages).length} active stages)`,
  )

  // 3. Fallback benchmark snapshot (US curated baseline)
  await writeSnapshotIfChanged(path.join(DATA_DIR, 'benchmark.json'), usSnapshot)
  console.log('[Penguin] Written fallback data/penguin/benchmark.json')
}

if (process.argv[1]?.includes('fetch-penguin')) {
  runPenguinPipeline().catch((err) => {
    console.error('[Penguin] Fatal error:', err)
    process.exit(1)
  })
}
