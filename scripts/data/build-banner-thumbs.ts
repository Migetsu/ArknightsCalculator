import { promises as fs } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { getBannerArtCandidates } from '../../shared/utils/gacha'
import { FEXLI_REPO_COMMIT } from '../../shared/utils/resolveAsset'

const BATCH_SIZE = 10
const MAX_RETRIES = 3
const FEXLI_BASE_URL = `https://cdn.jsdelivr.net/gh/fexli/ArknightsResource@${FEXLI_REPO_COMMIT}/gacha`
const WIKI_UPCOMING_URL =
  'https://arknights.wiki.gg/wiki/Headhunting/Banners/Upcoming?action=render'
const WIKI_USER_AGENT = 'ArknightsCompanion/1.0 (+https://rhodeslab.vercel.app)'

interface BannerSummaryEntry {
  id: string
  server?: 'cn' | 'en'
  pairedBannerId?: string | null
  cnStartDate?: string | null
  name?: { en?: string }
}

export interface WikiBannerCard {
  name: string
  imageUrl: string
  cnStart: string
  cnEnd: string
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

function stripHtml(value: string): string {
  return decodeHtmlEntities(value.replace(/<[^>]*>/g, '')).trim()
}

/**
 * Parses banner cards from the rendered wiki "Upcoming" page. The card markup is a
 * `div.banner` containing the localized title, the 1024px banner image and the CN
 * release window; the date is the reliable key for mapping it to a dataset pool.
 */
export function parseWikiBannerCards(html: string): WikiBannerCard[] {
  const cards: WikiBannerCard[] = []

  for (const chunk of html.split('<div class="banner"').slice(1)) {
    const imageUrl = /<img[^>]+src="([^"]+)"/.exec(chunk)?.[1]
    const titleHtml = /<b>(.*?)<\/b>/s.exec(chunk)?.[1]
    const dates = /CN date:<\/b>\s*(\d{4}\/\d{2}\/\d{2})\s*[–-]\s*(\d{4}\/\d{2}\/\d{2})/.exec(chunk)
    if (!imageUrl || !titleHtml || !dates) continue

    const name = stripHtml(titleHtml).replace(/^\[[^\]]*\]\s*/, '')
    if (!name) continue

    const absoluteUrl = imageUrl.startsWith('//')
      ? `https:${imageUrl}`
      : imageUrl.startsWith('/')
        ? `https://arknights.wiki.gg${imageUrl}`
        : imageUrl

    cards.push({ name, imageUrl: absoluteUrl, cnStart: dates[1], cnEnd: dates[2] })
  }

  return cards
}

function normalizeDate(value: string | null | undefined): string | null {
  if (!value) return null
  const match = /^(\d{4})[/-](\d{2})[/-](\d{2})/.exec(value.trim())
  return match ? `${match[1]}/${match[2]}/${match[3]}` : null
}

function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

async function fetchWikiBannerCards(): Promise<WikiBannerCard[]> {
  try {
    const res = await fetch(WIKI_UPCOMING_URL, {
      headers: { 'user-agent': WIKI_USER_AGENT, accept: 'text/html' },
    })
    if (!res.ok) {
      console.warn(`[WARN] Wiki upcoming page responded ${res.status}; skipping wiki art.`)
      return []
    }
    return parseWikiBannerCards(await res.text())
  } catch (err) {
    console.warn('[WARN] Could not fetch the wiki upcoming page; skipping wiki art.', err)
    return []
  }
}

/**
 * Resolves wiki cards for dataset pools: the CN start date is authoritative, the
 * normalized English name is the fallback for cards without a parseable date.
 */
export function mapBannersToWikiCards(
  banners: BannerSummaryEntry[],
  cards: WikiBannerCard[],
): Map<string, string> {
  const byStart = new Map<string, WikiBannerCard[]>()
  const byName = new Map<string, WikiBannerCard>()
  for (const card of cards) {
    const startCards = byStart.get(card.cnStart) ?? []
    startCards.push(card)
    byStart.set(card.cnStart, startCards)
    const nameKey = normalizeName(card.name)
    if (nameKey && !byName.has(nameKey)) byName.set(nameKey, card)
  }

  const result = new Map<string, string>()
  for (const banner of banners) {
    const start = normalizeDate(banner.cnStartDate)
    let card: WikiBannerCard | null = null
    if (start) {
      const matches = byStart.get(start)
      if (matches?.length === 1) card = matches[0] ?? null
    }
    if (!card) {
      const name = normalizeName(banner.name?.en ?? '')
      card = name ? (byName.get(name) ?? null) : null
    }
    if (card) result.set(banner.id, card.imageUrl)
  }

  return result
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
  const artSourceUrls = new Map<string, string>()
  const cnMissingArt: BannerSummaryEntry[] = []

  for (const b of bannersData.cnBanners) {
    const candidates = getBannerArtCandidates(b.id, 'cn')
    const matched = candidates.find((c) => availableFexliFiles.has(c))
    if (matched) {
      cnWithArt++
      neededArtIds.add(matched)
      bannerArtMapping.set(b.id, matched)
    } else {
      cnWithoutArt++
      cnMissingArt.push(b)
    }
  }

  // Secondary source: wiki.gg publishes CN banner art almost immediately after a
  // game update, while the fexli mirror can lag for days. Match by CN start date.
  const wikiCards = await fetchWikiBannerCards()
  if (wikiCards.length > 0) {
    const recovered = mapBannersToWikiCards(cnMissingArt, wikiCards)
    for (const [bannerId, imageUrl] of recovered) {
      neededArtIds.add(bannerId)
      artSourceUrls.set(bannerId, imageUrl)
    }
    cnWithArt += recovered.size
    cnWithoutArt -= recovered.size
    console.log(`[WIKI] Recovered ${recovered.size} banner arts from the upcoming page.`)
  }

  // 2. Analyze EN banners
  let enWithArt = 0
  let enWithoutArt = 0
  for (const b of bannersData.enBanners) {
    const candidates = getBannerArtCandidates(b.id, 'en', b.pairedBannerId)
    const matched = candidates.find(
      (c) => availableFexliFiles.has(c) || artSourceUrls.has(c),
    )
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

        const sourceUrl =
          artSourceUrls.get(artId) ?? `${FEXLI_BASE_URL}/${artId}.png`
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
