import { promises as fs } from 'node:fs'
import path from 'node:path'
import {
  ASSET_REPO_COMMIT,
  PRIMARY_CDN_BASE,
} from '../../shared/utils/resolveAsset'
import type { OperatorSummary } from '../../shared/schemas/operator'

interface AssetAvailability {
  avatar: boolean
  portrait: boolean
}

export interface AssetManifest {
  version: string
  updatedAt: string
  totalOperators: number
  operatorsWithAvatar: number
  operatorsWithoutAvatar: number
  missingAvatarIds: string[]
  assets: Record<string, AssetAvailability>
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function checkAssetExists(url: string, timeoutMs = 8000): Promise<boolean> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      headers: {
        'User-Agent': 'ArknightsCalculator-AssetManifest/1.0',
      },
    })
    return res.status === 200
  } catch {
    return false
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Runs tasks in concurrent batches with delay between batches.
 */
async function runInBatches<T, R>(
  items: T[],
  batchSize: number,
  batchDelayMs: number,
  task: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = []
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize)
    const batchResults = await Promise.all(batch.map((item) => task(item)))
    results.push(...batchResults)
    if (i + batchSize < items.length && batchDelayMs > 0) {
      await sleep(batchDelayMs)
    }
  }
  return results
}

async function main(): Promise<void> {
  console.log('=== Arknights Asset Manifest Builder ===\n')

  const indexPath = path.resolve(process.cwd(), 'data/operators-index.json')
  const manifestPath = path.resolve(process.cwd(), 'data/asset-manifest.json')

  const rawIndex = await fs.readFile(indexPath, 'utf-8')
  const operators = JSON.parse(rawIndex) as OperatorSummary[]

  console.log(`Loaded ${operators.length} operators from data/operators-index.json.`)
  console.log(`Checking CDN asset availability against jsDelivr commit ${ASSET_REPO_COMMIT.slice(0, 7)}...`)

  // Parse CLI args: --quick (checks sample of 20), --limit=N
  const args = process.argv.slice(2)
  let opsToCheck = operators
  const limitArg = args.find((a) => a.startsWith('--limit='))
  const isQuick = args.includes('--quick')

  if (isQuick) {
    opsToCheck = operators.slice(0, 20)
  } else if (limitArg) {
    const limit = parseInt(limitArg.split('=')[1] ?? '0', 10)
    if (limit > 0) opsToCheck = operators.slice(0, limit)
  }

  const manifestAssets: Record<string, AssetAvailability> = {}
  const missingAvatarIds: string[] = []
  let withAvatarCount = 0

  const startTime = Date.now()

  // Concurrency: 15 parallel requests, 50ms pause between batches
  const checkResults = await runInBatches(
    opsToCheck,
    15,
    50,
    async (op) => {
      const avatarUrl = `${PRIMARY_CDN_BASE}/avatar/${op.id}.png`
      const portraitUrl = `${PRIMARY_CDN_BASE}/portrait/${op.id}.png`

      const [hasAvatar, hasPortrait] = await Promise.all([
        checkAssetExists(avatarUrl),
        checkAssetExists(portraitUrl),
      ])

      return {
        id: op.id,
        avatar: hasAvatar,
        portrait: hasPortrait,
      }
    },
  )

  for (const res of checkResults) {
    manifestAssets[res.id] = {
      avatar: res.avatar,
      portrait: res.portrait,
    }

    if (res.avatar) {
      withAvatarCount++
    } else {
      missingAvatarIds.push(res.id)
    }
  }

  // If checked subset, merge with existing manifest if available, or mark remainder
  if (opsToCheck.length < operators.length) {
    for (const op of operators) {
      if (!manifestAssets[op.id]) {
        manifestAssets[op.id] = {
          avatar: true, // Default optimistic assumption for remainder
          portrait: true,
        }
      }
    }
  }

  const manifest: AssetManifest = {
    version: ASSET_REPO_COMMIT,
    updatedAt: new Date().toISOString(),
    totalOperators: opsToCheck.length,
    operatorsWithAvatar: withAvatarCount,
    operatorsWithoutAvatar: missingAvatarIds.length,
    missingAvatarIds,
    assets: manifestAssets,
  }

  const manifestJson = JSON.stringify(manifest, null, 2)
  await fs.writeFile(manifestPath, manifestJson, 'utf-8')

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
  const manifestSizeKb = (Buffer.byteLength(manifestJson, 'utf-8') / 1024).toFixed(1)

  console.log('\n=== Asset Manifest Report ===')
  console.log(`Total Operators Checked:    ${opsToCheck.length}`)
  console.log(`Operators With Avatar:      ${withAvatarCount}`)
  console.log(`Operators Without Avatar:   ${missingAvatarIds.length}`)
  if (missingAvatarIds.length > 0) {
    console.log(`Missing Avatar IDs:         ${missingAvatarIds.slice(0, 10).join(', ')}${missingAvatarIds.length > 10 ? '...' : ''}`)
  }
  console.log(`Manifest File Size:         ${manifestSizeKb} KB`)
  console.log(`Time Elapsed:               ${elapsed}s`)
  console.log(`\nWritten manifest to ${manifestPath}`)
}

if (process.argv[1]?.includes('build-asset-manifest')) {
  main().catch((err: unknown) => {
    console.error('Fatal manifest builder error:', err)
    process.exit(1)
  })
}
