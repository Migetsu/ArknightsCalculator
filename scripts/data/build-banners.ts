import fs from 'node:fs'
import path from 'node:path'
import { getBannerArtCandidates } from '../../shared/utils/gacha'
import {
  BannersDatasetSchema,
  type BannersDataset,
  type BannerSummary,
  type BannerType,
  type GachaBanner,
  type NextBannerSummary,
} from '../../shared/schemas/banner'
import type { ParsedWikiBanner } from './fetch-wiki-banners'
import {
  createEmptyI18nLayersContext,
  createI18nTracker,
  loadI18nLayersContext,
  resolveLayeredI18nString,
  type I18nLayersContext,
  type I18nLayersTracker,
} from './i18n-layers'

export interface RawGachaPool {
  gachaPoolId: string
  gachaIndex: number
  openTime: number
  endTime: number
  gachaPoolName: string
  gachaPoolSummary?: string
  gachaPoolDetail?: string
  guaranteeName?: string | null
  guarantee5Avail?: number
  guarantee5Count?: number
  LMTGSID?: string | null
  CDPrimColor?: string | null
  CDSecColor?: string | null
  freeBackColor?: string | null
  gachaRuleType: string
  dynMeta?: unknown
  linkageRuleId?: string | null
  linkageParam?: unknown
  limitParam?: unknown
}

export interface RawGachaTable {
  gachaPoolClient: RawGachaPool[]
  newbeeGachaPoolClient?: RawGachaPool[]
}

const DATA_DIR = path.resolve(process.cwd(), 'data')
const CACHE_DIR = path.resolve(process.cwd(), '.cache/raw')
const OUTPUT_FILE = path.join(DATA_DIR, 'banners.json')

/**
 * Filter threshold in days for perpetual banners (such as BACKFLOW / Return Headhunting).
 * Normal event rotations last 14-21 days; beta launch ran 107 days. Anything > 180 days is perpetual.
 */
export const PERPETUAL_THRESHOLD_DAYS = 180

/** China Standard Time is UTC+8 all year round (no daylight saving). */
const CN_UTC_OFFSET_MS = 8 * 60 * 60 * 1000

/**
 * Formats a Unix timestamp as the CN-local (UTC+8) calendar date used in game.
 * Gacha timestamps are stored in UTC, so CN pools opening or closing around
 * midnight UTC would otherwise be reported one day earlier than in game.
 */
export function formatCnLocalDate(unixSeconds: number): string {
  const localDate = new Date(unixSeconds * 1000 + CN_UTC_OFFSET_MS).toISOString().slice(0, 10)
  return localDate.replace(/-/g, '/')
}

export function isStarterPool(pool: RawGachaPool): boolean {
  const idLower = pool.gachaPoolId.toLowerCase()
  return idLower.startsWith('boot_') || idLower.includes('newbee')
}

export function isPerpetualPool(pool: RawGachaPool): boolean {
  if (pool.gachaRuleType === 'BACKFLOW') return true
  const durationDays = (pool.endTime - pool.openTime) / (3600 * 24)
  if (durationDays > PERPETUAL_THRESHOLD_DAYS) return true
  // Year 2030 or beyond
  if (pool.endTime >= 1900000000) return true
  return false
}

export function mapRuleToBannerType(ruleType: string, poolName: string): BannerType {
  if (ruleType === 'LIMITED' || ruleType === 'LINKAGE') {
    return 'limited'
  }
  if (poolName.includes('Joint Operation') || poolName.includes('联合行动')) {
    return 'joint_operation'
  }
  return 'standard'
}

export function isLimitedWikiType(t: string): boolean {
  return ['celebration', 'festival', 'carnival', 'crossover', 'limited rerun'].includes(t.toLowerCase())
}

export function matchWikiToBanner(
  b: RawGachaPool,
  candidates: ParsedWikiBanner[],
): ParsedWikiBanner | null {
  if (candidates.length === 0) return null
  if (candidates.length === 1) {
    const c = candidates[0]!
    if (isLimitedWikiType(c.type) && b.gachaRuleType !== 'LIMITED' && b.gachaRuleType !== 'LINKAGE') {
      return null
    }
    return c
  }
  if (b.gachaRuleType === 'LIMITED' || b.gachaRuleType === 'LINKAGE') {
    return candidates.find((c) => isLimitedWikiType(c.type)) ?? null
  }
  const bannerType = mapRuleToBannerType(b.gachaRuleType, b.gachaPoolName)
  if (bannerType === 'joint_operation') {
    return candidates.find((c) => c.type === 'jo') ?? null
  }
  if (b.gachaRuleType === 'SINGLE' || b.gachaRuleType === 'DOUBLE' || b.gachaRuleType === 'ATTAIN') {
    return (
      candidates.find((c) =>
        ['special', 'rerun', 'linkup', 'tftw', 'orient'].includes(c.type.toLowerCase()),
      ) ?? null
    )
  }
  if (b.gachaRuleType === 'NORMAL' || b.gachaRuleType.includes('CLASSIC')) {
    return (
      candidates.find((c) =>
        ['standard', 'kernel', 'kernel locating', 'kernel linkup'].includes(c.type.toLowerCase()),
      ) ?? null
    )
  }
  return candidates[0]!
}

export interface BuildBannersOptions {
  now?: number
  write?: boolean
  i18nContext?: I18nLayersContext
  tracker?: I18nLayersTracker
  wikiBanners?: ParsedWikiBanner[]
}

export interface BuildBannersResult {
  dataset: BannersDataset
  stats: {
    enPoolsTotal: number
    cnPoolsTotal: number
    enExcludedStarter: number
    enExcludedPerpetual: number
    cnExcludedStarter: number
    cnExcludedPerpetual: number
    enRetained: number
    cnRetained: number
    totalRetained: number
    verifiedLimitedPairsCount: number
    verifiedLimitedPairs: Array<{
      lmtgsid: string
      enId: string
      enName: string
      enOpen: string
      cnId: string
      cnName: string
      cnOpen: string
    }>
    wikiBannersLoaded: number
    cnMatchedWikiCount: number
    enMatchedWikiCount: number
    totalPairsFormed: number
    lmtgsidDiscrepanciesCount: number
    discrepancies: Array<{
      cnId: string
      cnLmt?: string | null
      enId: string
      enLmt?: string | null
      wikiName: string
    }>
    currentEnBanner: BannerSummary | null
    activeEnBanners: BannerSummary[]
    activeCnBanners: BannerSummary[]
    nextEnLimitedBanner: NextBannerSummary | null
    cnBannerNamesOfficial: number
    cnBannerNamesWiki: number
    cnBannerNamesMachine: number
  }
}

export function buildBannersFromTables(
  enRaw: RawGachaTable,
  cnRaw: RawGachaTable,
  options: {
    now?: number
    i18nContext?: I18nLayersContext
    tracker?: I18nLayersTracker
    knownArtIds?: Set<string>
    wikiBanners?: ParsedWikiBanner[]
  } = {},
): BuildBannersResult {
  const nowSec = options.now ?? Math.floor(Date.now() / 1000)
  const i18nContext = options.i18nContext ?? createEmptyI18nLayersContext()
  const tracker = options.tracker

  let knownArtIds = options.knownArtIds
  if (!knownArtIds) {
    const artsFile = path.join(DATA_DIR, 'banner-arts.json')
    if (fs.existsSync(artsFile)) {
      try {
        const list = JSON.parse(fs.readFileSync(artsFile, 'utf8')) as string[]
        knownArtIds = new Set(list)
      } catch {
        // fallback to empty set
      }
    }
  }
  const safeArtIds = knownArtIds ?? new Set<string>()

  let wikiBanners = options.wikiBanners
  if (!wikiBanners) {
    const wikiFile = path.join(DATA_DIR, 'wiki-banners.json')
    if (fs.existsSync(wikiFile)) {
      try {
        wikiBanners = JSON.parse(fs.readFileSync(wikiFile, 'utf8')) as ParsedWikiBanner[]
      } catch {
        wikiBanners = []
      }
    }
  }
  const safeWikiBanners = wikiBanners ?? []

  const enPoolsTotal = enRaw.gachaPoolClient.length
  const cnPoolsTotal = cnRaw.gachaPoolClient.length

  // 2. Filter pools
  let enExcludedStarter = 0
  let enExcludedPerpetual = 0
  const enFiltered: RawGachaPool[] = []
  for (const p of enRaw.gachaPoolClient) {
    if (isStarterPool(p)) {
      enExcludedStarter++
      continue
    }
    if (isPerpetualPool(p)) {
      enExcludedPerpetual++
      continue
    }
    enFiltered.push(p)
  }

  let cnExcludedStarter = 0
  let cnExcludedPerpetual = 0
  const cnFiltered: RawGachaPool[] = []
  for (const p of cnRaw.gachaPoolClient) {
    if (isStarterPool(p)) {
      cnExcludedStarter++
      continue
    }
    if (isPerpetualPool(p)) {
      cnExcludedPerpetual++
      continue
    }
    cnFiltered.push(p)
  }

  // 3. Sort ascending by openTime (oldest first per requirement 5)
  enFiltered.sort((a, b) => a.openTime - b.openTime)
  cnFiltered.sort((a, b) => a.openTime - b.openTime)

  // 4. Match LIMITED banners via LMTGSID
  const cnLimitedByLmt = new Map<string, RawGachaPool>()
  for (const p of cnFiltered) {
    if (p.gachaRuleType === 'LIMITED' && p.LMTGSID) {
      cnLimitedByLmt.set(p.LMTGSID, p)
    }
  }

  const enToCnLimitedPairs = new Map<string, string>()
  const cnToEnLimitedPairs = new Map<string, string>()
  const verifiedLimitedPairs: Array<{
    lmtgsid: string
    enId: string
    enName: string
    enOpen: string
    cnId: string
    cnName: string
    cnOpen: string
  }> = []

  for (const enP of enFiltered) {
    if (enP.gachaRuleType === 'LIMITED' && enP.LMTGSID) {
      const cnP = cnLimitedByLmt.get(enP.LMTGSID)
      if (cnP) {
        enToCnLimitedPairs.set(enP.gachaPoolId, cnP.gachaPoolId)
        cnToEnLimitedPairs.set(cnP.gachaPoolId, enP.gachaPoolId)
        verifiedLimitedPairs.push({
          lmtgsid: enP.LMTGSID,
          enId: enP.gachaPoolId,
          enName: enP.gachaPoolName,
          enOpen: new Date(enP.openTime * 1000).toISOString().split('T')[0]!,
          cnId: cnP.gachaPoolId,
          cnName: cnP.gachaPoolName,
          cnOpen: new Date(cnP.openTime * 1000).toISOString().split('T')[0]!,
        })
      }
    }
  }

  // 5. Build Wiki Lookup Maps & Date-based Cross-Server Pairing across all families
  const wikiByCn = new Map<string, ParsedWikiBanner[]>()
  const wikiByGlobal = new Map<string, ParsedWikiBanner[]>()
  for (const w of safeWikiBanners) {
    if (w.cnStart) {
      if (!wikiByCn.has(w.cnStart)) wikiByCn.set(w.cnStart, [])
      wikiByCn.get(w.cnStart)!.push(w)
    }
    if (w.globalStart) {
      if (!wikiByGlobal.has(w.globalStart)) wikiByGlobal.set(w.globalStart, [])
      wikiByGlobal.get(w.globalStart)!.push(w)
    }
  }

  // Pre-match CN pools to wiki
  const cnPoolToWiki = new Map<string, ParsedWikiBanner>()
  for (const p of cnFiltered) {
    const utcDate = new Date(p.openTime * 1000).toISOString().split('T')[0]!
    const bjDate = new Date(p.openTime * 1000 + 8 * 3600 * 1000).toISOString().split('T')[0]!
    const cands = [
      ...(wikiByCn.get(utcDate) ?? []),
      ...(bjDate !== utcDate ? (wikiByCn.get(bjDate) ?? []) : []),
    ]
    const matched = matchWikiToBanner(p, cands)
    if (matched) cnPoolToWiki.set(p.gachaPoolId, matched)
  }

  // Pre-match EN pools to wiki
  const enPoolToWiki = new Map<string, ParsedWikiBanner>()
  for (const p of enFiltered) {
    const utcDate = new Date(p.openTime * 1000).toISOString().split('T')[0]!
    const pstDate = new Date(p.openTime * 1000 - 7 * 3600 * 1000).toISOString().split('T')[0]!
    const cands = [
      ...(wikiByGlobal.get(utcDate) ?? []),
      ...(pstDate !== utcDate ? (wikiByGlobal.get(pstDate) ?? []) : []),
    ]
    const matched = matchWikiToBanner(p, cands)
    if (matched) enPoolToWiki.set(p.gachaPoolId, matched)
  }

  // Match CN <-> EN pairs across all banner families
  const cnToEnDatePairs = new Map<string, string>()
  const enToCnDatePairs = new Map<string, string>()
  const lmtgsidDiscrepancies: Array<{
    cnId: string
    cnLmt?: string | null
    enId: string
    enLmt?: string | null
    wikiName: string
  }> = []

  for (const cnP of cnFiltered) {
    const w = cnPoolToWiki.get(cnP.gachaPoolId)
    if (!w || !w.globalStart) continue

    const enCandidates = enFiltered.filter((enP) => {
      const enW = enPoolToWiki.get(enP.gachaPoolId)
      if (enW && enW === w) return true
      const utcDate = new Date(enP.openTime * 1000).toISOString().split('T')[0]!
      const pstDate = new Date(enP.openTime * 1000 - 7 * 3600 * 1000).toISOString().split('T')[0]!
      return utcDate === w.globalStart || pstDate === w.globalStart
    })

    if (enCandidates.length > 0) {
      let matchedEn = enCandidates.find((enP) => enP.gachaRuleType === cnP.gachaRuleType)
      if (!matchedEn) {
        const cnType = mapRuleToBannerType(cnP.gachaRuleType, cnP.gachaPoolName)
        matchedEn = enCandidates.find(
          (enP) => mapRuleToBannerType(enP.gachaRuleType, enP.gachaPoolName) === cnType,
        )
      }
      if (!matchedEn && enCandidates.length === 1 && !isLimitedWikiType(w.type)) {
        matchedEn = enCandidates[0]
      }

      if (matchedEn) {
        cnToEnDatePairs.set(cnP.gachaPoolId, matchedEn.gachaPoolId)
        enToCnDatePairs.set(matchedEn.gachaPoolId, cnP.gachaPoolId)

        if (cnP.LMTGSID || matchedEn.LMTGSID) {
          if (cnP.LMTGSID !== matchedEn.LMTGSID) {
            lmtgsidDiscrepancies.push({
              cnId: cnP.gachaPoolId,
              cnLmt: cnP.LMTGSID,
              enId: matchedEn.gachaPoolId,
              enLmt: matchedEn.LMTGSID,
              wikiName: w.name,
            })
          }
        }
      }
    }
  }

  // 6. Identify Next EN Limited Banner via LMTGSID progression
  // In sorted CN limited pools, find the first one that does NOT have an EN match
  const cnLimitedSorted = cnFiltered.filter((p) => p.gachaRuleType === 'LIMITED')
  const nextCnLimited = cnLimitedSorted.find(
    (p) => !cnToEnLimitedPairs.has(p.gachaPoolId) && !cnToEnDatePairs.has(p.gachaPoolId),
  )

  // 7. Transform into GachaBanner entries
  const enPoolMap = new Map<string, RawGachaPool>()
  for (const p of enFiltered) {
    enPoolMap.set(p.gachaPoolId, p)
  }

  const enBanners: GachaBanner[] = enFiltered.map((p) => {
    const type = mapRuleToBannerType(p.gachaRuleType, p.gachaPoolName)
    const openIso = new Date(p.openTime * 1000).toISOString()
    const endIso = new Date(p.endTime * 1000).toISOString()
    const isActive = nowSec >= p.openTime && nowSec <= p.endTime
    const pairedId =
      enToCnDatePairs.get(p.gachaPoolId) ?? enToCnLimitedPairs.get(p.gachaPoolId) ?? null

    const wikiMatch = enPoolToWiki.get(p.gachaPoolId)
    const rateUp6 = wikiMatch ? [...wikiMatch.rateUp6] : []
    const rateUp5 = wikiMatch ? [...wikiMatch.rateUp5] : []
    const primaryRateUp6 = wikiMatch?.primaryRateUp6
    const secondaryRateUp6 = wikiMatch ? [...wikiMatch.secondaryRateUp6] : []
    const globalStartDate = openIso.split('T')[0]!.replace(/-/g, '/')
    const globalEndDate = endIso.split('T')[0]!.replace(/-/g, '/')

    const bannerName = resolveLayeredI18nString(
      {
        key: `banner.${p.gachaPoolId}.name`,
        officialEn: p.gachaPoolName,
        zhText: p.gachaPoolName,
        isGlobal: true,
      },
      i18nContext,
      tracker,
    )

    const artCandidates = getBannerArtCandidates(p.gachaPoolId, 'en', pairedId)
    const matchedArt = artCandidates.find((c) => safeArtIds.has(c))
    const hasArt = Boolean(matchedArt)

    return {
      id: p.gachaPoolId,
      server: 'en',
      ruleType: p.gachaRuleType,
      type,
      tag: p.gachaRuleType,
      name: bannerName,
      title: bannerName,
      openTime: p.openTime,
      endTime: p.endTime,
      openIso,
      endIso,
      durationDays: Math.round(((p.endTime - p.openTime) / 86400) * 10) / 10,
      isActive,
      gachaIndex: p.gachaIndex,
      lmtgsid: p.LMTGSID ?? null,
      pairedBannerId: pairedId,
      isNextEnBanner: false,
      cnStartDate: openIso.split('T')[0]!.replace(/-/g, '/'),
      cnEndDate: endIso.split('T')[0]!.replace(/-/g, '/'),
      globalStartDate,
      globalEndDate,
      hasArt,
      artId: matchedArt,
      bannerArt: matchedArt,
      rateUp6,
      rateUp5,
      primaryRateUp6,
      secondaryRateUp6,
    }
  })

  const cnBanners: GachaBanner[] = cnFiltered.map((p) => {
    const type = mapRuleToBannerType(p.gachaRuleType, p.gachaPoolName)
    const openIso = new Date(p.openTime * 1000).toISOString()
    const endIso = new Date(p.endTime * 1000).toISOString()
    const isActive = nowSec >= p.openTime && nowSec <= p.endTime
    const pairedId =
      cnToEnDatePairs.get(p.gachaPoolId) ?? cnToEnLimitedPairs.get(p.gachaPoolId) ?? null
    const isNext = nextCnLimited ? p.gachaPoolId === nextCnLimited.gachaPoolId : false

    const wikiMatch = cnPoolToWiki.get(p.gachaPoolId)
    const rateUp6 = wikiMatch ? [...wikiMatch.rateUp6] : []
    const rateUp5 = wikiMatch ? [...wikiMatch.rateUp5] : []
    const primaryRateUp6 = wikiMatch?.primaryRateUp6
    const secondaryRateUp6 = wikiMatch ? [...wikiMatch.secondaryRateUp6] : []
    const globalStartDate = wikiMatch?.rawGlobalStart
      ? wikiMatch.rawGlobalStart.replace(/-/g, '/')
      : wikiMatch?.globalStart
        ? wikiMatch.globalStart.replace(/-/g, '/')
        : undefined
    const globalEndDate = wikiMatch?.rawGlobalEnd
      ? wikiMatch.rawGlobalEnd.replace(/-/g, '/')
      : wikiMatch?.globalEnd
        ? wikiMatch.globalEnd.replace(/-/g, '/')
        : undefined

    const pairedEnPool = pairedId ? enPoolMap.get(pairedId) : undefined
    const officialEn = pairedEnPool?.gachaPoolName ?? null
    const wikiEn = wikiMatch?.name ?? null

    const bannerName = resolveLayeredI18nString(
      {
        key: `banner.${p.gachaPoolId}.name`,
        officialEn,
        wikiEn,
        zhText: p.gachaPoolName,
        isGlobal: true,
        wikiSource: 'wiki',
      },
      i18nContext,
      tracker,
    )

    const artCandidates = getBannerArtCandidates(p.gachaPoolId, 'cn')
    const matchedArt = artCandidates.find((c) => safeArtIds.has(c))
    const hasArt = Boolean(matchedArt)

    return {
      id: p.gachaPoolId,
      server: 'cn',
      ruleType: p.gachaRuleType,
      type,
      tag: p.gachaRuleType,
      name: bannerName,
      title: bannerName,
      openTime: p.openTime,
      endTime: p.endTime,
      openIso,
      endIso,
      durationDays: Math.round(((p.endTime - p.openTime) / 86400) * 10) / 10,
      isActive,
      gachaIndex: p.gachaIndex,
      lmtgsid: p.LMTGSID ?? null,
      pairedBannerId: pairedId,
      isNextEnBanner: isNext,
      cnStartDate: formatCnLocalDate(p.openTime),
      cnEndDate: formatCnLocalDate(p.endTime),
      globalStartDate,
      globalEndDate,
      hasArt,
      artId: matchedArt,
      bannerArt: matchedArt,
      rateUp6,
      rateUp5,
      primaryRateUp6,
      secondaryRateUp6,
    }
  })

  // 7. Active banners
  const activeEnBanners: BannerSummary[] = enBanners
    .filter((b) => b.isActive)
    .map((b) => ({
      id: b.id,
      server: b.server,
      name: b.name ?? b.title,
      ruleType: b.ruleType,
      openTime: b.openTime,
      endTime: b.endTime,
      openIso: b.openIso,
      endIso: b.endIso,
    }))

  const activeCnBanners: BannerSummary[] = cnBanners
    .filter((b) => b.isActive)
    .map((b) => ({
      id: b.id,
      server: b.server,
      name: b.name ?? b.title,
      ruleType: b.ruleType,
      openTime: b.openTime,
      endTime: b.endTime,
      openIso: b.openIso,
      endIso: b.endIso,
    }))

  // Primary active EN banner: prefer limited if active, else highest openTime
  const activeEnLimited = activeEnBanners.find((b) => b.ruleType === 'LIMITED')
  const currentEnBanner: BannerSummary | null =
    activeEnLimited ??
    [...activeEnBanners].sort((a, b) => b.openTime - a.openTime)[0] ??
    null

  // Next EN limited banner summary
  const nextCnBanner = cnBanners.find((b) => b.isNextEnBanner)
  const nextEnLimitedBanner: NextBannerSummary | null = nextCnBanner
    ? {
        id: nextCnBanner.id,
        server: 'cn',
        name: nextCnBanner.name ?? nextCnBanner.title,
        ruleType: nextCnBanner.ruleType,
        lmtgsid: nextCnBanner.lmtgsid ?? null,
        openTime: nextCnBanner.openTime,
        endTime: nextCnBanner.endTime,
        openIso: nextCnBanner.openIso,
        endIso: nextCnBanner.endIso,
      }
    : null

  // All combined banners
  const allBanners: GachaBanner[] = [...cnBanners, ...enBanners]

  let cnBannerNamesOfficial = 0
  let cnBannerNamesWiki = 0
  let cnBannerNamesMachine = 0
  for (const b of cnBanners) {
    if (b.name.source === 'official') cnBannerNamesOfficial++
    else if (b.name.source === 'wiki') cnBannerNamesWiki++
    else if (b.name.source === 'machine') cnBannerNamesMachine++
  }

  const dataset = {
    meta: {
      generatedAt: new Date(nowSec * 1000).toISOString(),
      currentEnBanner,
      activeEnBanners,
      activeCnBanners,
      nextEnLimitedBanner,
      nextEnBanner: nextEnLimitedBanner, // Reliably established for LIMITED; non-limited is omitted
    },
    cnBanners,
    enBanners,
    banners: allBanners,
  }

  // Validate with Zod schema
  const parsed = BannersDatasetSchema.parse(dataset)

  return {
    dataset: parsed,
    stats: {
      enPoolsTotal,
      cnPoolsTotal,
      enExcludedStarter,
      enExcludedPerpetual,
      cnExcludedStarter,
      cnExcludedPerpetual,
      enRetained: enBanners.length,
      cnRetained: cnBanners.length,
      totalRetained: allBanners.length,
      verifiedLimitedPairsCount: verifiedLimitedPairs.length,
      verifiedLimitedPairs,
      wikiBannersLoaded: safeWikiBanners.length,
      cnMatchedWikiCount: cnPoolToWiki.size,
      enMatchedWikiCount: enPoolToWiki.size,
      totalPairsFormed: cnToEnDatePairs.size,
      lmtgsidDiscrepanciesCount: lmtgsidDiscrepancies.length,
      discrepancies: lmtgsidDiscrepancies,
      currentEnBanner,
      activeEnBanners,
      activeCnBanners,
      nextEnLimitedBanner,
      cnBannerNamesOfficial,
      cnBannerNamesWiki,
      cnBannerNamesMachine,
    },
  }
}

export async function buildBannersDataset(
  options: BuildBannersOptions = {},
): Promise<BuildBannersResult> {
  const enPath = path.join(CACHE_DIR, 'en/gacha_table.json')
  const cnPath = path.join(CACHE_DIR, 'cn/gacha_table.json')

  if (!fs.existsSync(enPath)) {
    throw new Error(`EN gacha_table not found at ${enPath}`)
  }
  if (!fs.existsSync(cnPath)) {
    throw new Error(`CN gacha_table not found at ${cnPath}`)
  }

  const enRaw: RawGachaTable = JSON.parse(fs.readFileSync(enPath, 'utf8'))
  const cnRaw: RawGachaTable = JSON.parse(fs.readFileSync(cnPath, 'utf8'))
  const i18nContext = options.i18nContext ?? (await loadI18nLayersContext())
  const tracker = options.tracker ?? createI18nTracker()

  const result = buildBannersFromTables(enRaw, cnRaw, { now: options.now, i18nContext, tracker })

  if (options.write !== false) {
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(result.dataset, null, 2) + '\n', 'utf8')
  }

  return result
}

// Direct execution via CLI / jiti
if (process.argv[1]?.includes('build-banners')) {
  ;(async () => {
    console.log('=== Building Arknights Banners Dataset ===\n')
    const { stats } = await buildBannersDataset({ write: true })

    console.log(`EN Pools: ${stats.enPoolsTotal} total -> ${stats.enRetained} retained`)
    console.log(`  Excluded: ${stats.enExcludedStarter} starter, ${stats.enExcludedPerpetual} perpetual (RETURN_EN_41_0_1)`)
    console.log(`CN Pools: ${stats.cnPoolsTotal} total -> ${stats.cnRetained} retained`)
    console.log(`  Excluded: ${stats.cnExcludedStarter} starter, ${stats.cnExcludedPerpetual} perpetual (RETURN_71_0_1)`)
    console.log(`Total Banners Generated: ${stats.totalRetained}\n`)

    console.log(`Verified LIMITED Pairs via LMTGSID: ${stats.verifiedLimitedPairsCount} of 25`)
    console.log(`Wiki Banners Loaded: ${stats.wikiBannersLoaded}`)
    console.log(`  CN Pools matched to Wiki: ${stats.cnMatchedWikiCount}`)
    console.log(`  EN Pools matched to Wiki: ${stats.enMatchedWikiCount}`)
    console.log(`  Total CN<->EN Pairs Formed: ${stats.totalPairsFormed}`)
    console.log(`CN Banner Names Provenance:`)
    console.log(`  Official (from paired EN): ${stats.cnBannerNamesOfficial}`)
    console.log(`  Wiki (from arknights.wiki.gg): ${stats.cnBannerNamesWiki}`)
    console.log(`  Machine (fallback): ${stats.cnBannerNamesMachine}`)
    console.log(`  LMTGSID Discrepancies: ${stats.lmtgsidDiscrepanciesCount}`)
    if (stats.discrepancies.length > 0) {
      console.log(`  Discrepancies list:`, stats.discrepancies)
    }
    console.log(
      `Current EN Banner: ${stats.currentEnBanner?.id} ("${stats.currentEnBanner?.name.en ?? stats.currentEnBanner?.name.zh}")`,
    )
    console.log(`  Ends at: ${stats.currentEnBanner?.endIso}`)
    console.log(
      `Active CN Banners (${stats.activeCnBanners.length}): ${stats.activeCnBanners.map((b) => b.name.en || b.name.zh).join(', ')}`,
    )
    console.log(
      `Next EN Limited Banner: ${stats.nextEnLimitedBanner?.id} ("${stats.nextEnLimitedBanner?.name.en || stats.nextEnLimitedBanner?.name.zh}", LMTGSID: ${stats.nextEnLimitedBanner?.lmtgsid})\n`,
    )
    console.log(`Dataset successfully written to ${OUTPUT_FILE}`)
  })()
}
