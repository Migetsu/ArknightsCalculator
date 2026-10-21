import { promises as fs } from 'node:fs'
import path from 'node:path'
import {
  validateTranslation,
  extractOpenTags,
  extractPlaceholders,
  type ValidationResult,
} from './validate-translation'
import type { GlossaryData, GlossaryCategory } from './glossary'

export type UntranslatedType =
  | 'operator_name'
  | 'skill_name'
  | 'talent_name'
  | 'module_name'
  | 'skill_desc'
  | 'talent_desc'
  | 'module_desc'
  | 'module_stage_desc'
  | 'potential_desc'
  | 'profile_text'
  | 'term_name'
  | 'term_desc'
  | 'operator_tag'
  | 'skin_name'
  | 'skin_brand'
  | 'skin_desc'
  | 'skin_dialog'
  | 'skin_obtain'
  | 'banner_name'

export interface RawSkinItem {
  skinId: string
  charId: string
  skinName?: I18nField | null
  brandName?: I18nField | null
  description?: I18nField | null
  dialog?: I18nField | null
  obtainApproach?: I18nField | null
}

export interface RawBannerItem {
  id: string
  name: string | I18nField
  server?: string
}

export interface CollectSkinsOptions {
  glossary?: GlossaryData | null
  charNames?: Record<string, string>
}

export interface CollectBannersOptions {
  glossary?: GlossaryData | null
}

export function isUntranslated(
  field?: { en?: string; zh?: string; source?: string } | null,
): boolean {
  if (!field) return false
  if (field.source === 'zh' || field.source === 'pending') return true
  if (!field.en || field.en === field.zh || field.en === '[Pending Translation]') return true
  return false
}


/**
 * Matches a CJK ideograph (Han character), not fullwidth punctuation.
 *
 * A string with no ideograph needs no translation: an operator codename like
 * `12F`, a module code like `DWDB-221E`, a talent name like `Mon3tr`, or a
 * masked value like `？？？`. For those, `en === zh` is correct rather than a
 * missing translation, and collecting them produced bogus machine-translation
 * entries that were then quarantined as failures.
 */
const CJK_IDEOGRAPH_REGEX = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/

export function hasCjkIdeograph(text: string): boolean {
  return CJK_IDEOGRAPH_REGEX.test(text)
}

export interface UntranslatedItem {
  id: string
  type: UntranslatedType
  charId: string
  charNameZh: string
  zh: string
  tags: string[]
  placeholders: string[]
  keys: string[]
  relevantGlossary: Record<string, string>
}

export interface TranslationBatchItem extends UntranslatedItem {
  en?: string
}

export interface UntranslatedStats {
  totalInstances: number
  uniqueTemplates: number
  totalChars: number
  estimatedTokens: number
  byType: Record<
    UntranslatedType,
    {
      instances: number
      unique: number
      chars: number
      estimatedTokens: number
    }
  >
}

interface I18nField {
  en?: string
  zh?: string
  source?: string
}

interface RawOperatorFile {
  id: string
  name: { en: string; zh: string; source: string }
  itemUsage?: I18nField
  itemDesc?: I18nField
  tagList?: string[]
  potentialRanks?: Array<{ description?: I18nField }>
  skills?: Array<{
    skillId: string
    levels?: Array<{
      name?: { en: string; zh: string; source: string }
      description?: { en: string; zh: string; source: string }
    }>
  }>
  talents?: Array<{
    candidates?: Array<{
      name?: { en: string; zh: string; source: string }
      description?: { en: string; zh: string; source: string }
    }>
  }>
  modules?: Array<{
    uniEquipId?: string
    name?: { en: string; zh: string; source: string }
    description?: { en: string; zh: string; source: string }
    stages?: Array<{
      stage?: number
      parts?: Array<{
        candidates?: Array<{
          additionalDescription?: I18nField
          upgradeDescription?: I18nField
          overrideDescription?: I18nField
        }>
      }>
    }>
  }>
}

/**
 * Loads glossary data for finding relevant contextual terminology.
 */
async function loadGlossary(): Promise<GlossaryData | null> {
  const glossPath = path.resolve(process.cwd(), 'data/i18n/glossary.json')
  try {
    const raw = await fs.readFile(glossPath, 'utf-8')
    return JSON.parse(raw) as GlossaryData
  } catch {
    return null
  }
}

/**
 * Extracts matching glossary terms present in the given Chinese text.
 */
function findRelevantGlossary(
  zh: string,
  category: GlossaryCategory,
  glossary: GlossaryData | null,
): Record<string, string> {
  if (!glossary) return {}
  const result: Record<string, string> = {}

  const catDict = glossary[category] || {}
  const termsDict = glossary.terms || {}
  const combined = { ...termsDict, ...catDict }

  for (const [termZh, termEn] of Object.entries(combined)) {
    if (termZh.length >= 2 && zh.includes(termZh)) {
      result[termZh] = termEn
    }
  }

  return result
}

/**
 * Collects untranslated skin strings from a list of raw skin items.
 * Deduplicates by type and Chinese text, aggregating target keys.
 */
export function collectUntranslatedFromSkins(
  skins: RawSkinItem[],
  options?: CollectSkinsOptions,
): UntranslatedItem[] {
  const glossary = options?.glossary ?? null
  const charNames = options?.charNames ?? {}
  const templateMap = new Map<string, UntranslatedItem>()

  for (const skin of skins) {
    const charId = skin.charId || ''
    const charNameZh = charNames[charId] || ''
    const fields: Array<[keyof RawSkinItem, UntranslatedType, string]> = [
      ['skinName', 'skin_name', 'name'],
      ['brandName', 'skin_brand', 'brandName'],
      ['description', 'skin_desc', 'description'],
      ['dialog', 'skin_dialog', 'dialog'],
      ['obtainApproach', 'skin_obtain', 'obtainApproach'],
    ]

    for (const [fieldKey, type, subKey] of fields) {
      const val = skin[fieldKey] as I18nField | undefined | null
      if (!isUntranslated(val)) continue
      const zh = (val?.zh || '').trim()
      if (!zh || !hasCjkIdeograph(zh)) continue

      const key = `skin.${skin.skinId}.${subKey}`
      const mapKey = `${type}:::${zh}`
      const existing = templateMap.get(mapKey)

      if (existing) {
        if (!existing.keys.includes(key)) {
          existing.keys.push(key)
        }
      } else {
        const item: UntranslatedItem = {
          id: `${type}_${templateMap.size + 1}`,
          type,
          charId,
          charNameZh,
          zh,
          tags: extractOpenTags(zh),
          placeholders: extractPlaceholders(zh),
          keys: [key],
          relevantGlossary: findRelevantGlossary(zh, 'terms', glossary),
        }
        templateMap.set(mapKey, item)
      }
    }
  }

  return Array.from(templateMap.values())
}

/**
 * Collects untranslated banner names from a list of raw banner items.
 * Deduplicates by banner name and Chinese text, aggregating target keys.
 */
export function collectUntranslatedFromBanners(
  banners: RawBannerItem[],
  options?: CollectBannersOptions,
): UntranslatedItem[] {
  const glossary = options?.glossary ?? null
  const templateMap = new Map<string, UntranslatedItem>()

  for (const banner of banners) {
    let zh = ''
    let untranslated = false

    if (typeof banner.name === 'string') {
      zh = banner.name.trim()
      untranslated = true
    } else if (banner.name && typeof banner.name === 'object') {
      zh = (banner.name.zh || '').trim()
      untranslated = isUntranslated(banner.name)
    }

    if (!untranslated || !zh || !hasCjkIdeograph(zh)) continue

    const key = `banner.${banner.id}.name`
    const type: UntranslatedType = 'banner_name'
    const mapKey = `${type}:::${zh}`
    const existing = templateMap.get(mapKey)

    if (existing) {
      if (!existing.keys.includes(key)) {
        existing.keys.push(key)
      }
    } else {
      const item: UntranslatedItem = {
        id: `${type}_${templateMap.size + 1}`,
        type,
        charId: '',
        charNameZh: '',
        zh,
        tags: extractOpenTags(zh),
        placeholders: extractPlaceholders(zh),
        keys: [key],
        relevantGlossary: findRelevantGlossary(zh, 'terms', glossary),
      }
      templateMap.set(mapKey, item)
    }
  }

  return Array.from(templateMap.values())
}

/**
 * Scans all operator JSON files to collect untranslated strings (source: 'zh').
 */
export async function collectUntranslatedItems(): Promise<{
  items: UntranslatedItem[]
  stats: UntranslatedStats
}> {
  const opsDir = path.resolve(process.cwd(), 'data/operators')
  const files = (await fs.readdir(opsDir)).filter((f) => f.endsWith('.json'))
  const glossary = await loadGlossary()

  const templateMap = new Map<
    string,
    {
      item: UntranslatedItem
      instances: number
    }
  >()

  const emptyStatsByType = (): Record<
    UntranslatedType,
    { instances: number; unique: number; chars: number; estimatedTokens: number }
  > => ({
    operator_name: { instances: 0, unique: 0, chars: 0, estimatedTokens: 0 },
    skill_name: { instances: 0, unique: 0, chars: 0, estimatedTokens: 0 },
    talent_name: { instances: 0, unique: 0, chars: 0, estimatedTokens: 0 },
    module_name: { instances: 0, unique: 0, chars: 0, estimatedTokens: 0 },
    skill_desc: { instances: 0, unique: 0, chars: 0, estimatedTokens: 0 },
    talent_desc: { instances: 0, unique: 0, chars: 0, estimatedTokens: 0 },
    module_desc: { instances: 0, unique: 0, chars: 0, estimatedTokens: 0 },
    module_stage_desc: { instances: 0, unique: 0, chars: 0, estimatedTokens: 0 },
    potential_desc: { instances: 0, unique: 0, chars: 0, estimatedTokens: 0 },
    profile_text: { instances: 0, unique: 0, chars: 0, estimatedTokens: 0 },
    term_name: { instances: 0, unique: 0, chars: 0, estimatedTokens: 0 },
    term_desc: { instances: 0, unique: 0, chars: 0, estimatedTokens: 0 },
    operator_tag: { instances: 0, unique: 0, chars: 0, estimatedTokens: 0 },
    skin_name: { instances: 0, unique: 0, chars: 0, estimatedTokens: 0 },
    skin_brand: { instances: 0, unique: 0, chars: 0, estimatedTokens: 0 },
    skin_desc: { instances: 0, unique: 0, chars: 0, estimatedTokens: 0 },
    skin_dialog: { instances: 0, unique: 0, chars: 0, estimatedTokens: 0 },
    skin_obtain: { instances: 0, unique: 0, chars: 0, estimatedTokens: 0 },
    banner_name: { instances: 0, unique: 0, chars: 0, estimatedTokens: 0 },
  })

  const byType = emptyStatsByType()
  let totalInstances = 0

  function registerString(
    type: UntranslatedType,
    charId: string,
    charNameZh: string,
    key: string,
    zhText: string,
    glossaryCat: GlossaryCategory,
  ) {
    const zh = (zhText || '').trim()
    if (!zh) return
    // Nothing to translate: the source has no Han character (e.g. `12F`, `Mon3tr`,
    // `DWDB-221E`, `？？？`). Collecting these produced bogus MT entries that were
    // then quarantined as failures.
    if (!hasCjkIdeograph(zh)) return

    totalInstances++
    byType[type].instances++

    const mapKey = `${type}:::${zh}`
    const existing = templateMap.get(mapKey)

    if (existing) {
      existing.instances++
      if (!existing.item.keys.includes(key)) {
        existing.item.keys.push(key)
      }
    } else {
      const tags = extractOpenTags(zh)
      const placeholders = extractPlaceholders(zh)
      const relevantGlossary = findRelevantGlossary(zh, glossaryCat, glossary)

      const item: UntranslatedItem = {
        id: `${type}_${templateMap.size + 1}`,
        type,
        charId,
        charNameZh,
        zh,
        tags,
        placeholders,
        keys: [key],
        relevantGlossary,
      }

      templateMap.set(mapKey, { item, instances: 1 })
    }
  }

  for (const file of files) {
    const raw = await fs.readFile(path.join(opsDir, file), 'utf-8')
    const op = JSON.parse(raw) as RawOperatorFile
    const charId = op.id
    const charNameZh = op.name?.zh || charId

    if (isUntranslated(op.name)) {
      registerString('operator_name', charId, charNameZh, `${charId}.name`, op.name.zh, 'operators')
    }

    // Skills
    for (const skill of op.skills || []) {
      const skillId = skill.skillId
      const levels = skill.levels || []
      for (let lIdx = 0; lIdx < levels.length; lIdx++) {
        const lvl = levels[lIdx]!
        if (isUntranslated(lvl.name)) {
          registerString(
            'skill_name',
            charId,
            charNameZh,
            `${skillId}.lvl.${lIdx}.name`,
            lvl.name.zh,
            'skills',
          )
        }
        if (isUntranslated(lvl.description)) {
          registerString(
            'skill_desc',
            charId,
            charNameZh,
            `${skillId}.lvl.${lIdx}.desc`,
            lvl.description.zh,
            'skills',
          )
        }
      }
    }

    // Talents
    const talents = op.talents || []
    for (let tIdx = 0; tIdx < talents.length; tIdx++) {
      const candidates = talents[tIdx]?.candidates || []
      for (let cIdx = 0; cIdx < candidates.length; cIdx++) {
        const cand = candidates[cIdx]!
        if (isUntranslated(cand.name)) {
          registerString(
            'talent_name',
            charId,
            charNameZh,
            `${charId}.talent.${tIdx}.${cIdx}.name`,
            cand.name.zh,
            'talents',
          )
        }
        if (isUntranslated(cand.description)) {
          registerString(
            'talent_desc',
            charId,
            charNameZh,
            `${charId}.talent.${tIdx}.${cIdx}.desc`,
            cand.description.zh,
            'talents',
          )
        }
      }
    }

    // Modules
    for (const mod of op.modules || []) {
      const equipId =
        (mod as { id?: string; uniEquipId?: string }).id ||
        (mod as { id?: string; uniEquipId?: string }).uniEquipId
      if (!equipId) continue

      if (isUntranslated(mod.name) && mod.name?.zh) {
        registerString('module_name', charId, charNameZh, `${equipId}.name`, mod.name.zh, 'terms')
      }
      if (isUntranslated(mod.description) && mod.description?.zh) {
        registerString('module_desc', charId, charNameZh, `${equipId}.desc`, mod.description.zh, 'terms')
      }

      // Module stage combat text. The builder keys these by the stage's
      // `equipLevel` (emitted as `stage`) and the candidate index within the
      // part, so the key is reconstructed from the built file.
      for (const stage of mod.stages || []) {
        if (typeof stage.stage !== 'number') continue

        const parts = stage.parts || []
        for (let partIdx = 0; partIdx < parts.length; partIdx++) {
          const candidates = parts[partIdx]?.candidates || []
          for (let cIdx = 0; cIdx < candidates.length; cIdx++) {
            const cand = candidates[cIdx]!

            const variants: Array<[keyof typeof cand, string]> = [
              ['additionalDescription', 'addDesc'],
              ['upgradeDescription', 'upgDesc'],
              ['overrideDescription', 'ovrDesc'],
            ]
            for (const [field, suffix] of variants) {
              const value = cand[field] as I18nField | undefined
              if (isUntranslated(value) && value?.zh) {
                registerString(
                  'module_stage_desc',
                  charId,
                  charNameZh,
                  `${equipId}.stage.${stage.stage}.cand.${cIdx}.${suffix}`,
                  value.zh,
                  'terms',
                )
              }
            }
          }
        }
      }
    }

    // Potential rank descriptions and the operator dossier text. Both live on the
    // operator itself and are keyed directly off its id.
    const potentialRanks = op.potentialRanks || []
    for (let pIdx = 0; pIdx < potentialRanks.length; pIdx++) {
      const description = potentialRanks[pIdx]?.description
      if (isUntranslated(description) && description?.zh) {
        registerString(
          'potential_desc',
          charId,
          charNameZh,
          `${charId}.potential.${pIdx}.desc`,
          description.zh,
          'terms',
        )
      }
    }

    if (isUntranslated(op.itemUsage) && op.itemUsage?.zh) {
      registerString('profile_text', charId, charNameZh, `${charId}.itemUsage`, op.itemUsage.zh, 'operators')
    }
    if (isUntranslated(op.itemDesc) && op.itemDesc?.zh) {
      registerString('profile_text', charId, charNameZh, `${charId}.itemDesc`, op.itemDesc.zh, 'operators')
    }

    // Operator role tags are plain strings in the built file. The builder recovers
    // the official EN name from the parallel EN/CN arrays, so this is only a
    // fallback for a tag that has no English counterpart yet.
    const tagList = op.tagList ?? []
    for (let tagIdx = 0; tagIdx < tagList.length; tagIdx++) {
      const tag = tagList[tagIdx]
      if (typeof tag === 'string' && hasCjkIdeograph(tag)) {
        registerString('operator_tag', charId, charNameZh, `${charId}.tag.${tagIdx}`, tag, 'terms')
      }
    }
  }

  // Terminology dictionary (buff/debuff names and their tooltip descriptions) lives
  // in data/constants.json rather than in the operator files.
  try {
    const constantsPath = path.resolve(process.cwd(), 'data/constants.json')
    const constantsRaw = await fs.readFile(constantsPath, 'utf-8')
    const constants = JSON.parse(constantsRaw) as {
      terms?: Record<string, { name?: I18nField; description?: I18nField }>
    }

    for (const [termId, term] of Object.entries(constants.terms ?? {})) {
      const name = term.name
      if (isUntranslated(name) && name?.zh) {
        registerString('term_name', '', '', `term.${termId}.name`, name.zh, 'terms')
      }
      const description = term.description
      if (isUntranslated(description) && description?.zh) {
        registerString('term_desc', '', '', `term.${termId}.desc`, description.zh, 'terms')
      }
    }
  } catch {
    // constants.json is optional; the operator pass alone is still valid.
  }

  // Skins pass
  try {
    const skinsPath = path.resolve(process.cwd(), 'data/skins.json')
    const skinsRaw = await fs.readFile(skinsPath, 'utf-8')
    const skins = JSON.parse(skinsRaw) as RawSkinItem[]

    const charNames: Record<string, string> = {}
    try {
      const idxRaw = await fs.readFile(
        path.resolve(process.cwd(), 'data/operators-index.json'),
        'utf-8',
      )
      const idx = JSON.parse(idxRaw) as Array<{ id: string; name?: { zh?: string } }>
      for (const op of idx) {
        if (op.name?.zh) charNames[op.id] = op.name.zh
      }
    } catch {
      // ignore
    }

    const skinItems = collectUntranslatedFromSkins(skins, { glossary, charNames })
    for (const item of skinItems) {
      for (const key of item.keys) {
        registerString(item.type, item.charId, item.charNameZh, key, item.zh, 'terms')
      }
    }
  } catch {
    // skins.json is optional
  }

  // Banners pass
  try {
    const bannersPath = path.resolve(process.cwd(), 'data/banners.json')
    const bannersRaw = await fs.readFile(bannersPath, 'utf-8')
    const bannersData = JSON.parse(bannersRaw) as {
      cnBanners?: RawBannerItem[]
      banners?: RawBannerItem[]
    }
    const bannerList = bannersData.cnBanners ?? bannersData.banners ?? []
    const bannerItems = collectUntranslatedFromBanners(bannerList, { glossary })
    for (const item of bannerItems) {
      for (const key of item.keys) {
        registerString(item.type, item.charId, item.charNameZh, key, item.zh, 'terms')
      }
    }
  } catch {
    // banners.json is optional
  }

  const items: UntranslatedItem[] = []
  let totalChars = 0

  for (const { item } of templateMap.values()) {
    items.push(item)
    const len = item.zh.length
    byType[item.type].unique++
    byType[item.type].chars += len
    byType[item.type].estimatedTokens += Math.round(len * 1.5)
    totalChars += len
  }

  const estimatedTokens = Math.round(totalChars * 1.5)

  return {
    items,
    stats: {
      totalInstances,
      uniqueTemplates: items.length,
      totalChars,
      estimatedTokens,
      byType,
    },
  }
}

/**
 * Priority order for translating missing strings.
 */
const PRIORITY_ORDER: Record<UntranslatedType, number> = {
  operator_name: 1,
  skill_name: 2,
  talent_name: 3,
  module_name: 4,
  skin_name: 5,
  skin_brand: 6,
  banner_name: 7,
  potential_desc: 8,
  term_name: 9,
  skill_desc: 10,
  talent_desc: 11,
  module_stage_desc: 12,
  module_desc: 13,
  skin_desc: 14,
  skin_dialog: 15,
  skin_obtain: 16,
  profile_text: 17,
  term_desc: 18,
  operator_tag: 19,
}

/**
 * Exports untranslated strings into batched JSONL files (~60 per batch).
 */
export async function exportBatches(
  batchSize = 60,
  filterTypes?: UntranslatedType[],
): Promise<string[]> {
  const { items } = await collectUntranslatedItems()

  let filtered = items
  if (filterTypes && filterTypes.length > 0) {
    filtered = items.filter((i) => filterTypes.includes(i.type))
  }

  filtered.sort((a, b) => {
    const pA = PRIORITY_ORDER[a.type]
    const pB = PRIORITY_ORDER[b.type]
    if (pA !== pB) return pA - pB
    return a.id.localeCompare(b.id)
  })

  const inDir = path.resolve(process.cwd(), '.cache/translate/in')
  // Clear the directory first: a previous export with a larger set (or a smaller
  // batch size) leaves higher-numbered batch files behind, and those stale strings
  // would be translated again alongside the fresh ones.
  await fs.rm(inDir, { recursive: true, force: true })
  await fs.mkdir(inDir, { recursive: true })

  const createdFiles: string[] = []
  for (let i = 0; i < filtered.length; i += batchSize) {
    const batch = filtered.slice(i, i + batchSize)
    const batchIndex = String(Math.floor(i / batchSize) + 1).padStart(3, '0')
    const fileName = `batch_${batchIndex}.jsonl`
    const filePath = path.join(inDir, fileName)

    const lines = batch.map((item) => JSON.stringify(item))
    await fs.writeFile(filePath, lines.join('\n') + '\n', 'utf-8')
    createdFiles.push(filePath)
  }

  return createdFiles
}

/**
 * Returns the translated batch files in `outDir`, or an empty list when the
 * directory does not exist. The weekly data workflow can legitimately export
 * zero batches (nothing new to translate), and `--import` must not fail then.
 */
export async function readTranslationBatchFiles(outDir: string): Promise<string[]> {
  try {
    return (await fs.readdir(outDir)).filter(
      (f) => f.endsWith('.jsonl') || f.endsWith('.json'),
    )
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []
    throw error
  }
}

/**
 * Imports translated batches from .cache/translate/out/, validates with validateTranslation,
 * and writes to data/i18n/machine/*.json.
 */
export async function importBatches(): Promise<{
  importedCount: number
  invalidCount: number
  invalidItems: Array<{ id: string; zh: string; en: string; issues: ValidationResult['issues'] }>
}> {
  const outDir = path.resolve(process.cwd(), '.cache/translate/out')
  const machineDir = path.resolve(process.cwd(), 'data/i18n/machine')
  await fs.mkdir(machineDir, { recursive: true })

  const files = await readTranslationBatchFiles(outDir)
  if (files.length === 0) {
    console.log('[translate] No translated batches to import; nothing to do.')
    return { importedCount: 0, invalidCount: 0, invalidItems: [] }
  }

  const operatorsMach: Record<string, { text: string; source: 'machine' }> = {}
  const skillsMach: Record<string, { text: string; source: 'machine' }> = {}
  const talentsMach: Record<string, { text: string; source: 'machine' }> = {}
  const modulesMach: Record<string, { text: string; source: 'machine' }> = {}
  const termsMach: Record<string, { text: string; source: 'machine' }> = {}
  const skinsMach: Record<string, { text: string; source: 'machine' }> = {}
  const bannersMach: Record<string, { text: string; source: 'machine' }> = {}

  // Load existing machine files to preserve existing translations
  async function loadExisting(file: string, target: Record<string, { text: string; source: 'machine' }>) {
    try {
      const raw = await fs.readFile(path.join(machineDir, file), 'utf-8')
      const json = JSON.parse(raw) as Record<string, { text?: string } | string>
      for (const [k, v] of Object.entries(json)) {
        const text = typeof v === 'string' ? v : v.text
        if (text) target[k] = { text, source: 'machine' }
      }
    } catch {
      // file might not exist yet
    }
  }

  await loadExisting('operators.json', operatorsMach)
  await loadExisting('skills.json', skillsMach)
  await loadExisting('talents.json', talentsMach)
  await loadExisting('modules.json', modulesMach)
  await loadExisting('terms.json', termsMach)
  await loadExisting('skins.json', skinsMach)
  await loadExisting('banners.json', bannersMach)

  let importedCount = 0
  let invalidCount = 0
  const invalidItems: Array<{
    id: string
    zh: string
    en: string
    issues: ValidationResult['issues']
  }> = []

  for (const file of files) {
    const raw = await fs.readFile(path.join(outDir, file), 'utf-8')
    let items: TranslationBatchItem[] = []

    if (file.endsWith('.jsonl')) {
      const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0)
      for (const line of lines) {
        try {
          items.push(JSON.parse(line) as TranslationBatchItem)
        } catch {
          // ignore corrupted line
        }
      }
    } else {
      items = JSON.parse(raw) as TranslationBatchItem[]
    }

    for (const item of items) {
      if (!item.en || !item.en.trim()) continue

      const validation = validateTranslation(item.zh, item.en, { checkNewlines: true })
      if (!validation.valid) {
        invalidCount++
        invalidItems.push({
          id: item.id,
          zh: item.zh,
          en: item.en,
          issues: validation.issues,
        })
        continue
      }

      importedCount++
      const targetDict = ((): Record<string, { text: string; source: 'machine' }> => {
        switch (item.type) {
          case 'operator_name':
          case 'potential_desc':
          case 'profile_text':
          case 'operator_tag':
            return operatorsMach
          case 'skill_name':
          case 'skill_desc':
            return skillsMach
          case 'talent_name':
          case 'talent_desc':
            return talentsMach
          case 'term_name':
          case 'term_desc':
            return termsMach
          case 'module_name':
          case 'module_desc':
          case 'module_stage_desc':
            return modulesMach
          case 'skin_name':
          case 'skin_brand':
          case 'skin_desc':
          case 'skin_dialog':
          case 'skin_obtain':
            return skinsMach
          case 'banner_name':
            return bannersMach
        }
      })()

      // Map each associated key
      for (const key of item.keys) {
        targetDict[key] = { text: item.en.trim(), source: 'machine' }
      }
    }
  }

  // Write updated machine translation files
  await fs.writeFile(
    path.join(machineDir, 'operators.json'),
    JSON.stringify(operatorsMach, null, 2) + '\n',
    'utf-8',
  )
  await fs.writeFile(
    path.join(machineDir, 'skills.json'),
    JSON.stringify(skillsMach, null, 2) + '\n',
    'utf-8',
  )
  await fs.writeFile(
    path.join(machineDir, 'talents.json'),
    JSON.stringify(talentsMach, null, 2) + '\n',
    'utf-8',
  )
  await fs.writeFile(
    path.join(machineDir, 'modules.json'),
    JSON.stringify(modulesMach, null, 2) + '\n',
    'utf-8',
  )

  // Only written when there is something to say, so an empty terms.json is not
  // created for trees that have no CN-only terminology.
  if (Object.keys(termsMach).length > 0) {
    await fs.writeFile(
      path.join(machineDir, 'terms.json'),
      JSON.stringify(termsMach, null, 2) + '\n',
      'utf-8',
    )
  }

  if (Object.keys(skinsMach).length > 0) {
    await fs.writeFile(
      path.join(machineDir, 'skins.json'),
      JSON.stringify(skinsMach, null, 2) + '\n',
      'utf-8',
    )
  }

  if (Object.keys(bannersMach).length > 0) {
    await fs.writeFile(
      path.join(machineDir, 'banners.json'),
      JSON.stringify(bannersMach, null, 2) + '\n',
      'utf-8',
    )
  }

  return { importedCount, invalidCount, invalidItems }
}

// CLI runner
async function main() {
  const args = process.argv.slice(2)
  const mode = args[0] || '--analyze'

  if (mode === '--analyze') {
    const { stats } = await collectUntranslatedItems()
    console.log('=== Untranslated Strings Analysis & Deduplication ===')
    console.log(`Total occurrences in data: ${stats.totalInstances}`)
    console.log(`Unique templates (after dedup): ${stats.uniqueTemplates}`)
    console.log(`Total Chinese characters: ${stats.totalChars}`)
    console.log(`Estimated token volume: ~${stats.estimatedTokens} tokens\n`)
    console.log('--- Breakdown by Type ---')
    for (const [type, data] of Object.entries(stats.byType)) {
      console.log(
        `${type.padEnd(16)}: ${String(data.instances).padStart(5)} instances | ${String(data.unique).padStart(4)} unique | ${String(data.chars).padStart(6)} chars | ~${data.estimatedTokens} tokens`,
      )
    }
  } else if (mode === '--export') {
    const batchSize = Number(args[1]) || 60
    const files = await exportBatches(batchSize)
    console.log(`Exported ${files.length} batches to .cache/translate/in/`)
  } else if (mode === '--import') {
    const result = await importBatches()
    console.log(`Imported ${result.importedCount} translated strings.`)
    console.log(`Invalid strings: ${result.invalidCount}`)
    if (result.invalidItems.length > 0) {
      console.log('Issues found:', JSON.stringify(result.invalidItems, null, 2))
    }
  } else {
    console.log('Usage: ts-node translate-missing.ts [--analyze | --export [batchSize] | --import]')
  }
}

if (process.argv[1]?.includes('translate-missing')) {
  main().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
