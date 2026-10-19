import { promises as fs } from 'node:fs'
import path from 'node:path'
import { DATA_SOURCES_CONFIG } from './sources.config'
import {
  type Skin,
  type SkinServerRegion,
  SkinSchema,
  SkinListSchema,
} from '../../shared/schemas'
import {
  type I18nLayersContext,
  type I18nLayersTracker,
  createI18nTracker,
  loadI18nLayersContext,
  resolveLayeredI18nString,
} from './i18n-layers'
import { isDefaultSkin, getSkinPriceStatus } from '../../shared/utils/skin'

interface RawDisplaySkin {
  skinName: string | null
  colorList?: string[]
  titleList?: string[]
  modelName?: string | null
  drawerList?: string[] | null
  designerList?: string[] | null
  skinGroupId?: string | null
  skinGroupName?: string | null
  skinGroupSortIndex?: number
  content?: string | null
  dialog?: string | null
  usage?: string | null
  description?: string | null
  obtainApproach?: string | null
  sortId?: number
  displayTagId?: string | null
  getTime?: number
  onYear?: number
  onPeriod?: number
}

interface RawSkin {
  skinId: string
  charId: string
  tokenSkinMap?: unknown
  illustId?: string | null
  spIllustId?: string | null
  dynIllustId?: string | null
  spDynIllustId?: string | null
  avatarId?: string | null
  spAvatarId?: string | null
  portraitId?: string | null
  spPortraitId?: string | null
  dynPortraitId?: string | null
  dynEntranceId?: string | null
  buildingId?: string | null
  battleSkin?: unknown
  isBuySkin?: boolean
  tmplId?: string | null
  voiceId?: string | null
  voiceType?: string | null
  displaySkin?: RawDisplaySkin | null
}

interface RawBrand {
  brandId: string
  brandName?: string
  brandCapitalName?: string
  description?: string
  groupList?: unknown[]
}

interface RawSkinTable {
  charSkins: Record<string, RawSkin>
  buildinEvolveMap?: Record<string, unknown>
  buildinPatchMap?: Record<string, unknown>
  brandList?: Record<string, RawBrand>
}

const RAW_CACHE_DIR = path.resolve(process.cwd(), DATA_SOURCES_CONFIG.cacheDir)
const DATA_OUTPUT_DIR = path.resolve(process.cwd(), 'data')
const SKINS_OUTPUT_PATH = path.join(DATA_OUTPUT_DIR, 'skins.json')

function resolveBrand(
  skinId: string,
  displaySkin: RawDisplaySkin | undefined | null,
  brandList: Record<string, RawBrand>,
): { brandId?: string; brandName?: string } {
  let brandId: string | undefined
  const match = skinId.match(/@([^#]+)#/)
  if (match && match[1]) {
    brandId = match[1]
  } else if (displaySkin?.skinGroupId && displaySkin.skinGroupId.includes('#')) {
    const parts = displaySkin.skinGroupId.split('#')
    brandId = parts[1]
  }

  if (brandId && brandList[brandId]) {
    return {
      brandId,
      brandName: brandList[brandId].brandName || displaySkin?.skinGroupName || undefined,
    }
  }

  if (brandId) {
    return {
      brandId,
      brandName: displaySkin?.skinGroupName || brandId,
    }
  }

  return {
    brandName: displaySkin?.skinGroupName || undefined,
  }
}

export async function buildSkins(): Promise<{
  totalProcessed: number
  cosmeticCount: number
  defaultCount: number
  cnOnlyCount: number
  buySkinsCount: number
  priceStatusCounts: {
    default: number
    free: number
    unknown: number
  }
}> {
  console.log('=== Arknights Operator Skins Generator ===\n')

  // 1. Load raw datasets
  console.log('1. Loading cached raw skin tables and playable operators index...')
  const [rawCnText, rawEnText, operatorsIndexText] = await Promise.all([
    fs.readFile(path.join(RAW_CACHE_DIR, 'cn', 'skin_table.json'), 'utf-8'),
    fs.readFile(path.join(RAW_CACHE_DIR, 'en', 'skin_table.json'), 'utf-8'),
    fs.readFile(path.join(DATA_OUTPUT_DIR, 'operators-index.json'), 'utf-8'),
  ])

  const rawCnTable = JSON.parse(rawCnText) as RawSkinTable
  const rawEnTable = JSON.parse(rawEnText) as RawSkinTable
  const operatorsIndex = JSON.parse(operatorsIndexText) as Array<{ id: string }>
  const playableOpIds = new Set(operatorsIndex.map(o => o.id))

  // 2. Load i18n layered resolution context
  console.log('2. Loading i18n layers context (overrides, wiki, glossary)...')
  const i18nContext: I18nLayersContext = await loadI18nLayersContext()
  const tracker: I18nLayersTracker = createI18nTracker()

  // 3. Collect unique skin IDs across CN and EN belonging to playable operators
  const allSkinIds = new Set<string>()
  for (const s of Object.values(rawCnTable.charSkins || {})) {
    if (playableOpIds.has(s.charId)) {
      allSkinIds.add(s.skinId)
    }
  }
  for (const s of Object.values(rawEnTable.charSkins || {})) {
    if (playableOpIds.has(s.charId)) {
      allSkinIds.add(s.skinId)
    }
  }

  // Deterministic ordering: charId ascending, then skinId ascending
  const sortedSkinIds = Array.from(allSkinIds).sort((a, b) => {
    const skinA = rawCnTable.charSkins[a] || rawEnTable.charSkins[a]!
    const skinB = rawCnTable.charSkins[b] || rawEnTable.charSkins[b]!
    if (skinA.charId !== skinB.charId) {
      return skinA.charId.localeCompare(skinB.charId)
    }
    return a.localeCompare(b)
  })

  console.log(`3. Processing ${sortedSkinIds.length} skins for playable operators...`)

  const brandList = {
    ...(rawEnTable.brandList || {}),
    ...(rawCnTable.brandList || {}),
  }

  const skins: Skin[] = []
  let cosmeticCount = 0
  let defaultCount = 0
  let cnOnlyCount = 0
  let buySkinsCount = 0
  const priceStatusCounts = {
    default: 0,
    free: 0,
    unknown: 0,
  }

  for (const skinId of sortedSkinIds) {
    const skinCn = rawCnTable.charSkins[skinId]
    const skinEn = rawEnTable.charSkins[skinId]
    const skinSource = skinCn || skinEn!

    const isCnOnly = !skinEn
    const servers: SkinServerRegion[] = skinEn ? ['cn', 'en'] : ['cn']

    if (isCnOnly) {
      cnOnlyCount++
    }

    const isDefault = isDefaultSkin(skinId)
    if (isDefault) {
      defaultCount++
    } else {
      cosmeticCount++
    }

    const isBuySkin = Boolean(skinSource.isBuySkin)
    if (isBuySkin) {
      buySkinsCount++
    }

    const charId = skinSource.charId
    const officialEn = skinEn?.displaySkin?.skinName ?? null
    const zhText = skinCn?.displaySkin?.skinName ?? null

    // Localize skin name
    let skinName
    if (!officialEn && !zhText) {
      const groupEn = skinEn?.displaySkin?.skinGroupName
      const groupZh = skinCn?.displaySkin?.skinGroupName
      const enName =
        groupEn === 'Default Outfit'
          ? skinSource.displaySkin?.skinGroupId === 'ILLUST_2'
            ? 'Elite 2'
            : 'Default'
          : groupEn || 'Default'
      const zhName =
        groupZh === '默认服装'
          ? skinSource.displaySkin?.skinGroupId === 'ILLUST_2'
            ? '精英二'
            : '默认'
          : groupZh || '默认服装'

      skinName = {
        en: enName,
        zh: zhName,
        source: 'official' as const,
        isMachineTranslation: false,
      }
    } else {
      skinName = resolveLayeredI18nString(
        {
          key: `skin.${skinId}.name`,
          charId,
          officialEn,
          zhText,
          isGlobal: !isCnOnly,
        },
        i18nContext,
        tracker,
      )
    }

    // Resolve fashion brand
    const { brandId, brandName } = resolveBrand(
      skinId,
      skinEn?.displaySkin ?? skinCn?.displaySkin,
      brandList,
    )

    // Resolve artists / illustrators
    const drawerList =
      skinEn?.displaySkin?.drawerList ?? skinCn?.displaySkin?.drawerList ?? []

    // Lore description & quotes
    const description =
      skinEn?.displaySkin?.description ?? skinCn?.displaySkin?.description ?? null
    const dialog =
      skinEn?.displaySkin?.dialog ?? skinCn?.displaySkin?.dialog ?? null
    const obtainApproach =
      skinEn?.displaySkin?.obtainApproach ?? skinCn?.displaySkin?.obtainApproach ?? null

    // Asset identifiers with fallback to skinId (converting @ to _ if needed)
    const normalizedFallback = skinId.replace(/@/g, '_')
    const illustId = skinSource.illustId || `illust_${normalizedFallback}`
    const avatarId = skinSource.avatarId || normalizedFallback
    const portraitId = skinSource.portraitId || normalizedFallback

    // Determine verifiable price status without heuristic guessing
    const priceStatus = getSkinPriceStatus({
      skinId,
      obtainApproach,
    })
    priceStatusCounts[priceStatus]++

    const skinRecord: Skin = SkinSchema.parse({
      skinId,
      charId,
      skinName,
      brandId: brandId ?? null,
      brandName: brandName ?? null,
      drawerList: Array.from(drawerList),
      description,
      dialog,
      obtainApproach,
      isBuySkin,
      isDefault,
      price: null,
      priceStatus,
      priceSource: null,
      currency: null,
      illustId,
      avatarId,
      portraitId,
      isCnOnly,
      servers,
    })

    skins.push(skinRecord)
  }

  // 4. Validate output dataset with Zod array schema
  console.log('4. Validating output skins dataset...')
  SkinListSchema.parse(skins)

  // 5. Save to data/skins.json
  console.log(`5. Writing ${skins.length} skins to ${SKINS_OUTPUT_PATH}...`)
  await fs.writeFile(SKINS_OUTPUT_PATH, JSON.stringify(skins, null, 2) + '\n', 'utf-8')

  console.log('\n=== Skins Generation Summary ===')
  console.log(`Total Skins: ${skins.length}`)
  console.log(`Cosmetic Outfits: ${cosmeticCount}`)
  console.log(`Default Operator Outfits: ${defaultCount}`)
  console.log(`Store Outfits (isBuySkin): ${buySkinsCount}`)
  console.log(`CN-only Skins: ${cnOnlyCount}`)
  console.log(
    `Price Status: default=${priceStatusCounts.default}, free=${priceStatusCounts.free}, unknown=${priceStatusCounts.unknown}`,
  )
  console.log(`Output: data/skins.json\n`)

  return {
    totalProcessed: skins.length,
    cosmeticCount,
    defaultCount,
    cnOnlyCount,
    buySkinsCount,
    priceStatusCounts,
  }
}

// Direct execution via CLI
if (process.argv[1]?.endsWith('build-skins.ts') || process.argv[1]?.endsWith('build-skins.js')) {
  buildSkins().catch(err => {
    console.error('Fatal error during skins generation:', err)
    process.exit(1)
  })
}
