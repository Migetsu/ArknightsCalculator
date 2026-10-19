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

/**
 * Resolves the fashion brand identifier and localized display names.
 * Ensures English values from the official EN table take strict precedence,
 * with Chinese values used only as fallback for CN-only releases.
 */
function resolveBrand(
  skinId: string,
  displaySkinEn: RawDisplaySkin | undefined | null,
  displaySkinCn: RawDisplaySkin | undefined | null,
  brandListEn: Record<string, RawBrand>,
  brandListCn: Record<string, RawBrand>,
): { brandId?: string; brandNameEn?: string; brandNameZh?: string } {
  let brandId: string | undefined
  const match = skinId.match(/@([^#]+)#/)
  if (match && match[1]) {
    brandId = match[1]
  } else if (displaySkinEn?.skinGroupId && displaySkinEn.skinGroupId.includes('#')) {
    brandId = displaySkinEn.skinGroupId.split('#')[1]
  } else if (displaySkinCn?.skinGroupId && displaySkinCn.skinGroupId.includes('#')) {
    brandId = displaySkinCn.skinGroupId.split('#')[1]
  }

  // EN display brand name:
  // 1. displaySkin.skinGroupName from EN (e.g. 'Test Collection/II')
  // 2. brandList.brandName from EN (e.g. 'Test Collection')
  // 3. brandList.brandCapitalName from EN
  const brandNameEn =
    displaySkinEn?.skinGroupName ||
    (brandId
      ? brandListEn[brandId]?.brandName || brandListEn[brandId]?.brandCapitalName
      : undefined)

  // ZH display brand name:
  // 1. displaySkin.skinGroupName from CN
  // 2. brandList.brandName from CN
  // 3. brandList.brandCapitalName from CN
  const brandNameZh =
    displaySkinCn?.skinGroupName ||
    (brandId
      ? brandListCn[brandId]?.brandName || brandListCn[brandId]?.brandCapitalName
      : undefined)

  return {
    brandId,
    brandNameEn,
    brandNameZh: brandNameZh || brandNameEn,
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

    // 3.1 Localize skin name
    let skinName
    if (isDefault) {
      const isElite2 =
        skinSource.displaySkin?.skinGroupId === 'ILLUST_2' || skinId.endsWith('#2')
      const enName = isElite2 ? 'Elite 2' : 'Default'
      const zhName = skinCn?.displaySkin?.skinGroupName || enName

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

    // 3.2 Resolve fashion brand and localize brand name
    const { brandId, brandNameEn, brandNameZh } = resolveBrand(
      skinId,
      skinEn?.displaySkin,
      skinCn?.displaySkin,
      rawEnTable.brandList || {},
      rawCnTable.brandList || {},
    )

    const brandName =
      brandNameEn || brandNameZh
        ? resolveLayeredI18nString(
            {
              key: `skin.${skinId}.brandName`,
              charId,
              officialEn: brandNameEn,
              zhText: brandNameZh ?? null,
              isGlobal: !isCnOnly,
            },
            i18nContext,
            tracker,
          )
        : null

    // 3.3 Artists / illustrators (proper pen names credited by developer)
    const drawerList =
      skinEn?.displaySkin?.drawerList ?? skinCn?.displaySkin?.drawerList ?? []

    // 3.4 Localize lore description & quote/dialog
    const rawDescEn = skinEn?.displaySkin?.description ?? null
    const rawDescZh = skinCn?.displaySkin?.description ?? null
    const description =
      rawDescEn || rawDescZh
        ? resolveLayeredI18nString(
            {
              key: `skin.${skinId}.description`,
              charId,
              officialEn: rawDescEn,
              zhText: rawDescZh,
              isGlobal: !isCnOnly,
            },
            i18nContext,
            tracker,
          )
        : null

    const rawDialogEn = skinEn?.displaySkin?.dialog ?? null
    const rawDialogZh = skinCn?.displaySkin?.dialog ?? null
    const dialog =
      rawDialogEn || rawDialogZh
        ? resolveLayeredI18nString(
            {
              key: `skin.${skinId}.dialog`,
              charId,
              officialEn: rawDialogEn,
              zhText: rawDialogZh,
              isGlobal: !isCnOnly,
            },
            i18nContext,
            tracker,
          )
        : null

    // 3.5 Localize acquisition approach
    const rawApproachEn = skinEn?.displaySkin?.obtainApproach ?? null
    const rawApproachZh = skinCn?.displaySkin?.obtainApproach ?? null
    const obtainApproach =
      rawApproachEn || rawApproachZh
        ? resolveLayeredI18nString(
            {
              key: `skin.${skinId}.obtainApproach`,
              charId,
              officialEn: rawApproachEn,
              zhText: rawApproachZh,
              isGlobal: !isCnOnly,
            },
            i18nContext,
            tracker,
          )
        : null

    // 3.6 Asset identifiers with fallback to skinId (converting @ to _ if needed)
    const normalizedFallback = skinId.replace(/@/g, '_')
    const illustId = skinSource.illustId || `illust_${normalizedFallback}`
    const avatarId = skinSource.avatarId || normalizedFallback
    const portraitId = skinSource.portraitId || normalizedFallback

    // 3.7 Determine verifiable price status without heuristic guessing
    const priceStatus = getSkinPriceStatus({
      skinId,
      isDefault,
      isBuySkin,
      obtainApproach: rawApproachEn,
    })
    priceStatusCounts[priceStatus]++

    const skinRecord: Skin = SkinSchema.parse({
      skinId,
      charId,
      skinName,
      brandId: brandId ?? null,
      brandName,
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
