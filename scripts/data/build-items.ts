import { promises as fs } from 'node:fs'
import path from 'node:path'
import {
  GameItemSchema,
  type GameItem,
  type ItemType,
} from '../../shared/schemas/item'
import type { RawItemTable, RawItem } from './schemas/item-table.schema'
import type { RawBuildingData } from './schemas/building-data.schema'

const CACHE_DIR = path.resolve(process.cwd(), '.cache/raw')
const OUTPUT_PATH = path.resolve(process.cwd(), 'data/items.json')

async function loadRawJson<T>(locale: 'en_US' | 'zh_CN', filename: string): Promise<T> {
  const filePath = path.join(CACHE_DIR, locale, filename)
  const raw = await fs.readFile(filePath, 'utf-8')
  return JSON.parse(raw) as T
}

function parseRarity(rawRarity: string | number): number {
  if (typeof rawRarity === 'number') return rawRarity
  const matched = rawRarity.match(/\d+/)
  if (matched) return parseInt(matched[0], 10)
  return 1
}

export function classifyItem(item: RawItem): ItemType | null {
  // 1. EXP Cards
  if (item.itemType === 'CARD_EXP') {
    return 'exp_card'
  }

  // 2. Currencies
  const currencyTypes = [
    'GOLD',
    'DIAMOND',
    'DIAMOND_SHD',
    'HGG_SHD',
    'LGG_SHD',
    'EPGS_COIN',
    'REP_COIN',
    'CRS_SHOP_COIN',
    'CRS_SHOP_COIN_V2',
    'RETRO_COIN',
    'LMTGS_COIN',
  ]
  if (
    currencyTypes.includes(item.itemType) ||
    (item.classifyType === 'NORMAL' && (item.itemType === 'GOLD' || item.itemType.endsWith('_COIN') || item.itemType.endsWith('_SHD')))
  ) {
    return 'currency'
  }

  // 3. Chips and Catalysts (identified by MTL_ASC_ prefix or catalyst usage)
  if (item.iconId && item.iconId.startsWith('MTL_ASC_')) {
    if (
      item.iconId === 'MTL_ASC_DI' ||
      (item.usage && item.usage.toLowerCase().includes('catalyst')) ||
      item.name.toLowerCase().includes('catalyst')
    ) {
      return 'catalyst'
    }
    if (item.iconId.endsWith('1') || item.iconId.endsWith('3')) {
      return 'chip'
    }
    if (item.iconId.endsWith('2')) {
      return 'chip_pack'
    }
  }

  // 4. Materials (Promotion items, skill summaries, module blocks)
  if (item.classifyType === 'MATERIAL' || item.itemType === 'MATERIAL') {
    return 'material'
  }

  // Fallback for unclassified item types
  return null
}

export async function buildItems(): Promise<{
  items: GameItem[]
  unclassifiedItems: Array<{ id: string; name: string; itemType: string; classifyType: string }>
}> {
  console.log('Loading raw item tables and recipe data...')
  const [itemTableEn, itemTableCn, buildingDataEn] = await Promise.all([
    loadRawJson<RawItemTable>('en_US', 'item_table.json'),
    loadRawJson<RawItemTable>('zh_CN', 'item_table.json'),
    loadRawJson<RawBuildingData>('en_US', 'building_data.json'),
  ])

  // Collect craftable product IDs from workshop and factory
  const craftableIds = new Set<string>()
  for (const f of Object.values(buildingDataEn.workshopFormulas ?? {})) {
    craftableIds.add(f.itemId)
  }
  for (const f of Object.values(buildingDataEn.manufactFormulas ?? {})) {
    if (f.formulaType === 'F_ASC') {
      craftableIds.add(f.itemId)
    }
  }

  const enItemsMap = itemTableEn.items ?? {}
  const cnItemsMap = itemTableCn.items ?? {}
  const allItemIds = Array.from(
    new Set([...Object.keys(enItemsMap), ...Object.keys(cnItemsMap)]),
  )

  const items: GameItem[] = []
  const unclassifiedItems: Array<{ id: string; name: string; itemType: string; classifyType: string }> = []

  for (const id of allItemIds) {
    const rawEn = enItemsMap[id]
    const rawCn = cnItemsMap[id]
    const base = rawEn ?? rawCn
    if (!base) continue

    const classifiedType = classifyItem(base)
    if (!classifiedType) {
      unclassifiedItems.push({
        id,
        name: base.name,
        itemType: base.itemType,
        classifyType: base.classifyType,
      })
      continue
    }

    const rarity = parseRarity(base.rarity)
    const canDrop = (base.stageDropList && base.stageDropList.length > 0) || false
    const canCraft = craftableIds.has(id) || (base.buildingProductList && base.buildingProductList.length > 0) || false
    const isModuleToken = id.startsWith('mod_')

    const itemObj: GameItem = {
      id,
      name: {
        en: rawEn?.name || rawCn?.name || id,
        zh: rawCn?.name || rawEn?.name || id,
      },
      rarity,
      type: classifiedType,
      sortId: base.sortId ?? 999999,
      iconId: base.iconId || id,
      flags: {
        canDrop,
        canCraft,
        ...(isModuleToken ? { isModuleToken: true } : {}),
      },
    }

    GameItemSchema.parse(itemObj)
    items.push(itemObj)
  }

  // Sort deterministically by sortId ascending, then id ascending
  items.sort((a, b) => {
    if (a.sortId !== b.sortId) return a.sortId - b.sortId
    return a.id.localeCompare(b.id)
  })

  return { items, unclassifiedItems }
}

async function main(): Promise<void> {
  const startTime = Date.now()
  const { items, unclassifiedItems } = await buildItems()

  const jsonStr = JSON.stringify(items, null, 2)
  await fs.writeFile(OUTPUT_PATH, jsonStr, 'utf-8')

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2)
  const sizeKb = (Buffer.byteLength(jsonStr, 'utf-8') / 1024).toFixed(1)

  const typeCounts: Record<string, number> = {}
  for (const it of items) {
    typeCounts[it.type] = (typeCounts[it.type] || 0) + 1
  }

  console.log(`\n=== Items Build Summary ===`)
  console.log(`Total classified planner items: ${items.length}`)
  console.log(`Category breakdown:`)
  for (const [t, cnt] of Object.entries(typeCounts)) {
    console.log(`  - ${t.padEnd(12)}: ${cnt}`)
  }
  console.log(`Unclassified non-planner items: ${unclassifiedItems.length} (excluded)`)
  console.log(`Output file size:               ${sizeKb} KB`)
  console.log(`Duration:                       ${elapsed}s`)
  console.log(`Saved to ${OUTPUT_PATH}`)
}

if (process.argv[1]?.includes('build-items')) {
  main().catch((err: unknown) => {
    console.error('Fatal error building items:', err)
    process.exit(1)
  })
}
