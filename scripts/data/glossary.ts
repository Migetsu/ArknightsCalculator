import { promises as fs } from 'node:fs'
import path from 'node:path'
import { DATA_SOURCES_CONFIG } from './sources.config'
import type { RawTableMap } from './schemas'

export interface TermEntry {
  en: string
  category: string
  id: string
}

export interface ConflictDetail {
  zh: string
  selected: string
  options: {
    en: string
    count: number
    categories: string[]
    examples: string[]
  }[]
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
    conflictsCount: number
    generatedAt: string
  }
}

interface RawPairCollector {
  [zh: string]: Map<string, { count: number; categories: Set<string>; examples: Set<string> }>
}

const RAW_CACHE_DIR = path.resolve(process.cwd(), DATA_SOURCES_CONFIG.cacheDir)
const DATA_I18N_DIR = path.resolve(process.cwd(), 'data/i18n')

async function readJsonFile<T>(filePath: string): Promise<T> {
  const content = await fs.readFile(filePath, 'utf-8')
  return JSON.parse(content) as T
}

export async function buildGlossary(): Promise<{
  glossary: GlossaryData
  conflicts: ConflictDetail[]
}> {
  const cnDir = path.join(RAW_CACHE_DIR, 'zh_CN')
  const enDir = path.join(RAW_CACHE_DIR, 'en_US')

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

  const collector: RawPairCollector = {}
  const categoryTerms: Record<string, Record<string, string>> = {
    operators: {},
    classes: {},
    subclasses: {},
    factions: {},
    items: {},
    skills: {},
    talents: {},
    terms: {},
  }

  function addPair(zhRaw: string | undefined | null, enRaw: string | undefined | null, category: string, id: string) {
    const zh = (zhRaw ?? '').trim()
    const en = (enRaw ?? '').trim()
    if (!zh || !en) return

    if (!collector[zh]) {
      collector[zh] = new Map()
    }
    const map = collector[zh]!
    let entry = map.get(en)
    if (!entry) {
      entry = { count: 0, categories: new Set(), examples: new Set() }
      map.set(en, entry)
    }
    entry.count++
    entry.categories.add(category)
    if (entry.examples.size < 5) {
      entry.examples.add(id)
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
    addPair(pair.zh, pair.en, 'classes', code)
    categoryTerms.classes[pair.zh] = pair.en
  }

  // 2. Subclasses (from uniequip_table subProfDict)
  const cnSubProf = (cnEquips as unknown as { subProfDict?: Record<string, { subProfessionName?: string }> }).subProfDict
  const enSubProf = (enEquips as unknown as { subProfDict?: Record<string, { subProfessionName?: string }> }).subProfDict
  if (cnSubProf && enSubProf) {
    for (const [subId, cnSub] of Object.entries(cnSubProf)) {
      const enSub = enSubProf[subId]
      if (cnSub?.subProfessionName && enSub?.subProfessionName) {
        addPair(cnSub.subProfessionName, enSub.subProfessionName, 'subclasses', subId)
        categoryTerms.subclasses[cnSub.subProfessionName] = enSub.subProfessionName
      }
    }
  }

  // 3. Operators (from character_table)
  for (const [charId, cnChar] of Object.entries(cnChars)) {
    if (!charId.startsWith('char_')) continue
    const enChar = enChars[charId]
    if (cnChar.name && enChar?.name) {
      addPair(cnChar.name, enChar.name, 'operators', charId)
      categoryTerms.operators[cnChar.name] = enChar.name
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
          addPair(cnCand.name, enCand.name, 'talents', `${charId}_talent_${t}_${c}`)
          categoryTerms.talents[cnCand.name] = enCand.name
        }
      }
    }
  }

  // 4. Skills (from skill_table)
  for (const [skillId, cnSkill] of Object.entries(cnSkills)) {
    const enSkill = enSkills[skillId]
    const cnLevels = cnSkill?.levels ?? []
    const enLevels = enSkill?.levels ?? []
    for (let l = 0; l < cnLevels.length; l++) {
      const cnLvl = cnLevels[l]
      const enLvl = enLevels[l]
      if (cnLvl?.name && enLvl?.name) {
        addPair(cnLvl.name, enLvl.name, 'skills', `${skillId}_lvl_${l}`)
        categoryTerms.skills[cnLvl.name] = enLvl.name
      }
    }
  }

  // 5. Items (from item_table)
  const cnItemList = cnItems?.items ?? {}
  const enItemList = enItems?.items ?? {}
  for (const [itemId, cnItem] of Object.entries(cnItemList)) {
    const enItem = enItemList[itemId]
    if (cnItem?.name && enItem?.name) {
      addPair(cnItem.name, enItem.name, 'items', itemId)
      categoryTerms.items[cnItem.name] = enItem.name
    }
  }

  // 6. Factions (from handbook_info_table)
  const cnHandbookFull = cnHandbook as unknown as { teamList?: Record<string, { powerName?: string }> }
  const enHandbookFull = enHandbook as unknown as { teamList?: Record<string, { powerName?: string }> }
  if (cnHandbookFull?.teamList && enHandbookFull?.teamList) {
    for (const [teamId, cnTeam] of Object.entries(cnHandbookFull.teamList)) {
      const enTeam = enHandbookFull.teamList[teamId]
      if (cnTeam?.powerName && enTeam?.powerName) {
        addPair(cnTeam.powerName, enTeam.powerName, 'factions', teamId)
        categoryTerms.factions[cnTeam.powerName] = enTeam.powerName
      }
    }
  }

  // 7. Game terms (from gamedata_const termDescriptionDict)
  const cnConstFull = cnConst as unknown as { termDescriptionDict?: Record<string, { termName?: string }> }
  const enConstFull = enConst as unknown as { termDescriptionDict?: Record<string, { termName?: string }> }
  if (cnConstFull?.termDescriptionDict && enConstFull?.termDescriptionDict) {
    for (const [termId, cnTerm] of Object.entries(cnConstFull.termDescriptionDict)) {
      const enTerm = enConstFull.termDescriptionDict[termId]
      if (cnTerm?.termName && enTerm?.termName) {
        addPair(cnTerm.termName, enTerm.termName, 'terms', termId)
        categoryTerms.terms[cnTerm.termName] = enTerm.termName
      }
    }
  }

  // Resolve conflicts and build final dictionary
  const conflicts: ConflictDetail[] = []
  const resolvedAll: Record<string, string> = {}

  for (const [zh, transMap] of Object.entries(collector)) {
    const options = Array.from(transMap.entries()).map(([en, meta]) => ({
      en,
      count: meta.count,
      categories: Array.from(meta.categories),
      examples: Array.from(meta.examples),
    }))

    // Sort by count descending, then by priority of category, then alphabetically
    options.sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count
      return a.en.localeCompare(b.en)
    })

    const best = options[0]!
    resolvedAll[zh] = best.en

    if (options.length > 1) {
      conflicts.push({
        zh,
        selected: best.en,
        options,
      })
    }
  }

  // Update categories with resolved best translations
  for (const cat of Object.keys(categoryTerms)) {
    for (const [zh] of Object.entries(categoryTerms[cat]!)) {
      if (resolvedAll[zh]) {
        categoryTerms[cat]![zh] = resolvedAll[zh]!
      }
    }
  }

  const glossary: GlossaryData = {
    operators: categoryTerms.operators!,
    classes: categoryTerms.classes!,
    subclasses: categoryTerms.subclasses!,
    factions: categoryTerms.factions!,
    items: categoryTerms.items!,
    skills: categoryTerms.skills!,
    talents: categoryTerms.talents!,
    terms: categoryTerms.terms!,
    meta: {
      totalUniqueZh: Object.keys(collector).length,
      conflictsCount: conflicts.length,
      generatedAt: new Date().toISOString(),
    },
  }

  return { glossary, conflicts }
}

async function main() {
  console.log('Building Arknights official term glossary...')
  const { glossary, conflicts } = await buildGlossary()

  await fs.mkdir(DATA_I18N_DIR, { recursive: true })
  const glossaryPath = path.join(DATA_I18N_DIR, 'glossary.json')
  const conflictsPath = path.join(DATA_I18N_DIR, 'glossary-conflicts.json')

  await fs.writeFile(glossaryPath, JSON.stringify(glossary, null, 2), 'utf-8')
  await fs.writeFile(conflictsPath, JSON.stringify(conflicts, null, 2), 'utf-8')

  console.log(`[PASS] Glossary saved to ${glossaryPath}`)
  console.log(`Total unique Chinese terms: ${glossary.meta.totalUniqueZh}`)
  console.log(`Operators: ${Object.keys(glossary.operators).length}`)
  console.log(`Classes: ${Object.keys(glossary.classes).length}`)
  console.log(`Subclasses: ${Object.keys(glossary.subclasses).length}`)
  console.log(`Items: ${Object.keys(glossary.items).length}`)
  console.log(`Skills: ${Object.keys(glossary.skills).length}`)
  console.log(`Talents: ${Object.keys(glossary.talents).length}`)
  console.log(`Game terms (termDescriptionDict): ${Object.keys(glossary.terms).length}`)
  console.log(`Conflicts detected: ${conflicts.length} (saved to ${conflictsPath})`)
}

if (process.argv[1] && path.resolve(process.argv[1]).includes('glossary')) {
  main().catch((err) => {
    console.error('Failed to build glossary:', err)
    process.exit(1)
  })
}
