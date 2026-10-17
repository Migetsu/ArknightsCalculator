import { promises as fs } from 'node:fs'
import path from 'node:path'
import { DATA_SOURCES_CONFIG } from './sources.config'
import type { RawTableMap } from './schemas'

export type GlossaryCategory =
  | 'operators'
  | 'classes'
  | 'subclasses'
  | 'factions'
  | 'items'
  | 'skills'
  | 'talents'
  | 'terms'

export interface IntraCategoryConflict {
  category: GlossaryCategory
  zh: string
  selected: string
  options: {
    en: string
    count: number
    examples: string[]
  }[]
}

export interface CrossCategoryDifferentiation {
  zh: string
  translations: Record<string, string>
}

export interface GlossaryData {
  operators: Record<string, string>
  classes: Record<string, string>
  subclasses: Record<string, string>
  factions: Record<string, string>
  items: Record<string, string>
  skills: Record<string, string>
  talents: Record<string, string>
  terms: Record<string, string>
  meta: {
    totalUniqueZh: number
    intraCategoryConflictsCount: number
    crossCategoryDifferentiationsCount: number
    generatedAt: string
  }
}

const RAW_CACHE_DIR = path.resolve(process.cwd(), DATA_SOURCES_CONFIG.cacheDir)
const DATA_I18N_DIR = path.resolve(process.cwd(), 'data/i18n')

async function readJsonFile<T>(filePath: string): Promise<T> {
  const content = await fs.readFile(filePath, 'utf-8')
  return JSON.parse(content) as T
}

export async function buildGlossary(): Promise<{
  glossary: GlossaryData
  conflicts: IntraCategoryConflict[]
  crossCategoryDiffs: CrossCategoryDifferentiation[]
}> {
  const cnDir = path.join(RAW_CACHE_DIR, DATA_SOURCES_CONFIG.sources.cn.locale)
  const enDir = path.join(RAW_CACHE_DIR, DATA_SOURCES_CONFIG.sources.en.locale)

  const [
    cnChars,
    enChars,
    cnItems,
    enItems,
    cnSkills,
    enSkills,
    cnEquips,
    enEquips,
    cnHandbook,
    enHandbook,
    cnConst,
    enConst,
  ] = await Promise.all([
    readJsonFile<RawTableMap['character_table.json']>(path.join(cnDir, 'character_table.json')),
    readJsonFile<RawTableMap['character_table.json']>(path.join(enDir, 'character_table.json')),
    readJsonFile<RawTableMap['item_table.json']>(path.join(cnDir, 'item_table.json')),
    readJsonFile<RawTableMap['item_table.json']>(path.join(enDir, 'item_table.json')),
    readJsonFile<RawTableMap['skill_table.json']>(path.join(cnDir, 'skill_table.json')),
    readJsonFile<RawTableMap['skill_table.json']>(path.join(enDir, 'skill_table.json')),
    readJsonFile<RawTableMap['uniequip_table.json']>(path.join(cnDir, 'uniequip_table.json')),
    readJsonFile<RawTableMap['uniequip_table.json']>(path.join(enDir, 'uniequip_table.json')),
    readJsonFile<RawTableMap['handbook_info_table.json']>(path.join(cnDir, 'handbook_info_table.json')),
    readJsonFile<RawTableMap['handbook_info_table.json']>(path.join(enDir, 'handbook_info_table.json')),
    readJsonFile<RawTableMap['gamedata_const.json']>(path.join(cnDir, 'gamedata_const.json')),
    readJsonFile<RawTableMap['gamedata_const.json']>(path.join(enDir, 'gamedata_const.json')),
  ])

  // Category-specific collectors: category -> zh -> en -> { count, examples }
  const categoryCollectors: Record<
    GlossaryCategory,
    Map<string, Map<string, { count: number; examples: Set<string> }>>
  > = {
    operators: new Map(),
    classes: new Map(),
    subclasses: new Map(),
    factions: new Map(),
    items: new Map(),
    skills: new Map(),
    talents: new Map(),
    terms: new Map(),
  }

  function addPair(
    category: GlossaryCategory,
    zhRaw: string | undefined | null,
    enRaw: string | undefined | null,
    id: string,
  ) {
    const zh = (zhRaw ?? '').trim()
    const en = (enRaw ?? '').trim()
    if (!zh || !en) return

    const catMap = categoryCollectors[category]
    let zhEntry = catMap.get(zh)
    if (!zhEntry) {
      zhEntry = new Map()
      catMap.set(zh, zhEntry)
    }

    let enEntry = zhEntry.get(en)
    if (!enEntry) {
      enEntry = { count: 0, examples: new Set() }
      zhEntry.set(en, enEntry)
    }

    enEntry.count++
    if (enEntry.examples.size < 5) {
      enEntry.examples.add(id)
    }
  }

  // 1. Classes / Professions
  const CLASS_MAP: Record<string, { zh: string; en: string }> = {
    PIONEER: { zh: '先锋', en: 'Vanguard' },
    WARRIOR: { zh: '近卫', en: 'Guard' },
    SNIPER: { zh: '狙击', en: 'Sniper' },
    TANK: { zh: '重装', en: 'Defender' },
    MEDIC: { zh: '医疗', en: 'Medic' },
    SUPPORT: { zh: '辅助', en: 'Supporter' },
    CASTER: { zh: '术师', en: 'Caster' },
    SPECIAL: { zh: '特种', en: 'Specialist' },
    SPECIALIST: { zh: '特种', en: 'Specialist' },
  }
  for (const [code, pair] of Object.entries(CLASS_MAP)) {
    addPair('classes', pair.zh, pair.en, code)
  }

  // 2. Subclasses (uniequip_table subProfDict)
  const cnSubProf = (cnEquips as unknown as { subProfDict?: Record<string, { subProfessionName?: string }> }).subProfDict
  const enSubProf = (enEquips as unknown as { subProfDict?: Record<string, { subProfessionName?: string }> }).subProfDict
  if (cnSubProf && enSubProf) {
    for (const [subId, cnSub] of Object.entries(cnSubProf)) {
      const enSub = enSubProf[subId]
      if (cnSub?.subProfessionName && enSub?.subProfessionName) {
        addPair('subclasses', cnSub.subProfessionName, enSub.subProfessionName, subId)
      }
    }
  }

  // 3. Operators & Talents (character_table)
  for (const [charId, cnChar] of Object.entries(cnChars)) {
    if (!charId.startsWith('char_')) continue
    const enChar = enChars[charId]
    if (cnChar.name && enChar?.name) {
      addPair('operators', cnChar.name, enChar.name, charId)
    }

    // Talents
    const cnCharFull = cnChar as unknown as { talents?: { candidates?: { name?: string }[] }[] }
    const enCharFull = enChar as unknown as { talents?: { candidates?: { name?: string }[] }[] } | undefined
    const cnTalents = cnCharFull.talents ?? []
    const enTalents = enCharFull?.talents ?? []
    for (let t = 0; t < cnTalents.length; t++) {
      const cnCands = cnTalents[t]?.candidates ?? []
      const enCands = enTalents[t]?.candidates ?? []
      for (let c = 0; c < cnCands.length; c++) {
        const cnCand = cnCands[c]
        const enCand = enCands[c]
        if (cnCand?.name && enCand?.name) {
          addPair('talents', cnCand.name, enCand.name, `${charId}_talent_${t}_${c}`)
        }
      }
    }
  }

  // 4. Skills (skill_table)
  for (const [skillId, cnSkill] of Object.entries(cnSkills)) {
    const enSkill = enSkills[skillId]
    const cnLevels = cnSkill?.levels ?? []
    const enLevels = enSkill?.levels ?? []
    for (let l = 0; l < cnLevels.length; l++) {
      const cnLvl = cnLevels[l]
      const enLvl = enLevels[l]
      if (cnLvl?.name && enLvl?.name) {
        addPair('skills', cnLvl.name, enLvl.name, `${skillId}_lvl_${l}`)
      }
    }
  }

  // 5. Items (item_table)
  const cnItemList = cnItems?.items ?? {}
  const enItemList = enItems?.items ?? {}
  for (const [itemId, cnItem] of Object.entries(cnItemList)) {
    const enItem = enItemList[itemId]
    if (cnItem?.name && enItem?.name) {
      addPair('items', cnItem.name, enItem.name, itemId)
    }
  }

  // 6. Factions (handbook_info_table)
  const cnHandbookFull = cnHandbook as unknown as { teamList?: Record<string, { powerName?: string }> }
  const enHandbookFull = enHandbook as unknown as { teamList?: Record<string, { powerName?: string }> }
  if (cnHandbookFull?.teamList && enHandbookFull?.teamList) {
    for (const [teamId, cnTeam] of Object.entries(cnHandbookFull.teamList)) {
      const enTeam = enHandbookFull.teamList[teamId]
      if (cnTeam?.powerName && enTeam?.powerName) {
        addPair('factions', cnTeam.powerName, enTeam.powerName, teamId)
      }
    }
  }

  // 7. Terms (gamedata_const termDescriptionDict)
  const cnConstFull = cnConst as unknown as { termDescriptionDict?: Record<string, { termName?: string }> }
  const enConstFull = enConst as unknown as { termDescriptionDict?: Record<string, { termName?: string }> }
  if (cnConstFull?.termDescriptionDict && enConstFull?.termDescriptionDict) {
    for (const [termId, cnTerm] of Object.entries(cnConstFull.termDescriptionDict)) {
      const enTerm = enConstFull.termDescriptionDict[termId]
      if (cnTerm?.termName && enTerm?.termName) {
        addPair('terms', cnTerm.termName, enTerm.termName, termId)
      }
    }
  }

  // Build categorized glossary dictionaries and detect intra-category conflicts
  const conflicts: IntraCategoryConflict[] = []
  const resolvedCategories: Record<GlossaryCategory, Record<string, string>> = {
    operators: {},
    classes: {},
    subclasses: {},
    factions: {},
    items: {},
    skills: {},
    talents: {},
    terms: {},
  }

  const allZhSet = new Set<string>()

  for (const catKey of Object.keys(categoryCollectors) as GlossaryCategory[]) {
    const catMap = categoryCollectors[catKey]
    for (const [zh, enMap] of catMap.entries()) {
      allZhSet.add(zh)
      const options = Array.from(enMap.entries()).map(([en, meta]) => ({
        en,
        count: meta.count,
        examples: Array.from(meta.examples),
      }))

      // Sort by occurrence count descending, then alphabetically
      options.sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count
        return a.en.localeCompare(b.en)
      })

      const best = options[0]!
      resolvedCategories[catKey][zh] = best.en

      // Intra-category conflict detection
      if (options.length > 1) {
        conflicts.push({
          category: catKey,
          zh,
          selected: best.en,
          options,
        })
      }
    }
  }

  // Cross-category differentiations (e.g., 鞭刃 as Whislash vs Whip Sword)
  const crossCategoryDiffs: CrossCategoryDifferentiation[] = []
  for (const zh of allZhSet) {
    const distinctPerCategory: Record<string, string> = {}
    for (const catKey of Object.keys(resolvedCategories) as GlossaryCategory[]) {
      if (resolvedCategories[catKey][zh]) {
        distinctPerCategory[catKey] = resolvedCategories[catKey][zh]!
      }
    }
    const uniqueValues = new Set(Object.values(distinctPerCategory))
    if (uniqueValues.size > 1) {
      crossCategoryDiffs.push({
        zh,
        translations: distinctPerCategory,
      })
    }
  }

  const glossary: GlossaryData = {
    operators: resolvedCategories.operators,
    classes: resolvedCategories.classes,
    subclasses: resolvedCategories.subclasses,
    factions: resolvedCategories.factions,
    items: resolvedCategories.items,
    skills: resolvedCategories.skills,
    talents: resolvedCategories.talents,
    terms: resolvedCategories.terms,
    meta: {
      totalUniqueZh: allZhSet.size,
      intraCategoryConflictsCount: conflicts.length,
      crossCategoryDifferentiationsCount: crossCategoryDiffs.length,
      generatedAt: new Date().toISOString(),
    },
  }

  return { glossary, conflicts, crossCategoryDiffs }
}

async function main() {
  console.log('Building categorized Arknights official term glossary...')
  const { glossary, conflicts, crossCategoryDiffs } = await buildGlossary()

  await fs.mkdir(DATA_I18N_DIR, { recursive: true })
  const glossaryPath = path.join(DATA_I18N_DIR, 'glossary.json')
  const conflictsPath = path.join(DATA_I18N_DIR, 'glossary-conflicts.json')
  const diffsPath = path.join(DATA_I18N_DIR, 'glossary-cross-category.json')

  await fs.writeFile(glossaryPath, JSON.stringify(glossary, null, 2), 'utf-8')
  await fs.writeFile(conflictsPath, JSON.stringify(conflicts, null, 2), 'utf-8')
  await fs.writeFile(diffsPath, JSON.stringify(crossCategoryDiffs, null, 2), 'utf-8')

  console.log(`[PASS] Categorized glossary saved to ${glossaryPath}`)
  console.log(`Total unique Chinese terms across categories: ${glossary.meta.totalUniqueZh}`)
  console.log(`Operators: ${Object.keys(glossary.operators).length}`)
  console.log(`Classes: ${Object.keys(glossary.classes).length}`)
  console.log(`Subclasses: ${Object.keys(glossary.subclasses).length}`)
  console.log(`Items: ${Object.keys(glossary.items).length}`)
  console.log(`Skills: ${Object.keys(glossary.skills).length}`)
  console.log(`Talents: ${Object.keys(glossary.talents).length}`)
  console.log(`Game terms: ${Object.keys(glossary.terms).length}`)
  console.log(`Intra-category conflicts detected: ${conflicts.length} (saved to ${conflictsPath})`)
  console.log(`Cross-category differentiations (e.g. 鞭刃): ${crossCategoryDiffs.length} (saved to ${diffsPath})`)
}

if (process.argv[1] && path.resolve(process.argv[1]).includes('glossary')) {
  main().catch((err) => {
    console.error('Failed to build glossary:', err)
    process.exit(1)
  })
}
