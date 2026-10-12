import { promises as fs } from 'node:fs'
import path from 'node:path'
import {
  ASSET_REPO_COMMIT,
  resolveAsset,
} from '../../shared/utils/resolveAsset'
import type { OperatorSummary } from '../../shared/schemas/operator'

interface AssetAvailability {
  avatar: boolean
  portrait: boolean
}

export interface AssetManifest {
  version: string
  source: 'http' | 'tree'
  updatedAt: string
  totalOperators: number
  operatorsWithAvatar: number
  operatorsWithoutAvatar: number
  missingAvatarIds: string[]
  assets: Record<string, AssetAvailability>
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Checks whether an asset actually exists and delivers valid image content via HTTP GET.
 */
async function checkAssetHttp(url: string, timeoutMs = 8000): Promise<boolean> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'User-Agent': 'ArknightsCalculator-AssetManifest/1.0',
        Accept: 'image/webp,image/png,image/*,*/*;q=0.8',
      },
    })
    if (res.status !== 200) return false
    const contentType = res.headers.get('content-type')
    if (!contentType?.toLowerCase().includes('image/')) return false
    const buf = await res.arrayBuffer()
    return buf.byteLength > 0
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
  console.log(`Checking CDN asset availability against commit ${ASSET_REPO_COMMIT.slice(0, 7)}...`)

  const args = process.argv.slice(2)
  const useTree = args.includes('--tree')
  const sourceMode: 'http' | 'tree' = useTree ? 'tree' : 'http'

  const manifestAssets: Record<string, AssetAvailability> = {}
  const missingAvatarIds: string[] = []
  let withAvatarCount = 0

  const startTime = Date.now()

  if (useTree) {
    console.log('Mode: GitHub repository tree query (fast)...')
    const treeUrl = `https://api.github.com/repos/yuanyan3060/ArknightsGameResource/git/trees/${ASSET_REPO_COMMIT}?recursive=1`
    const treeRes = await fetch(treeUrl, {
      headers: { 'User-Agent': 'ArknightsCalculator-AssetManifest/1.0' },
    })
    if (!treeRes.ok) {
      throw new Error(`Failed to fetch repo tree: ${treeRes.status}`)
    }
    const treeData = (await treeRes.json()) as { tree: Array<{ path: string }> }
    const pathSet = new Set(treeData.tree.map((f) => f.path))

    for (const op of operators) {
      const avatarCandidates = resolveAsset('avatar', op.id)
      const portraitCandidates = resolveAsset('portrait', op.id)

      // Extract repository relative path from primary CDN URL
      const avatarRelPath = avatarCandidates[0]?.split(ASSET_REPO_COMMIT + '/')[1] ?? ''
      const portraitRelPath = portraitCandidates[0]?.split(ASSET_REPO_COMMIT + '/')[1] ?? ''

      const hasAvatar = pathSet.has(avatarRelPath)
      const hasPortrait = pathSet.has(portraitRelPath)

      manifestAssets[op.id] = { avatar: hasAvatar, portrait: hasPortrait }
      if (hasAvatar) {
        withAvatarCount++
      } else {
        missingAvatarIds.push(op.id)
      }
    }
  } else {
    console.log('Mode: Real HTTP GET checks with concurrency limit...')
    // Check in batches of 10 with 50ms pause
    const checkResults = await runInBatches(
      operators,
      10,
      50,
      async (op) => {
        const avatarUrl = resolveAsset('avatar', op.id)[0] ?? ''
        const portraitUrl = resolveAsset('portrait', op.id)[0] ?? ''

        const [hasAvatar, hasPortrait] = await Promise.all([
          checkAssetHttp(avatarUrl),
          checkAssetHttp(portraitUrl),
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
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1)
  console.log(`\nCompleted asset checks in ${durationSec}s.`)
  console.log(`Operators with valid avatar: ${withAvatarCount}/${operators.length}`)
  console.log(`Operators without avatar:    ${missingAvatarIds.length}`)

  if (missingAvatarIds.length > 0) {
    console.log('\nMissing avatar IDs:', missingAvatarIds.join(', '))
  }

  const manifest: AssetManifest = {
    version: ASSET_REPO_COMMIT,
    source: sourceMode,
    updatedAt: new Date().toISOString(),
    totalOperators: operators.length,
    operatorsWithAvatar: withAvatarCount,
    operatorsWithoutAvatar: missingAvatarIds.length,
    missingAvatarIds,
    assets: manifestAssets,
  }

  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8')
  console.log(`\nManifest saved to ${manifestPath}.`)
}

main().catch((err) => {
  console.error('Fatal error building asset manifest:', err)
  process.exit(1)
})
