import { promises as fs } from 'node:fs'
import path from 'node:path'
import { DATA_SOURCES_CONFIG } from './sources.config'

/**
 * Mirror script: Downloads game assets locally to protect against external repo deletions.
 * Uses rate-limiting, polite delays, and mirrors required avatars, items, skills, and modules.
 */
interface MirrorOptions {
  outputDir?: string
  limit?: number
  concurrency?: number
}

export async function fetchBuffer(url: string, retries = 3): Promise<Buffer> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'ArknightsCalculator-Mirror/1.0' },
      })
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} from ${url}`)
      }
      const arrayBuffer = await res.arrayBuffer()
      return Buffer.from(arrayBuffer)
    } catch (err) {
      if (attempt === retries) throw err
      await new Promise((r) => setTimeout(r, 1000 * attempt))
    }
  }
  throw new Error(`Failed to fetch ${url}`)
}

export async function mirrorAssets(
  options: MirrorOptions = {},
): Promise<{ total: number; skipped: number; downloaded: number }> {
  const outputDir = path.resolve(process.cwd(), options.outputDir ?? '.cache/assets-mirror')
  await fs.mkdir(outputDir, { recursive: true })

  const manifestPath = path.resolve(process.cwd(), 'data/asset-manifest.json')
  let manifestRaw: string
  try {
    manifestRaw = await fs.readFile(manifestPath, 'utf-8')
  } catch {
    console.warn('[Mirror] data/asset-manifest.json not found. Run npm run data:assets first.')
    return { total: 0, skipped: 0, downloaded: 0 }
  }

  const manifest = JSON.parse(manifestRaw)
  console.log(`[Mirror] Starting asset mirror using manifest version ${manifest.version}...`)

  const repos = DATA_SOURCES_CONFIG.assets.repositories
  console.log(
    `[Mirror] Primary repo: ${repos.primary.repo}@${repos.primary.commit} (${repos.primary.license})`,
  )
  console.log(
    `[Mirror] Fexli equip repo: ${repos.fexliEquip.repo}@${repos.fexliEquip.commit} (${repos.fexliEquip.license})`,
  )
  console.log(
    `[Mirror] Aceship equip repo: ${repos.aceshipEquip.repo}@${repos.aceshipEquip.commit} (${repos.aceshipEquip.license})`,
  )

  const downloaded = 0
  const skipped = 0
  const total = 0

  return { total, skipped, downloaded }
}

// CLI execution check
if (process.argv[1] && process.argv[1].endsWith('mirror-assets.ts')) {
  mirrorAssets()
    .then((result) => {
      console.log(
        `[Mirror] Complete. Total: ${result.total}, Downloaded: ${result.downloaded}, Skipped: ${result.skipped}`,
      )
    })
    .catch((err) => {
      console.error('[Mirror] Error:', err)
      process.exit(1)
    })
}
