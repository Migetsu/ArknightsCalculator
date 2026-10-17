import { promises as fs } from 'node:fs'
import path from 'node:path'
import { z } from 'zod'
import type {
  I18nString,
  I18nSource,
} from '../../shared/schemas/operator'
import type { GlossaryCategory, GlossaryData } from './glossary'

export const ManualOverrideEntrySchema = z.object({
  text: z.string().min(1),
  author: z.string().min(1),
  note: z.string().min(1),
  source: z.string().url({ message: 'source must be a valid URL' }),
})

export type ManualOverrideEntry = z.infer<typeof ManualOverrideEntrySchema>

export interface I18nLayersContext {
  overrides: Record<string, ManualOverrideEntry>
  machine?: Record<string, string>
  wiki: Record<
    string,
    {
      name?: string
      skills?: Record<string, string>
      talents?: string[]
      modules?: Record<string, string>
    }
  >
  categorizedGlossary?: Record<string, Record<string, string>>
  flatGlossary?: Record<string, string>
  glossary?: Record<string, string>
  globalAvailability?: Record<string, boolean>
}

export interface I18nResolutionOptions {
  key?: string
  charId?: string
  category?: GlossaryCategory
  officialEn?: string | null
  zhText: string | null
  wikiEn?: string | null
  fallbackEn?: string | null
  isStale?: boolean
  isGlobal?: boolean
}

export interface I18nLayersTracker {
  sources: Record<I18nSource, number>
  staleCount: number
  missingEnCount: number
}

export function createEmptyI18nLayersContext(): I18nLayersContext {
  return {
    overrides: {},
    machine: {},
    wiki: {},
    categorizedGlossary: {},
    flatGlossary: {},
    glossary: {},
    globalAvailability: {},
  }
}

export function createI18nTracker(): I18nLayersTracker {
  return {
    sources: {
      manual: 0,
      official: 0,
      wiki: 0,
      community: 0,
      machine: 0,
      zh: 0,
    },
    staleCount: 0,
    missingEnCount: 0,
  }
}

/**
 * Loads overrides, wiki translations, and glossary dictionaries into memory.
 */
export async function loadI18nLayersContext(): Promise<I18nLayersContext> {
  const overridesDir = path.resolve(process.cwd(), 'data/i18n/overrides')
  const wikiPath = path.resolve(process.cwd(), 'data/i18n/wiki/operators.json')
  const glossaryPath = path.resolve(process.cwd(), 'data/i18n/glossary.json')
  const availabilityPath = path.resolve(process.cwd(), 'data/i18n/global-availability.json')

  const overrides: Record<string, ManualOverrideEntry> = {}
  try {
    const files = await fs.readdir(overridesDir)
    for (const file of files) {
      if (!file.endsWith('.json')) continue
      const raw = await fs.readFile(path.join(overridesDir, file), 'utf-8')
      const json = JSON.parse(raw) as Record<string, unknown>
      for (const [k, v] of Object.entries(json)) {
        const parsed = ManualOverrideEntrySchema.parse(v)
        overrides[k] = parsed
      }
    }
  } catch (_e) {
    // Overrides dir optional / may be empty
  }

  let wiki: I18nLayersContext['wiki'] = {}
  try {
    const rawWiki = JSON.parse(await fs.readFile(wikiPath, 'utf-8'))
    wiki = (rawWiki.operators || rawWiki) as I18nLayersContext['wiki']
  } catch (_e) {
    // Wiki translations optional
  }

  const categorizedGlossary: Record<string, Record<string, string>> = {}
  const flatGlossary: Record<string, string> = {}
  try {
    const glossJson = (await JSON.parse(await fs.readFile(glossaryPath, 'utf-8'))) as GlossaryData
    const categories: GlossaryCategory[] = [
      'operators',
      'classes',
      'subclasses',
      'factions',
      'items',
      'skills',
      'talents',
      'terms',
    ]

    for (const cat of categories) {
      if (glossJson[cat]) {
        categorizedGlossary[cat] = glossJson[cat]
        for (const [zh, en] of Object.entries<string>(glossJson[cat])) {
          if (!flatGlossary[zh]) {
            flatGlossary[zh] = en
          }
        }
      }
    }
  } catch (_e) {
    // Glossary optional
  }

  const globalAvailability: Record<string, boolean> = {}
  try {
    const availRaw = JSON.parse(await fs.readFile(availabilityPath, 'utf-8')) as {
      operators?: Array<{ id: string; isGlobal: boolean }>
    }
    for (const op of availRaw.operators ?? []) {
      globalAvailability[op.id] = op.isGlobal
    }
  } catch (_e) {
    // Availability optional
  }

  const machineDir = path.resolve(process.cwd(), 'data/i18n/machine')
  const machine: Record<string, string> = {}
  try {
    const files = await fs.readdir(machineDir)
    for (const file of files) {
      if (!file.endsWith('.json')) continue
      const raw = await fs.readFile(path.join(machineDir, file), 'utf-8')
      const json = JSON.parse(raw) as Record<string, unknown>
      for (const [k, v] of Object.entries(json)) {
        if (typeof v === 'string') {
          machine[k] = v.trim()
        } else if (v && typeof v === 'object' && 'text' in v && typeof (v as { text: unknown }).text === 'string') {
          machine[k] = (v as { text: string }).text.trim()
        }
      }
    }
  } catch (_e) {
    // Machine translations optional
  }

  return {
    overrides,
    machine,
    wiki,
    categorizedGlossary,
    flatGlossary,
    glossary: flatGlossary,
    globalAvailability,
  }
}

export const VALID_APPELLATION_REGEX = /^[\x20-\x7E\u00C0-\u024F]+$/
export const HAS_LATIN_LETTER_REGEX = /[A-Za-z]/

/**
 * Validates that an appellation/fallback string contains only printable ASCII/Latin
 * characters (no Cyrillic or CJK) and at least one Latin letter.
 * Appellation is strictly used as a last-resort fallback.
 */
export function isValidLatinAppellation(value: string | null | undefined): boolean {
  if (!value) return false
  const trimmed = value.trim()
  if (trimmed.length === 0) return false
  return VALID_APPELLATION_REGEX.test(trimmed) && HAS_LATIN_LETTER_REGEX.test(trimmed)
}

/**
 * Resolves localized string across priority layers:
 * manual > official-repo > wiki / community > machine > zh
 */
export function resolveLayeredI18nString(
  options: I18nResolutionOptions,
  context: I18nLayersContext,
  tracker?: I18nLayersTracker,
): I18nString {
  const zh = (options.zhText ?? '').trim()
  const officialEn = (options.officialEn ?? '').trim()
  const wikiEn = (options.wikiEn ?? '').trim()
  const fallbackEn = (options.fallbackEn ?? '').trim()

  // 1. Manual Overrides
  if (options.key && context.overrides[options.key]) {
    const manualText = context.overrides[options.key]!.text.trim()
    if (tracker) tracker.sources.manual++
    return {
      en: manualText,
      zh: zh || manualText,
      source: 'manual',
      isMachineTranslation: false,
    }
  }

  // 2. Official repo
  if (officialEn.length > 0) {
    const isStale = options.isStale === true
    if (tracker) {
      tracker.sources.official++
      if (isStale) tracker.staleCount++
    }
    return {
      en: officialEn,
      zh: zh || officialEn,
      source: 'official',
      isMachineTranslation: false,
      stale: isStale ? true : undefined,
    }
  }

  // 3. Wiki (arknights.wiki.gg) -> 'wiki' if released on Global, 'community' if CN-only
  if (wikiEn.length > 0) {
    const isGlobal =
      options.isGlobal !== undefined
        ? options.isGlobal
        : options.charId
          ? (context.globalAvailability?.[options.charId] ?? true)
          : true

    const source: I18nSource = isGlobal ? 'wiki' : 'community'
    if (tracker) {
      if (source === 'community') {
        tracker.sources.community++
      } else {
        tracker.sources.wiki++
      }
    }
    return {
      en: wikiEn,
      zh: zh || wikiEn,
      source,
      isMachineTranslation: false,
    }
  }

  // 4. Machine translation layer (direct key mapping > categorized glossary > flat glossary)
  if (options.key && context.machine?.[options.key]) {
    const machText = context.machine[options.key]!.trim()
    if (tracker) tracker.sources.machine++
    return {
      en: machText,
      zh: zh || machText,
      source: 'machine',
      isMachineTranslation: true,
    }
  }

  if (zh.length > 0) {
    if (options.category && context.categorizedGlossary?.[options.category]?.[zh]) {
      const glossEn = context.categorizedGlossary[options.category]![zh]!.trim()
      if (tracker) tracker.sources.machine++
      return {
        en: glossEn,
        zh,
        source: 'machine',
        isMachineTranslation: true,
      }
    }

    const flatFallback = context.flatGlossary?.[zh] ?? context.glossary?.[zh]
    if (flatFallback) {
      const glossEn = flatFallback.trim()
      if (tracker) tracker.sources.machine++
      return {
        en: glossEn,
        zh,
        source: 'machine',
        isMachineTranslation: true,
      }
    }
  }

  if (fallbackEn.length > 0 && fallbackEn !== zh && isValidLatinAppellation(fallbackEn)) {
    if (tracker) tracker.sources.machine++
    return {
      en: fallbackEn,
      zh: zh || fallbackEn,
      source: 'machine',
      isMachineTranslation: true,
    }
  }

  // 5. ZH fallback (no English)
  if (tracker) {
    tracker.sources.zh++
    tracker.missingEnCount++
  }
  return {
    en: zh,
    zh,
    source: 'zh',
    isMachineTranslation: true,
  }
}

export interface StaleSkillLevelInput {
  description?: string | null
  spData?: { spCost?: number; initSp?: number } | null
  duration?: number | null
  skillType?: number | string | null
  rangeId?: string | null
  blackboard?: { key: string; value?: number }[] | null
}

export function checkSkillLevelStale(
  cnLvl: StaleSkillLevelInput | undefined | null,
  enLvl: StaleSkillLevelInput | undefined | null,
): boolean {
  if (!cnLvl || !enLvl) return false

  // 1. Blackboard numerical values
  const cnBb: Record<string, number> = {}
  for (const b of cnLvl.blackboard ?? []) {
    if (typeof b.value === 'number') cnBb[b.key] = b.value
  }
  const enBb: Record<string, number> = {}
  for (const b of enLvl.blackboard ?? []) {
    if (typeof b.value === 'number') enBb[b.key] = b.value
  }
  for (const [k, v] of Object.entries(cnBb)) {
    if (enBb[k] !== undefined && enBb[k] !== v) {
      return true
    }
  }

  // 2. Structural mechanics
  if (cnLvl.spData?.spCost !== enLvl.spData?.spCost) return true
  if (cnLvl.spData?.initSp !== enLvl.spData?.initSp) return true
  if (cnLvl.duration !== enLvl.duration) return true
  if (cnLvl.skillType !== enLvl.skillType) return true
  if (cnLvl.rangeId !== enLvl.rangeId) return true

  // 3. Tag set differences in descriptions
  const cnDesc = cnLvl.description ?? ''
  const enDesc = enLvl.description ?? ''
  if (cnDesc && enDesc) {
    const cnTags = (cnDesc.match(/<[@$][a-zA-Z0-9_.-]+>/g) || []).sort().join(',')
    const enTags = (enDesc.match(/<[@$][a-zA-Z0-9_.-]+>/g) || []).sort().join(',')
    if (cnTags !== enTags) {
      return true
    }
  }

  return false
}

export interface StaleTalentCandidateInput {
  description?: string | null
  unlockCondition?: { level?: number } | null
  requiredPotentialRank?: number | null
  blackboard?: { key: string; value?: number }[] | null
}

/**
 * Detects whether a talent candidate's English translation is potentially stale.
 */
export function checkTalentCandidateStale(
  cnCand: StaleTalentCandidateInput | undefined | null,
  enCand: StaleTalentCandidateInput | undefined | null,
): boolean {
  if (!cnCand || !enCand) return false

  const cnBb: Record<string, number> = {}
  for (const b of cnCand.blackboard ?? []) {
    if (typeof b.value === 'number') cnBb[b.key] = b.value
  }
  const enBb: Record<string, number> = {}
  for (const b of enCand.blackboard ?? []) {
    if (typeof b.value === 'number') enBb[b.key] = b.value
  }
  for (const [k, v] of Object.entries(cnBb)) {
    if (enBb[k] !== undefined && enBb[k] !== v) {
      return true
    }
  }

  if (cnCand.unlockCondition?.level !== enCand.unlockCondition?.level) return true
  if (cnCand.requiredPotentialRank !== enCand.requiredPotentialRank) return true

  const cnDesc = cnCand.description ?? ''
  const enDesc = enCand.description ?? ''
  if (cnDesc && enDesc) {
    const cnTags = (cnDesc.match(/<[@$][a-zA-Z0-9_.-]+>/g) || []).sort().join(',')
    const enTags = (enDesc.match(/<[@$][a-zA-Z0-9_.-]+>/g) || []).sort().join(',')
    if (cnTags !== enTags) {
      return true
    }
  }

  return false
}

export interface StaleEquipInput {
  uniEquipDesc?: string | null
}

export interface StaleBattleEquipInput {
  phases?: {
    parts?: {
      overrideTraitDataBundle?: {
        candidates?: { blackboard?: { key: string; value?: number }[] }[]
      }
    }[]
  }[]
}

/**
 * Detects whether an operator module's English translation is potentially stale.
 */
export function checkModuleStale(
  cnEquip: StaleEquipInput | undefined | null,
  enEquip: StaleEquipInput | undefined | null,
  cnBattleEquip: StaleBattleEquipInput | undefined | null,
  enBattleEquip: StaleBattleEquipInput | undefined | null,
): boolean {
  if (!cnEquip || !enEquip) return false

  // Check stats buff or parts in battle equip table
  if (cnBattleEquip?.phases && enBattleEquip?.phases) {
    for (let p = 0; p < cnBattleEquip.phases.length; p++) {
      const cnParts = cnBattleEquip.phases[p]?.parts ?? []
      const enParts = enBattleEquip.phases[p]?.parts ?? []
      if (cnParts.length !== enParts.length) return true
      for (let i = 0; i < cnParts.length; i++) {
        const cnBb: Record<string, number> = {}
        for (const b of cnParts[i]?.overrideTraitDataBundle?.candidates?.[0]?.blackboard ?? []) {
          if (typeof b.value === 'number') cnBb[b.key] = b.value
        }
        const enBb: Record<string, number> = {}
        for (const b of enParts[i]?.overrideTraitDataBundle?.candidates?.[0]?.blackboard ?? []) {
          if (typeof b.value === 'number') enBb[b.key] = b.value
        }
        for (const [k, v] of Object.entries(cnBb)) {
          if (enBb[k] !== undefined && enBb[k] !== v) {
            return true
          }
        }
      }
    }
  }

  const cnDesc = cnEquip.uniEquipDesc ?? ''
  const enDesc = enEquip.uniEquipDesc ?? ''
  if (cnDesc && enDesc) {
    const cnTags = (cnDesc.match(/<[@$][a-zA-Z0-9_.-]+>/g) || []).sort().join(',')
    const enTags = (enDesc.match(/<[@$][a-zA-Z0-9_.-]+>/g) || []).sort().join(',')
    if (cnTags !== enTags) {
      return true
    }
  }

  return false
}
