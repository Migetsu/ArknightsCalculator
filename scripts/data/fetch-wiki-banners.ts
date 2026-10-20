import fs from 'node:fs'
import path from 'node:path'

export interface OperatorIndexItem {
  id: string
  name: { en: string; zh: string }
  appellation?: string
  rarity: number
}

export interface ParsedWikiBanner {
  name: string
  title?: string
  type: string
  no?: string
  cnStart?: string // 'YYYY-MM-DD'
  cnEnd?: string // 'YYYY-MM-DD'
  globalStart?: string // 'YYYY-MM-DD'
  globalEnd?: string // 'YYYY-MM-DD'
  rawCnStart?: string
  rawCnEnd?: string
  rawGlobalStart?: string
  rawGlobalEnd?: string
  sourcePage: string
  rateUp6: string[]
  rateUp5: string[]
  primaryRateUp6?: string
  secondaryRateUp6: string[]
  rawOperators: string[]
  rawLimited?: string
}

export const WIKI_BANNER_PAGES = [
  'Headhunting/Banners/2020',
  'Headhunting/Banners/2021',
  'Headhunting/Banners/2022',
  'Headhunting/Banners/2023',
  'Headhunting/Banners/2024',
  'Headhunting/Banners/2025',
  'Headhunting/Banners/2026',
  'Headhunting/Banners/Upcoming',
] as const

const CACHE_DIR = path.resolve(process.cwd(), '.cache/wiki/banners')
const OUTPUT_FILE = path.resolve(process.cwd(), 'data/wiki-banners.json')
const USER_AGENT = 'ArknightsCalculator-Build/1.0'

export function normalizeOperatorName(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\u0142/g, 'l')
    .replace(/['’‘`]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

export function normalizeDate(d?: string): string | undefined {
  if (!d) return undefined
  const match = d.trim().match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/)
  if (!match) return undefined
  return `${match[1]}-${match[2]!.padStart(2, '0')}-${match[3]!.padStart(2, '0')}`
}

export function parseRawCellParams(cellText: string): Record<string, string> {
  const content = cellText.replace(/^\{\{Banners cell\s*/i, '').replace(/\}\}$/i, '')
  const lines = content.split('\n')
  const params: Record<string, string> = {}
  let currentKey: string | null = null
  let currentVal: string[] = []

  for (const line of lines) {
    const match = line.match(/^\|([a-zA-Z0-9_]+)\s*=\s*(.*)$/)
    if (match) {
      if (currentKey) {
        params[currentKey] = currentVal.join('\n').trim()
      }
      currentKey = match[1]!.toLowerCase().trim()
      currentVal = [match[2]!]
    } else if (currentKey) {
      currentVal.push(line)
    }
  }

  if (currentKey) {
    params[currentKey] = currentVal.join('\n').trim()
  }

  return params
}

export function createOperatorIndexMap(operators: OperatorIndexItem[]): Map<string, OperatorIndexItem> {
  const map = new Map<string, OperatorIndexItem>()
  for (const op of operators) {
    if (op.name?.en) {
      map.set(normalizeOperatorName(op.name.en), op)
    }
    if (op.appellation) {
      map.set(normalizeOperatorName(op.appellation), op)
    }
  }
  return map
}

export function parseWikiBannerBlock(
  rawBlock: string,
  sourcePage: string,
  opMap: Map<string, OperatorIndexItem>,
  unmappedCollector?: Set<string>,
): ParsedWikiBanner {
  const p = parseRawCellParams(rawBlock)

  const name = p.name || p.title || (p.type ? `${p.type}${p.no ? ` #${p.no}` : ''}` : 'Unknown Banner')
  const title = p.title || p.name
  const type = p.type || 'standard'
  const no = p.no

  const rawCnStart = p.cnstart
  const rawCnEnd = p.cnend
  // Standard and kernel banners on global use `start` and `end`
  const rawGlobalStart = p.globalstart || p.start
  const rawGlobalEnd = p.globalend || p.end

  const cnStart = normalizeDate(rawCnStart)
  const cnEnd = normalizeDate(rawCnEnd)
  const globalStart = normalizeDate(rawGlobalStart)
  const globalEnd = normalizeDate(rawGlobalEnd)

  const rawOperators: string[] = []
  const rateUp6: string[] = []
  const rateUp5: string[] = []
  const secondaryRateUp6: string[] = []
  let primaryRateUp6: string | undefined

  if (p.operators1 || p.operators2) {
    // Distinct groups: operators1 are 6★, operators2 are 5★ (used in orient / tftw)
    const ops1 = (p.operators1 || '')
      .split(',')
      .map((s) => s.replace(/\[\[(.*?)\]\]/g, '$1').split('|').pop()!.trim())
      .filter(Boolean)
    const ops2 = (p.operators2 || '')
      .split(',')
      .map((s) => s.replace(/\[\[(.*?)\]\]/g, '$1').split('|').pop()!.trim())
      .filter(Boolean)

    for (const opName of ops1) {
      rawOperators.push(opName)
      const op = opMap.get(normalizeOperatorName(opName))
      if (op) {
        rateUp6.push(op.id)
      } else if (unmappedCollector) {
        unmappedCollector.add(opName)
      }
    }

    for (const opName of ops2) {
      rawOperators.push(opName)
      const op = opMap.get(normalizeOperatorName(opName))
      if (op) {
        rateUp5.push(op.id)
      } else if (unmappedCollector) {
        unmappedCollector.add(opName)
      }
    }
  } else if (p.operators) {
    const names = p.operators
      .split(',')
      .map((s) => s.replace(/\[\[(.*?)\]\]/g, '$1').split('|').pop()!.trim())
      .filter(Boolean)
    const limitedFlags = (p.limited || '').split(',').map((s) => s.trim())

    names.forEach((opName, idx) => {
      rawOperators.push(opName)
      const op = opMap.get(normalizeOperatorName(opName))
      if (!op) {
        if (unmappedCollector) unmappedCollector.add(opName)
        return
      }

      const flag = limitedFlags[idx] || '0'
      if (flag === '1') {
        // Primary limited 6★
        primaryRateUp6 = op.id
        rateUp6.push(op.id)
      } else if (flag === '2') {
        // Secondary 6★ (sparkable / off-rateup rerun limited)
        secondaryRateUp6.push(op.id)
      } else {
        // Flag 0 (standard rate-up)
        if (op.rarity === 6) {
          rateUp6.push(op.id)
        } else if (op.rarity === 5) {
          rateUp5.push(op.id)
        }
      }
    })

    // If no explicit flag 1 was set and there is exactly one 6★ operator (e.g. debut special banner), mark it as primary
    if (!primaryRateUp6 && rateUp6.length === 1) {
      primaryRateUp6 = rateUp6[0]
    }
  }

  return {
    name,
    title,
    type,
    no,
    cnStart,
    cnEnd,
    globalStart,
    globalEnd,
    rawCnStart,
    rawCnEnd,
    rawGlobalStart,
    rawGlobalEnd,
    sourcePage,
    rateUp6,
    rateUp5,
    primaryRateUp6,
    secondaryRateUp6,
    rawOperators,
    rawLimited: p.limited,
  }
}

export function parseWikitextPage(
  wikitext: string,
  sourcePage: string,
  opMap: Map<string, OperatorIndexItem>,
  unmappedCollector?: Set<string>,
): ParsedWikiBanner[] {
  const matches = wikitext.match(/\{\{Banners cell[\s\S]*?\}\}/gi) || []
  return matches.map((m) => parseWikiBannerBlock(m, sourcePage, opMap, unmappedCollector))
}

export async function fetchWikiPageWikitext(pageTitle: string): Promise<string> {
  const safeName = pageTitle.replace(/[^a-zA-Z0-9_-]/g, '_') + '.json'
  const cachePath = path.join(CACHE_DIR, safeName)

  if (fs.existsSync(cachePath)) {
    try {
      const cached = JSON.parse(fs.readFileSync(cachePath, 'utf-8'))
      const wt = cached?.parse?.wikitext?.['*']
      if (typeof wt === 'string') return wt
    } catch {
      // Re-fetch on corrupt cache
    }
  }

  fs.mkdirSync(CACHE_DIR, { recursive: true })
  const url = `https://arknights.wiki.gg/api.php?action=parse&page=${encodeURIComponent(pageTitle)}&prop=wikitext&format=json`
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
  if (!res.ok) {
    throw new Error(`Failed to fetch ${pageTitle} from wiki: HTTP ${res.status}`)
  }
  const data = await res.json()
  fs.writeFileSync(cachePath, JSON.stringify(data, null, 2), 'utf-8')
  // Polite delay to avoid hammering the MediaWiki API
  await new Promise((resolve) => setTimeout(resolve, 200))
  return data?.parse?.wikitext?.['*'] || ''
}

export async function buildWikiBannersDataset(): Promise<{
  banners: ParsedWikiBanner[]
  pagesScraped: number
  totalCells: number
  unmappedCount: number
  unmappedList: string[]
}> {
  const opIndexPath = path.resolve(process.cwd(), 'data/operators-index.json')
  const operators: OperatorIndexItem[] = JSON.parse(fs.readFileSync(opIndexPath, 'utf-8'))
  const opMap = createOperatorIndexMap(operators)
  const unmappedCollector = new Set<string>()

  const allBanners: ParsedWikiBanner[] = []

  for (const page of WIKI_BANNER_PAGES) {
    const wt = await fetchWikiPageWikitext(page)
    const bannersOnPage = parseWikitextPage(wt, page, opMap, unmappedCollector)
    allBanners.push(...bannersOnPage)
  }

  const unmappedList = Array.from(unmappedCollector)

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allBanners, null, 2), 'utf-8')

  return {
    banners: allBanners,
    pagesScraped: WIKI_BANNER_PAGES.length,
    totalCells: allBanners.length,
    unmappedCount: unmappedList.length,
    unmappedList,
  }
}

async function runCli() {
  console.log('[wiki-banners] Fetching and parsing wiki banner cells...')
  const result = await buildWikiBannersDataset()
  console.log(`[wiki-banners] Pages scraped: ${result.pagesScraped}`)
  console.log(`[wiki-banners] Total banner blocks parsed: ${result.totalCells}`)
  console.log(`[wiki-banners] Unmapped operator names: ${result.unmappedCount}`)
  if (result.unmappedList.length > 0) {
    console.log(`[wiki-banners] Unmapped list: ${result.unmappedList.join(', ')}`)
  }
  console.log(`[wiki-banners] Output saved to: ${OUTPUT_FILE}`)
}

if (process.argv[1] && process.argv[1].endsWith('fetch-wiki-banners.ts')) {
  runCli().catch((err) => {
    console.error('[wiki-banners] Error:', err)
    process.exit(1)
  })
}
