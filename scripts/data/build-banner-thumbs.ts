import { promises as fs } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { getBannerArtCandidates } from '../../shared/utils/gacha'

const BATCH_SIZE = 10
const MAX_RETRIES = 3
const FEXLI_COMMIT = 'd7bdc0146f99f6fa88ecdc1bbf79021c012c21c5'
const FEXLI_BASE_URL = `https://cdn.jsdelivr.net/gh/fexli/ArknightsResource@${FEXLI_COMMIT}/gacha`

interface BannerSummaryEntry {
  id: string
  server?: 'cn' | 'en'
  pairedBannerId?: string | null
}

interface BannersFile {
  cnBanners: BannerSummaryEntry[]
  enBanners: BannerSummaryEntry[]
}

async function fetchWithRetry(url: string, retries = MAX_RETRIES): Promise<Buffer | null> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url)
      if (res.ok) {
        const arrayBuf = await res.arrayBuffer()
        return Buffer.from(arrayBuf)
      }
      if (res.status === 404) return null
    } catch (_err) {
      if (attempt === retries) return null
      await new Promise((resolve) => setTimeout(resolve, 500 * attempt))
    }
  }
  return null
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(filePath)
    return stat.size > 0
  } catch {
    return false
  }
}

/**
 * Fetches the directory listing of gacha/ in fexli/ArknightsResource.
 */
async function fetchFexliGachaFileList(): Promise<Set<string>> {
  const localCachePath = path.resolve(
    process.cwd(),
    '.cache/fexli_gacha_files.json',
  )
  try {
    if (await fileExists(localCachePath)) {
      const cached = JSON.parse(await fs.readFile(localCachePath, 'utf-8')) as string[]
      return new Set(cached)
    }
  } catch {
    // proceed to network
  }

  const apiUrl = `https://api.github.com/repos/fexli/ArknightsResource/contents/gacha?ref=${FEXLI_COMMIT}`
  const res = await fetch(apiUrl, {
    headers: {
      'User-Agent': 'ArknightsCalculator-AssetBuilder',
      Accept: 'application/vnd.github.v3+json',
    },
  })

  if (!res.ok) {
    throw new Error(`Failed to fetch gacha contents from GitHub: ${res.status} ${res.statusText}`)
  }

  const items = (await res.json()) as Array<{ name: string }>
  const baseFiles: string[] = []

  for (const item of items) {
    if (item.name.endsWith('.png') && !item.name.endsWith('_full.png')) {
      baseFiles.push(item.name.slice(0, -4))
    }
  }

  try {
    await fs.mkdir(path.dirname(localCachePath), { recursive: true })
    await fs.writeFile(localCachePath, JSON.stringify(baseFiles, null, 2))
  } catch {
    // non-fatal
  }

  return new Set(baseFiles)
}

export async function runBuildBannerThumbs(
  assetsRepoDir = path.resolve(process.cwd(), 'temp-assets-repo'),
): Promise<{
  cnWithArt: number
  cnWithoutArt: number
  enWithArt: number
  enWithoutArt: number
  totalArtFiles: number
  totalSizeMb: number
}> {
  console.log('=== Banner Art Downloader & WebP Optimizer (480px) ===\n')

  const bannersPath = path.resolve(process.cwd(), 'data/banners.json')
  const bannersRaw = await fs.readFile(bannersPath, 'utf-8')
  const bannersData = JSON.parse(bannersRaw) as BannersFile

  const outputDir = path.join(assetsRepoDir, 'banners')
  await fs.mkdir(outputDir, { recursive: true })

  console.log('Fetching fexli/ArknightsResource available gacha files...')
  const availableFexliFiles = await fetchFexliGachaFileList()
  console.log(`Found ${availableFexliFiles.size} base gacha art files in fexli upstream.\n`)

  // 1. Analyze CN banners
  let cnWithArt = 0
  let cnWithoutArt = 0
  const neededArtIds = new Set<string>()
  const bannerArtMapping = new Map<string, string>()

  for (const b of bannersData.cnBanners) {
    const candidates = getBannerArtCandidates(b.id, 'cn')
    const matched = candidates.find((c) => availableFexliFiles.has(c))
    if (matched) {
      cnWithArt++
      neededArtIds.add(matched)
      bannerArtMapping.set(b.id, matched)
    } else {
      cnWithoutArt++
    }
  }

  // 2. Analyze EN banners
  let enWithArt = 0
  let enWithoutArt = 0
  for (const b of bannersData.enBanners) {
    const candidates = getBannerArtCandidates(b.id, 'en', b.pairedBannerId)
    const matched = candidates.find((c) => availableFexliFiles.has(c))
    if (matched) {
      enWithArt++
      neededArtIds.add(matched)
      bannerArtMapping.set(b.id, matched)
    } else {
      enWithoutArt++
    }
  }

  console.log(`CN Banners: with art = ${cnWithArt}, without art = ${cnWithoutArt} (total: ${bannersData.cnBanners.length})`)
  console.log(`EN Banners: with art = ${enWithArt}, without art = ${enWithoutArt} (total: ${bannersData.enBanners.length})`)
  console.log(`Total unique banner arts required: ${neededArtIds.size}\n`)

  // 3. Process arts in batches
  const artIdList = Array.from(neededArtIds).sort()
  let createdCount = 0
  let cachedCount = 0
  let failedCount = 0
  const fileSizesKb: number[] = []

  for (let i = 0; i < artIdList.length; i += BATCH_SIZE) {
    const batch = artIdList.slice(i, i + BATCH_SIZE)
    await Promise.all(
      batch.map(async (artId) => {
        const destPath = path.join(outputDir, `${artId}.webp`)
        if (await fileExists(destPath)) {
          cachedCount++
          const stat = await fs.stat(destPath)
          fileSizesKb.push(stat.size / 1024)
          return
        }

        const sourceUrl = `${FEXLI_BASE_URL}/${artId}.png`
        const rawBuf = await fetchWithRetry(sourceUrl)
        if (!rawBuf) {
          console.warn(`[WARN] Failed to fetch upstream art for ${artId}`)
          failedCount++
          return
        }

        try {
          const webpBuf = await sharp(rawBuf)
            .resize({ width: 480, withoutEnlargement: true })
            .webp({ quality: 80, effort: 4 })
            .toBuffer()

          await fs.writeFile(destPath, webpBuf)
          createdCount++
          fileSizesKb.push(webpBuf.length / 1024)
        } catch (err) {
          console.error(`[ERROR] Failed to convert ${artId} to WebP:`, err)
          failedCount++
        }
      }),
    )

    const processed = Math.min(i + BATCH_SIZE, artIdList.length)
    process.stdout.write(`\rProgress: ${processed}/${artIdList.length} arts processed...`)
  }

  const totalSizeKb = fileSizesKb.reduce((a, b) => a + b, 0)
  const totalSizeMb = +(totalSizeKb / 1024).toFixed(2)
  const avgKb = fileSizesKb.length > 0 ? (totalSizeKb / fileSizesKb.length).toFixed(1) : '0'

  console.log('\n\n=== BANNER ART GENERATION SUMMARY ===')
  console.log(`Newly created: ${createdCount}`)
  console.log(`Cached:        ${cachedCount}`)
  console.log(`Failed:        ${failedCount}`)
  console.log(`Total files:   ${fileSizesKb.length}`)
  console.log(`Total size:    ${totalSizeMb} MB`)
  console.log(`Average size:  ${avgKb} KB per 480px WebP thumbnail`)

  // 4. Save data/banner-arts.json with available art IDs.
  // Keep IDs already published (including wiki-sourced ones not present in fexli).
  const manifestPath = path.resolve(process.cwd(), 'data/banner-arts.json')
  let publishedArtIds: string[] = []
  try {
    publishedArtIds = JSON.parse(await fs.readFile(manifestPath, 'utf-8')) as string[]
  } catch {
    // manifest does not exist yet
  }
  const mergedArtIds = Array.from(new Set([...artIdList, ...publishedArtIds])).sort()
  await fs.writeFile(manifestPath, JSON.stringify(mergedArtIds, null, 2) + '\n')
  console.log(`Saved available banner arts list to ${manifestPath}\n`)

  return {
    cnWithArt,
    cnWithoutArt,
    enWithArt,
    enWithoutArt,
    totalArtFiles: fileSizesKb.length,
    totalSizeMb,
  }
}

if (process.argv[1]?.includes('build-banner-thumbs')) {
  runBuildBannerThumbs().catch((err) => {
    console.error('Fatal error in build-banner-thumbs:', err)
    process.exit(1)
  })
}
