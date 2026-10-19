import { promises as fs } from 'node:fs'
import path from 'node:path'
import type { GameItem } from '../../shared/schemas/item'
import type { CraftRecipe } from '../../shared/schemas/recipe'
import type { GameConstants } from '../../shared/schemas/gameConstants'
import type { OperatorDetail, OperatorSummary } from '../../shared/schemas/operator'
import { RecruitDataSchema } from '../../shared/schemas/recruit'
import { SkinListSchema } from '../../shared/schemas/skin'
import { RangesDictionarySchema, type RangesDictionary } from '../../shared/schemas/range'
import { OperatorHandbookSchema, type OperatorHandbook } from '../../shared/schemas/handbook'
import { BannersDatasetSchema, type BannersDataset } from '../../shared/schemas/banner'

const DATA_DIR = path.resolve(process.cwd(), 'data')
const OPERATORS_DIR = path.join(DATA_DIR, 'operators')
const HANDBOOK_DIR = path.join(DATA_DIR, 'handbook')
const LEGACY_HANDBOOK_FILE = path.join(DATA_DIR, 'handbook.json')
const BANNERS_FILE = path.join(DATA_DIR, 'banners.json')

interface ValidationIssue {
  entityType: 'operator' | 'recipe' | 'constants' | 'asset' | 'recruit' | 'skin' | 'range' | 'handbook' | 'banner'
  entityId: string
  referenceType: 'item' | 'skill' | 'module' | 'operator' | 'schema' | 'range' | 'banner'
  referenceId: string
  message: string
}

export async function validateDataIntegrity(): Promise<{
  totalOperatorsChecked: number
  totalRecipesChecked: number
  totalItemsChecked: number
  totalSkinsChecked: number
  totalRangesChecked: number
  totalHandbooksChecked: number
  totalBannersChecked: number
  totalItemReferences: number
  totalSkillReferences: number
  totalModuleReferences: number
  totalRangeReferences: number
  totalRecruitPoolChecked: number
  globalReferencingCnOnlyCount: number
  issues: ValidationIssue[]
}> {
  console.log('=== Arknights Data Integrity & Referential Validator ===\n')

  // 1. Load items, recipes, constants, and index
  console.log('1. Loading datasets...')
  const [itemsRaw, recipesRaw, constantsRaw, indexRaw, recruitRaw, rangesRaw] = await Promise.all([
    fs.readFile(path.join(DATA_DIR, 'items.json'), 'utf-8'),
    fs.readFile(path.join(DATA_DIR, 'recipes.json'), 'utf-8'),
    fs.readFile(path.join(DATA_DIR, 'constants.json'), 'utf-8'),
    fs.readFile(path.join(DATA_DIR, 'operators-index.json'), 'utf-8'),
    fs.readFile(path.join(DATA_DIR, 'recruit.json'), 'utf-8'),
    fs.readFile(path.join(DATA_DIR, 'ranges.json'), 'utf-8'),
  ])

  const items = JSON.parse(itemsRaw) as GameItem[]
  const recipes = JSON.parse(recipesRaw) as CraftRecipe[]
  const constants = JSON.parse(constantsRaw) as GameConstants
  const index = JSON.parse(indexRaw) as OperatorSummary[]
  const recruit = JSON.parse(recruitRaw) as unknown
  const ranges = JSON.parse(rangesRaw) as RangesDictionary

  const itemMap = new Map<string, GameItem>()
  for (const it of items) {
    itemMap.set(it.id, it)
  }

  const issues: ValidationIssue[] = []
  let totalItemReferences = 0
  let totalSkillReferences = 0
  let totalModuleReferences = 0
  let totalRangeReferences = 0
  let globalReferencingCnOnlyCount = 0

  // 2. Validate Constants item references
  console.log('2. Validating constants item references...')
  totalItemReferences++
  if (!itemMap.has(constants.lmdItemId)) {
    issues.push({
      entityType: 'constants',
      entityId: 'constants.json',
      referenceType: 'item',
      referenceId: constants.lmdItemId,
      message: `LMD currency ID '${constants.lmdItemId}' does not exist in items.json`,
    })
  }

  for (const expItem of constants.expItems) {
    totalItemReferences++
    if (!itemMap.has(expItem.id)) {
      issues.push({
        entityType: 'constants',
        entityId: 'constants.json',
        referenceType: 'item',
        referenceId: expItem.id,
        message: `EXP item '${expItem.id}' does not exist in items.json`,
      })
    }
  }

  // 3. Validate Recipes item references
  console.log('3. Validating recipe item references...')
  for (const recipe of recipes) {
    totalItemReferences++
    if (!itemMap.has(recipe.resultId)) {
      issues.push({
        entityType: 'recipe',
        entityId: recipe.id,
        referenceType: 'item',
        referenceId: recipe.resultId,
        message: `Recipe result item '${recipe.resultId}' does not exist in items.json`,
      })
    }

    for (const ing of recipe.ingredients) {
      totalItemReferences++
      if (!itemMap.has(ing.id)) {
        issues.push({
          entityType: 'recipe',
          entityId: recipe.id,
          referenceType: 'item',
          referenceId: ing.id,
          message: `Recipe ingredient '${ing.id}' does not exist in items.json`,
        })
      }
    }

    for (const ex of recipe.extraOutcomes ?? []) {
      totalItemReferences++
      if (!itemMap.has(ex.id)) {
        issues.push({
          entityType: 'recipe',
          entityId: recipe.id,
          referenceType: 'item',
          referenceId: ex.id,
          message: `Recipe extra outcome '${ex.id}' does not exist in items.json`,
        })
      }
    }
  }

  // 4. Validate Operators details and index parity
  console.log('4. Validating operator details (items, skills, modules) & index parity...')
  const opFiles = (await fs.readdir(OPERATORS_DIR)).filter(f => f.endsWith('.json'))
  const indexedIds = new Set(index.map(op => op.id))

  if (opFiles.length !== index.length) {
    issues.push({
      entityType: 'operator',
      entityId: 'index',
      message: `Operators index count (${index.length}) does not match detail files count (${opFiles.length})`,
    })
  }

  for (const file of opFiles) {
    const opFilePath = path.join(OPERATORS_DIR, file)
    const opRaw = await fs.readFile(opFilePath, 'utf-8')
    const op = JSON.parse(opRaw) as OperatorDetail

    if (!indexedIds.has(op.id)) {
      issues.push({
        entityType: 'operator',
        entityId: op.id,
        message: `Operator detail '${op.id}' is missing from operators-index.json`,
      })
    }

    // 4.1 Evolve item costs
    for (const phase of op.phases ?? []) {
      for (const cost of phase.evolveCost ?? []) {
        totalItemReferences++
        if (!itemMap.has(cost.id)) {
          issues.push({
            entityType: 'operator',
            entityId: op.id,
            referenceType: 'item',
            referenceId: cost.id,
            message: `Operator evolve cost references unknown item '${cost.id}'`,
          })
        }
      }
    }

    // 4.2 Skills and Mastery item costs
    for (const skill of op.skills ?? []) {
      totalSkillReferences++
      if (!skill.skillId || skill.levels.length === 0) {
        issues.push({
          entityType: 'operator',
          entityId: op.id,
          referenceType: 'skill',
          referenceId: skill.skillId || 'unknown',
          message: `Operator has invalid skill definition with empty levels`,
        })
      }

      for (const mastery of skill.masteryCosts ?? []) {
        for (const cost of mastery.levelUpCost ?? []) {
          totalItemReferences++
          if (!itemMap.has(cost.id)) {
            issues.push({
              entityType: 'operator',
              entityId: op.id,
              referenceType: 'item',
              referenceId: cost.id,
              message: `Skill mastery cost references unknown item '${cost.id}'`,
            })
          }
        }
      }
    }

    // 4.3 Modules and module stage costs
    for (const mod of op.modules ?? []) {
      totalModuleReferences++
      if (!mod.id || !mod.name) {
        issues.push({
          entityType: 'operator',
          entityId: op.id,
          referenceType: 'module',
          referenceId: mod.id || 'unknown',
          message: `Operator has module with missing id or name`,
        })
      }

      // Check itemCost
      for (const [stage, costs] of Object.entries(mod.itemCost ?? {})) {
        for (const cost of costs) {
          totalItemReferences++
          if (!itemMap.has(cost.id)) {
            issues.push({
              entityType: 'operator',
              entityId: op.id,
              referenceType: 'item',
              referenceId: cost.id,
              message: `Module '${mod.id}' stage ${stage} itemCost references unknown item '${cost.id}'`,
            })
          }
        }
      }

      // Check stages cost
      for (const st of mod.stages ?? []) {
        for (const cost of st.cost ?? []) {
          totalItemReferences++
          if (!itemMap.has(cost.id)) {
            issues.push({
              entityType: 'operator',
              entityId: op.id,
              referenceType: 'item',
              referenceId: cost.id,
              message: `Module '${mod.id}' stage ${st.stage} cost references unknown item '${cost.id}'`,
            })
          }
        }
      }
    }

    // 4.4 Track Global content referencing CN-only items
    const isGlobalOp = op.servers.includes('global')
    const checkItemAvailability = (itemId: string, _contextDesc?: string) => {
      const item = itemMap.get(itemId)
      if (item && !item.servers.includes('global') && isGlobalOp) {
        globalReferencingCnOnlyCount++
      }
    }

    for (const phase of op.phases ?? []) {
      if (phase.rangeId) {
        totalRangeReferences++
        if (!ranges[phase.rangeId]) {
          issues.push({
            entityType: 'operator',
            entityId: `${op.id}:phase-${phase.phase}`,
            referenceType: 'range',
            referenceId: phase.rangeId,
            message: `Operator '${op.id}' phase ${phase.phase} references unknown rangeId '${phase.rangeId}'`,
          })
        }
      }
      for (const cost of phase.evolveCost ?? []) {
        checkItemAvailability(cost.id, 'evolveCost')
      }
    }
    for (const skill of op.skills ?? []) {
      for (let lvlIdx = 0; lvlIdx < (skill.levels ?? []).length; lvlIdx++) {
        const lvl = skill.levels[lvlIdx]
        if (lvl?.rangeId) {
          totalRangeReferences++
          if (!ranges[lvl.rangeId]) {
            issues.push({
              entityType: 'operator',
              entityId: `${op.id}:${skill.skillId}:level-${lvlIdx + 1}`,
              referenceType: 'range',
              referenceId: lvl.rangeId,
              message: `Operator '${op.id}' skill '${skill.skillId}' level ${lvlIdx + 1} references unknown rangeId '${lvl.rangeId}'`,
            })
          }
        }
      }
      for (const mastery of skill.masteryCosts ?? []) {
        for (const cost of mastery.levelUpCost ?? []) {
          checkItemAvailability(cost.id, 'masteryCost')
        }
      }
    }
    for (const mod of op.modules ?? []) {
      const isGlobalMod = mod.servers.includes('global')
      for (const costs of Object.values(mod.itemCost ?? {})) {
        for (const cost of costs) {
          const item = itemMap.get(cost.id)
          if (item && !item.servers.includes('global') && isGlobalMod) {
            globalReferencingCnOnlyCount++
          }
        }
      }
    }
  }

  // 5. Validate Recruitment Data
  console.log('5. Validating recruitment data...')
  let totalRecruitPoolChecked = 0
  try {
    const parsedRecruit = RecruitDataSchema.parse(recruit)
    if (parsedRecruit.tags.length !== 29) {
      issues.push({
        entityType: 'recruit',
        entityId: 'recruit.json',
        referenceType: 'schema',
        referenceId: 'tags',
        message: `Expected 29 recruitment tags, found ${parsedRecruit.tags.length}`,
      })
    }

    const validatePool = (poolName: 'global' | 'cn', pool: typeof parsedRecruit.pools.global) => {
      for (const op of pool) {
        totalRecruitPoolChecked++
        if (!indexedIds.has(op.id)) {
          issues.push({
            entityType: 'recruit',
            entityId: `recruit.json:pools.${poolName}`,
            referenceType: 'operator',
            referenceId: op.id,
            message: `Operator '${op.id}' (${op.name.en}) does not exist in operators-index.json`,
          })
        }
      }
    }

    validatePool('global', parsedRecruit.pools.global)
    validatePool('cn', parsedRecruit.pools.cn)
  } catch (err: unknown) {
    issues.push({
      entityType: 'recruit',
      entityId: 'recruit.json',
      referenceType: 'schema',
      referenceId: 'root',
      message: err instanceof Error ? err.message : String(err),
    })
  }

  // 6. Validate Skins dataset
  console.log('6. Validating skins dataset & operator references...')
  let totalSkinsChecked = 0
  try {
    const skinsRaw = await fs.readFile(path.join(DATA_DIR, 'skins.json'), 'utf-8')
    const skins = SkinListSchema.parse(JSON.parse(skinsRaw))
    totalSkinsChecked = skins.length

    for (const skin of skins) {
      if (!indexedIds.has(skin.charId)) {
        issues.push({
          entityType: 'skin',
          entityId: skin.skinId,
          referenceType: 'operator',
          referenceId: skin.charId,
          message: `Skin '${skin.skinId}' references unknown operator '${skin.charId}'`,
        })
      }
    }
  } catch (err: unknown) {
    issues.push({
      entityType: 'skin',
      entityId: 'skins.json',
      referenceType: 'schema',
      referenceId: 'root',
      message: err instanceof Error ? err.message : String(err),
    })
  }

  // 7. Validate Ranges Dictionary Schema
  console.log('7. Validating attack ranges dictionary schema...')
  try {
    RangesDictionarySchema.parse(ranges)
  } catch (err: unknown) {
    issues.push({
      entityType: 'range',
      entityId: 'ranges.json',
      referenceType: 'schema',
      referenceId: 'root',
      message: err instanceof Error ? err.message : String(err),
    })
  }

  // 8. Validate Individual Handbook Files Schema, operator references & CJK sanity
  console.log('8. Validating individual handbook files in data/handbook/, operator references & CJK sanity...')
  let totalHandbooksChecked = 0
  try {
    // Ensure legacy monolithic data/handbook.json does not exist
    try {
      await fs.access(LEGACY_HANDBOOK_FILE)
      issues.push({
        entityType: 'handbook',
        entityId: 'handbook.json',
        referenceType: 'schema',
        referenceId: 'root',
        message: 'Legacy monolithic data/handbook.json still exists; must be split into data/handbook/<charId>.json',
      })
    } catch {
      // Expected: file should not exist
    }

    const handbookFiles = (await fs.readdir(HANDBOOK_DIR)).filter(f => f.endsWith('.json'))
    totalHandbooksChecked = handbookFiles.length

    const opFilesSet = new Set(opFiles.map(f => f.replace('.json', '')))
    const handbookOperatorIds = new Set<string>()
    const cjkRegex = /[\u4e00-\u9fa5]/

    for (const file of handbookFiles) {
      const charId = file.replace('.json', '')
      handbookOperatorIds.add(charId)

      if (!opFilesSet.has(charId)) {
        issues.push({
          entityType: 'handbook',
          entityId: file,
          referenceType: 'operator',
          referenceId: charId,
          message: `Handbook file '${file}' references unknown operator ID not found in data/operators/`,
        })
      }

      const raw = await fs.readFile(path.join(HANDBOOK_DIR, file), 'utf-8')
      let opHandbook: OperatorHandbook
      try {
        const parsed = JSON.parse(raw) as unknown
        opHandbook = OperatorHandbookSchema.parse(parsed)
      } catch (err: unknown) {
        issues.push({
          entityType: 'handbook',
          entityId: file,
          referenceType: 'schema',
          referenceId: charId,
          message: `Schema error in ${file}: ${err instanceof Error ? err.message : String(err)}`,
        })
        continue
      }

      if (opHandbook.charId !== charId) {
        issues.push({
          entityType: 'handbook',
          entityId: file,
          referenceType: 'operator',
          referenceId: opHandbook.charId,
          message: `File name '${file}' does not match internal charId '${opHandbook.charId}'`,
        })
      }

      for (const field of opHandbook.profile.allFields) {
        if (cjkRegex.test(field.title.en)) {
          issues.push({
            entityType: 'handbook',
            entityId: file,
            referenceType: 'schema',
            referenceId: `profile.${field.key}.title.en`,
            message: `English profile title contains untranslated Chinese characters: "${field.title.en}"`,
          })
        }
        if (cjkRegex.test(field.value.en)) {
          issues.push({
            entityType: 'handbook',
            entityId: file,
            referenceType: 'schema',
            referenceId: `profile.${field.key}.value.en`,
            message: `English profile value contains untranslated Chinese characters: "${field.value.en}"`,
          })
        }
      }

      for (const field of opHandbook.physicalExam.allFields) {
        if (cjkRegex.test(field.title.en)) {
          issues.push({
            entityType: 'handbook',
            entityId: file,
            referenceType: 'schema',
            referenceId: `physicalExam.${field.key}.title.en`,
            message: `English physical exam title contains untranslated Chinese characters: "${field.title.en}"`,
          })
        }
        if (cjkRegex.test(field.value.en)) {
          issues.push({
            entityType: 'handbook',
            entityId: file,
            referenceType: 'schema',
            referenceId: `physicalExam.${field.key}.value.en`,
            message: `English physical exam value contains untranslated Chinese characters: "${field.value.en}"`,
          })
        }
      }

      for (let i = 0; i < opHandbook.stories.length; i++) {
        const story = opHandbook.stories[i]
        if (story && cjkRegex.test(story.storyTitle.en)) {
          issues.push({
            entityType: 'handbook',
            entityId: file,
            referenceType: 'schema',
            referenceId: `stories[${i}].storyTitle.en`,
            message: `English story title contains untranslated Chinese characters: "${story.storyTitle.en}"`,
          })
        }
        if (story && cjkRegex.test(story.text.en)) {
          issues.push({
            entityType: 'handbook',
            entityId: file,
            referenceType: 'schema',
            referenceId: `stories[${i}].text.en`,
            message: `English story text contains untranslated Chinese characters`,
          })
        }
      }
    }

    // Check that all operator files except alternative forms (Amiya Guard & Medic) have a handbook
    const EXPECTED_ABSENT_HANDBOOK = new Set(['char_1001_amiya2', 'char_1037_amiya3'])
    for (const opId of opFilesSet) {
      if (!handbookOperatorIds.has(opId) && !EXPECTED_ABSENT_HANDBOOK.has(opId)) {
        issues.push({
          entityType: 'handbook',
          entityId: `${opId}.json`,
          referenceType: 'operator',
          referenceId: opId,
          message: `Missing handbook file for operator '${opId}'`,
        })
      }
    }
  } catch (err: unknown) {
    issues.push({
      entityType: 'handbook',
      entityId: 'data/handbook',
      referenceType: 'schema',
      referenceId: 'root',
      message: err instanceof Error ? err.message : String(err),
    })
  }

  // 9. Validate Banners dataset
  console.log('9. Validating banners dataset in data/banners.json...')
  let totalBannersChecked = 0
  try {
    const bannersRaw = await fs.readFile(BANNERS_FILE, 'utf-8')
    let bannersData: BannersDataset
    try {
      const parsed = JSON.parse(bannersRaw) as unknown
      bannersData = BannersDatasetSchema.parse(parsed)
    } catch (err: unknown) {
      issues.push({
        entityType: 'banner',
        entityId: 'banners.json',
        referenceType: 'schema',
        referenceId: 'root',
        message: `Schema error in banners.json: ${err instanceof Error ? err.message : String(err)}`,
      })
      throw err
    }

    totalBannersChecked = bannersData.banners.length

    // ID uniqueness in banners array
    const seenBannerIds = new Set<string>()
    for (const banner of bannersData.banners) {
      if (seenBannerIds.has(banner.id)) {
        issues.push({
          entityType: 'banner',
          entityId: banner.id,
          referenceType: 'banner',
          referenceId: banner.id,
          message: `Duplicate banner ID '${banner.id}' in banners array`,
        })
      }
      seenBannerIds.add(banner.id)

      // Interval sanity: openTime < endTime
      if (banner.openTime >= banner.endTime) {
        issues.push({
          entityType: 'banner',
          entityId: banner.id,
          referenceType: 'banner',
          referenceId: banner.id,
          message: `Banner '${banner.id}' has invalid interval: openTime (${banner.openTime}) >= endTime (${banner.endTime})`,
        })
      }

      // No perpetual pools: duration > 180 days or rule BACKFLOW
      const durationDays = (banner.endTime - banner.openTime) / 86400
      if (durationDays > 180 || banner.ruleType === 'BACKFLOW') {
        issues.push({
          entityType: 'banner',
          entityId: banner.id,
          referenceType: 'banner',
          referenceId: banner.id,
          message: `Perpetual / returning pool '${banner.id}' was not filtered (duration: ${durationDays} days, rule: ${banner.ruleType})`,
        })
      }

      // No starter pools
      const lowerId = banner.id.toLowerCase()
      if (lowerId.startsWith('boot_') || lowerId.includes('newbee')) {
        issues.push({
          entityType: 'banner',
          entityId: banner.id,
          referenceType: 'banner',
          referenceId: banner.id,
          message: `Starter pool '${banner.id}' was not filtered`,
        })
      }
    }

    // Chronological sorting of cnBanners
    for (let i = 0; i < bannersData.cnBanners.length - 1; i++) {
      const curr = bannersData.cnBanners[i]
      const next = bannersData.cnBanners[i + 1]
      if (curr && next && curr.openTime > next.openTime) {
        issues.push({
          entityType: 'banner',
          entityId: curr.id,
          referenceType: 'banner',
          referenceId: next.id,
          message: `cnBanners is not chronologically sorted: '${curr.id}' (${curr.openTime}) > '${next.id}' (${next.openTime})`,
        })
      }
    }

    // Chronological sorting of enBanners
    for (let i = 0; i < bannersData.enBanners.length - 1; i++) {
      const curr = bannersData.enBanners[i]
      const next = bannersData.enBanners[i + 1]
      if (curr && next && curr.openTime > next.openTime) {
        issues.push({
          entityType: 'banner',
          entityId: curr.id,
          referenceType: 'banner',
          referenceId: next.id,
          message: `enBanners is not chronologically sorted: '${curr.id}' (${curr.openTime}) > '${next.id}' (${next.openTime})`,
        })
      }
    }

    // Meta integrity
    if (bannersData.meta.currentEnBanner) {
      if (!seenBannerIds.has(bannersData.meta.currentEnBanner.id)) {
        issues.push({
          entityType: 'banner',
          entityId: 'meta.currentEnBanner',
          referenceType: 'banner',
          referenceId: bannersData.meta.currentEnBanner.id,
          message: `meta.currentEnBanner ID '${bannersData.meta.currentEnBanner.id}' does not exist in banners dataset`,
        })
      }
    }
    if (bannersData.meta.nextEnLimitedBanner) {
      if (!seenBannerIds.has(bannersData.meta.nextEnLimitedBanner.id)) {
        issues.push({
          entityType: 'banner',
          entityId: 'meta.nextEnLimitedBanner',
          referenceType: 'banner',
          referenceId: bannersData.meta.nextEnLimitedBanner.id,
          message: `meta.nextEnLimitedBanner ID '${bannersData.meta.nextEnLimitedBanner.id}' does not exist in banners dataset`,
        })
      }
    }
  } catch (err: unknown) {
    if (issues.length === 0 || !issues.some(i => i.entityType === 'banner')) {
      issues.push({
        entityType: 'banner',
        entityId: 'banners.json',
        referenceType: 'schema',
        referenceId: 'root',
        message: err instanceof Error ? err.message : String(err),
      })
    }
  }

  return {
    totalOperatorsChecked: opFiles.length,
    totalRecipesChecked: recipes.length,
    totalItemsChecked: items.length,
    totalSkinsChecked,
    totalRangesChecked: Object.keys(ranges).length,
    totalHandbooksChecked,
    totalBannersChecked,
    totalItemReferences,
    totalSkillReferences,
    totalModuleReferences,
    totalRangeReferences,
    totalRecruitPoolChecked,
    globalReferencingCnOnlyCount,
    issues,
  }
}

async function main(): Promise<void> {
  const result = await validateDataIntegrity()

  console.log('\n=== Integrity Validation Report ===')
  console.log(`Operators checked:         ${result.totalOperatorsChecked}`)
  console.log(`Recipes checked:           ${result.totalRecipesChecked}`)
  console.log(`Items in dictionary:       ${result.totalItemsChecked}`)
  console.log(`Skins in dictionary:       ${result.totalSkinsChecked}`)
  console.log(`Ranges in dictionary:      ${result.totalRangesChecked}`)
  console.log(`Handbooks in dictionary:   ${result.totalHandbooksChecked}`)
  console.log(`Banners checked:           ${result.totalBannersChecked}`)
  console.log(`Recruit pool checked:      ${result.totalRecruitPoolChecked}`)
  console.log(`Total item references:     ${result.totalItemReferences}`)
  console.log(`Total skill references:    ${result.totalSkillReferences}`)
  console.log(`Total module references:   ${result.totalModuleReferences}`)
  console.log(`Total range references:    ${result.totalRangeReferences}`)
  console.log(`Global -> CN-only items:   ${result.globalReferencingCnOnlyCount} (permitted under explicit note)`)
  console.log(`Integrity issues found:    ${result.issues.length}`)

  if (result.issues.length > 0) {
    console.error('\n[FAIL] Validation issues detected:')
    for (const issue of result.issues) {
      console.error(
        `  - [${issue.entityType.toUpperCase()}] ${issue.entityId} -> ${issue.referenceType} '${issue.referenceId}': ${issue.message}`,
      )
    }
    process.exit(1)
  }

  console.log('\n[PASS] All item, skill, module, range, and handbook references are 100% valid!')
}

if (process.argv[1]?.includes('validate-data')) {
  main().catch((err: unknown) => {
    console.error('Fatal validation error:', err)
    process.exit(1)
  })
}
