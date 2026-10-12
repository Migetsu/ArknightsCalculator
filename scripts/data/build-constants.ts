import { promises as fs } from 'node:fs'
import path from 'node:path'
import {
  GameConstantsSchema,
  type GameConstants,
  type GameTerm,
} from '../../shared/schemas/gameConstants'
import type { RawGamedataConst } from './schemas/gamedata-const.schema'
import type { RawItemTable } from './schemas/item-table.schema'

const CACHE_DIR = path.resolve(process.cwd(), '.cache/raw')
const OUTPUT_PATH = path.resolve(process.cwd(), 'data/constants.json')

async function loadRawJson<T>(locale: 'en_US' | 'zh_CN', filename: string): Promise<T> {
  const filePath = path.join(CACHE_DIR, locale, filename)
  const raw = await fs.readFile(filePath, 'utf-8')
  return JSON.parse(raw) as T
}

export async function buildConstants(): Promise<GameConstants> {
  console.log('Loading raw gamedata_const and item_table...')
  const [constEn, constCn, itemTableEn] = await Promise.all([
    loadRawJson<RawGamedataConst>('en_US', 'gamedata_const.json'),
    loadRawJson<RawGamedataConst>('zh_CN', 'gamedata_const.json'),
    loadRawJson<RawItemTable>('en_US', 'item_table.json'),
  ])

  // 1. maxLevel by rarity ('1'..'6') and elite phase
  const maxLevel: Record<string, number[]> = {}
  for (let rarity = 1; rarity <= 6; rarity++) {
    const rawRarityArr = constEn.maxLevel[rarity - 1] ?? []
    maxLevel[String(rarity)] = [...rawRarityArr]
  }

  // 2. characterExpMap by elite phase ('0'..'2')
  const characterExpMap: Record<string, number[]> = {}
  const rawExp = constEn.characterExpMap as unknown as number[][] | Record<string, number[]>
  if (Array.isArray(rawExp)) {
    for (let phase = 0; phase < rawExp.length; phase++) {
      characterExpMap[String(phase)] = [...(rawExp[phase] ?? [])]
    }
  } else {
    for (const [phase, arr] of Object.entries(rawExp)) {
      characterExpMap[phase] = [...arr]
    }
  }

  // 3. characterUpgradeCostMap by elite phase ('0'..'2')
  const characterUpgradeCostMap: Record<string, number[]> = {}
  const rawCost = constEn.characterUpgradeCostMap as unknown as number[][] | Record<string, number[]>
  if (Array.isArray(rawCost)) {
    for (let phase = 0; phase < rawCost.length; phase++) {
      characterUpgradeCostMap[String(phase)] = [...(rawCost[phase] ?? [])]
    }
  } else {
    for (const [phase, arr] of Object.entries(rawCost)) {
      characterUpgradeCostMap[phase] = [...arr]
    }
  }

  // 4. evolveGoldCost by rarity ('1'..'6') -> [E1 cost, E2 cost]
  // Negative values (-1) in Arknights data indicate unavailable promotion phase
  const evolveGoldCost: Record<string, number[]> = {}
  for (let rarity = 1; rarity <= 6; rarity++) {
    const rawEvolve = constEn.evolveGoldCost[rarity - 1] ?? []
    evolveGoldCost[String(rarity)] = rawEvolve.map((cost) => (cost > 0 ? cost : 0))
  }

  // 5. EXP Items (Battle Records) from item_table
  const rawExpItems = itemTableEn.expItems ?? {}
  const expItems = Object.values(rawExpItems)
    .map((item) => ({
      id: item.id,
      gainExp: item.gainExp,
    }))
    .sort((a, b) => a.gainExp - b.gainExp)

  // 6. Terminology dictionary with bilingual localization
  const allTermKeys = Array.from(
    new Set([
      ...Object.keys(constEn.termDescriptionDict ?? {}),
      ...Object.keys(constCn.termDescriptionDict ?? {}),
    ]),
  ).sort()

  const terms: Record<string, GameTerm> = {}
  for (const termKey of allTermKeys) {
    const enTerm = constEn.termDescriptionDict?.[termKey]
    const cnTerm = constCn.termDescriptionDict?.[termKey]

    terms[termKey] = {
      id: termKey,
      name: {
        en: enTerm?.termName || cnTerm?.termName || termKey,
        zh: cnTerm?.termName || enTerm?.termName || termKey,
      },
      description: {
        en: enTerm?.description || cnTerm?.description || '',
        zh: cnTerm?.description || enTerm?.description || '',
      },
    }
  }

  const constants: GameConstants = {
    maxLevel,
    characterExpMap,
    characterUpgradeCostMap,
    evolveGoldCost,
    masteryCost: null,
    lmdItemId: '4001',
    expItems,
    terms,
  }

  // Strict validation against schema
  const validated = GameConstantsSchema.parse(constants)
  return validated
}

async function main(): Promise<void> {
  const startTime = Date.now()
  const constants = await buildConstants()

  const jsonStr = JSON.stringify(constants, null, 2)
  await fs.writeFile(OUTPUT_PATH, jsonStr, 'utf-8')

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2)
  const sizeKb = (Buffer.byteLength(jsonStr, 'utf-8') / 1024).toFixed(1)

  console.log(`\n=== Constants Build Summary ===`)
  console.log(`MaxLevel entries:        ${Object.keys(constants.maxLevel).length} rarities`)
  console.log(`EXP map phases:          ${Object.keys(constants.characterExpMap).length} phases`)
  console.log(`Upgrade cost phases:     ${Object.keys(constants.characterUpgradeCostMap).length} phases`)
  console.log(`Evolve cost entries:     ${Object.keys(constants.evolveGoldCost).length} rarities`)
  console.log(`EXP item cards:          ${constants.expItems.length}`)
  console.log(`Terminology dictionary:  ${Object.keys(constants.terms).length} terms`)
  console.log(`Output file size:        ${sizeKb} KB`)
  console.log(`Duration:                ${elapsed}s`)
  console.log(`Saved to ${OUTPUT_PATH}`)
}

if (process.argv[1]?.includes('build-constants')) {
  main().catch((err: unknown) => {
    console.error('Fatal error building constants:', err)
    process.exit(1)
  })
}
