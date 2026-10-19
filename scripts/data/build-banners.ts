import fs from 'node:fs'
import path from 'node:path'
import {
  BannersDatasetSchema,
  type BannersDataset,
  type BannerSummary,
  type BannerType,
  type GachaBanner,
  type NextBannerSummary,
} from '../../shared/schemas/banner'
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

export interface BuildBannersOptions {
  now?: number
  write?: boolean
  i18nContext?: I18nLayersContext
  tracker?: I18nLayersTracker
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
    currentEnBanner: BannerSummary | null
    activeEnBanners: BannerSummary[]
    activeCnBanners: BannerSummary[]
    nextEnLimitedBanner: NextBannerSummary | null
  }
}

export function buildBannersFromTables(
  enRaw: RawGachaTable,
  cnRaw: RawGachaTable,
  options: { now?: number; i18nContext?: I18nLayersContext; tracker?: I18nLayersTracker } = {},
): BuildBannersResult {
  const nowSec = options.now ?? Math.floor(Date.now() / 1000)
  const i18nContext = options.i18nContext ?? createEmptyI18nLayersContext()
  const tracker = options.tracker

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

  // 5. Identify Next EN Limited Banner via LMTGSID progression
  // In sorted CN limited pools, find the first one that does NOT have an EN match
  const cnLimitedSorted = cnFiltered.filter((p) => p.gachaRuleType === 'LIMITED')
  const nextCnLimited = cnLimitedSorted.find((p) => !cnToEnLimitedPairs.has(p.gachaPoolId))

  // 6. Transform into GachaBanner entries
  const enBanners: GachaBanner[] = enFiltered.map((p) => {
    const type = mapRuleToBannerType(p.gachaRuleType, p.gachaPoolName)
    const openIso = new Date(p.openTime * 1000).toISOString()
    const endIso = new Date(p.endTime * 1000).toISOString()
    const isActive = nowSec >= p.openTime && nowSec <= p.endTime
    const pairedId = enToCnLimitedPairs.get(p.gachaPoolId) ?? null

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
      rateUp6: [],
      rateUp5: [],
    }
  })

  const cnBanners: GachaBanner[] = cnFiltered.map((p) => {
    const type = mapRuleToBannerType(p.gachaRuleType, p.gachaPoolName)
    const openIso = new Date(p.openTime * 1000).toISOString()
    const endIso = new Date(p.endTime * 1000).toISOString()
    const isActive = nowSec >= p.openTime && nowSec <= p.endTime
    const pairedId = cnToEnLimitedPairs.get(p.gachaPoolId) ?? null
    const isNext = nextCnLimited ? p.gachaPoolId === nextCnLimited.gachaPoolId : false

    const bannerName = resolveLayeredI18nString(
      {
        key: `banner.${p.gachaPoolId}.name`,
        officialEn: null,
        zhText: p.gachaPoolName,
        isGlobal: false,
      },
      i18nContext,
      tracker,
    )

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
      cnStartDate: openIso.split('T')[0]!.replace(/-/g, '/'),
      cnEndDate: endIso.split('T')[0]!.replace(/-/g, '/'),
      rateUp6: [],
      rateUp5: [],
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
      currentEnBanner,
      activeEnBanners,
      activeCnBanners,
      nextEnLimitedBanner,
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
