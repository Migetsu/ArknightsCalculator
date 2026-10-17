import { promises as fs } from 'node:fs'
import path from 'node:path'
import { DATA_SOURCES_CONFIG } from './sources.config'
import {
  CraftRecipeSchema,
  type CraftRecipe,
  type RecipeExtraOutcome,
} from '../../shared/schemas/recipe'
import type { RawBuildingData } from './schemas/building-data.schema'

const CACHE_DIR = path.resolve(process.cwd(), '.cache/raw')
const OUTPUT_PATH = path.resolve(process.cwd(), 'data/recipes.json')

async function loadRawJson<T>(locale: 'en' | 'en_US' | 'zh_CN', filename: string): Promise<T> {
  const filePath = path.join(CACHE_DIR, locale, filename)
  const raw = await fs.readFile(filePath, 'utf-8')
  return JSON.parse(raw) as T
}

export async function buildRecipes(): Promise<{
  recipes: CraftRecipe[]
  workshopCount: number
  manufactureCount: number
}> {
  console.log('Loading raw building_data.json...')
  const buildingData = await loadRawJson<RawBuildingData>(
    DATA_SOURCES_CONFIG.sources.en.locale,
    'building_data.json',
  )

  const recipes: CraftRecipe[] = []

  // 1. Process all Workshop formulas
  const rawWf = Object.values(buildingData.workshopFormulas ?? {})
  let workshopCount = 0

  for (const wf of rawWf) {
    const rawOutcomes = wf.extraOutcomeGroup ?? []
    const totalWeight = rawOutcomes.reduce((acc, curr) => acc + (curr.weight ?? 0), 0)
    const rate = wf.extraOutcomeRate ?? 0

    const extraOutcomes: RecipeExtraOutcome[] = rawOutcomes.map((ex) => ({
      id: ex.itemId,
      count: ex.itemCount,
      weight: ex.weight,
      probability: totalWeight > 0 ? Number((rate * (ex.weight / totalWeight)).toFixed(6)) : 0,
    }))

    const isChipConversion = wf.formulaType === 'F_ASC'
    const kind = isChipConversion ? 'conversion' : 'synthesis'

    const recipe: CraftRecipe = {
      id: `wf_${wf.formulaId}`,
      kind,
      resultId: wf.itemId,
      resultCount: wf.count,
      ingredients: wf.costs.map((c) => ({
        id: c.id,
        count: c.count,
      })),
      goldCost: wf.goldCost ?? 0,
      formulaType: wf.formulaType,
      roomType: 'WORKSHOP',
      ...(rate > 0 ? { extraOutcomeRate: rate } : {}),
      ...(extraOutcomes.length > 0 ? { extraOutcomes } : {}),
    }

    CraftRecipeSchema.parse(recipe)
    recipes.push(recipe)
    workshopCount++
  }

  // 2. Process Dualchip Factory formulas (F_ASC in manufactFormulas)
  const rawMf = Object.values(buildingData.manufactFormulas ?? {})
  let manufactureCount = 0

  for (const mf of rawMf) {
    if (mf.formulaType !== 'F_ASC') continue

    const recipe: CraftRecipe = {
      id: `mf_${mf.formulaId}`,
      kind: 'manufacture',
      resultId: mf.itemId,
      resultCount: mf.count,
      ingredients: mf.costs.map((c) => ({
        id: c.id,
        count: c.count,
      })),
      goldCost: 0,
      formulaType: 'F_ASC',
      roomType: 'MANUFACTURE',
    }

    CraftRecipeSchema.parse(recipe)
    recipes.push(recipe)
    manufactureCount++
  }

  // Sort deterministically
  recipes.sort((a, b) => {
    if (a.roomType !== b.roomType) return a.roomType.localeCompare(b.roomType)
    if (a.formulaType !== b.formulaType) return a.formulaType.localeCompare(b.formulaType)
    if (a.resultId !== b.resultId) return a.resultId.localeCompare(b.resultId)
    return a.id.localeCompare(b.id)
  })

  return { recipes, workshopCount, manufactureCount }
}

async function main(): Promise<void> {
  const startTime = Date.now()
  const { recipes, workshopCount, manufactureCount } = await buildRecipes()

  const jsonStr = JSON.stringify(recipes, null, 2)
  await fs.writeFile(OUTPUT_PATH, jsonStr, 'utf-8')

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2)
  const sizeKb = (Buffer.byteLength(jsonStr, 'utf-8') / 1024).toFixed(1)

  console.log(`\n=== Recipes Build Summary ===`)
  console.log(`Total normalized recipes: ${recipes.length}`)
  console.log(`  - Workshop formulas:    ${workshopCount}`)
  console.log(`  - Dualchip (Factory):   ${manufactureCount}`)
  console.log(`Output file size:         ${sizeKb} KB`)
  console.log(`Duration:                 ${elapsed}s`)
  console.log(`Saved to ${OUTPUT_PATH}`)
}

if (process.argv[1]?.includes('build-recipes')) {
  main().catch((err: unknown) => {
    console.error('Fatal error building recipes:', err)
    process.exit(1)
  })
}
