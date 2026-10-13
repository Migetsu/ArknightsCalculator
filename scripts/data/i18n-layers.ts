import { promises as fs } from 'node:fs'
import path from 'node:path'
import type {
  I18nString,
  I18nSource,
} from '../../shared/schemas/operator'

export interface ManualOverrideEntry {
  text: string
  comment?: string
}

export interface I18nLayersContext {
  overrides: Record<string, ManualOverrideEntry>
  wiki: Record<
    string,
    {
      name?: string
      skills?: Record<string, string>
      talents?: string[]
      modules?: Record<string, string>
    }
  >
  glossary: Record<string, string>
}

export interface I18nResolutionOptions {
  key?: string
  officialEn?: string | null
  zhText: string | null
  wikiEn?: string | null
  fallbackEn?: string | null
  isStale?: boolean
}

export interface I18nLayersTracker {
  sources: Record<I18nSource, number>
  staleCount: number
  missingEnCount: number
}

export function createI18nTracker(): I18nLayersTracker {
  return {
    sources: {
      manual: 0,
      official: 0,
      wiki: 0,
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
  const wikiPath = path.resolve(process.cwd(), 'data/i18n/wiki-translations.json')
  const glossaryPath = path.resolve(process.cwd(), 'data/i18n/glossary.json')

  const overrides: Record<string, ManualOverrideEntry> = {}
  try {
    const files = await fs.readdir(overridesDir)
    for (const file of files) {
      if (!file.endsWith('.json')) continue
      const raw = await fs.readFile(path.join(overridesDir, file), 'utf-8')
      const json = JSON.parse(raw) as Record<string, unknown>
      for (const [k, v] of Object.entries(json)) {
        if (typeof v === 'string') {
          overrides[k] = { text: v }
        } else if (v && typeof v === 'object' && 'text' in v && typeof (v as { text: unknown }).text === 'string') {
          const entry = v as { text: string; comment?: string }
          overrides[k] = { text: entry.text, comment: entry.comment }
        }
      }
    }
  } catch (_e) {
    // Overrides dir optional / may be empty
  }

  let wiki: I18nLayersContext['wiki'] = {}
  try {
    wiki = JSON.parse(await fs.readFile(wikiPath, 'utf-8')) as I18nLayersContext['wiki']
  } catch (_e) {
    // Wiki translations optional
  }

  const glossary: Record<string, string> = {}
  try {
    const glossJson = JSON.parse(await fs.readFile(glossaryPath, 'utf-8'))
    // Flatten all categories in glossary for fast lookup
    for (const cat of ['terms', 'operators', 'classes', 'subclasses', 'factions', 'items', 'skills', 'talents']) {
      if (glossJson[cat]) {
        for (const [zh, en] of Object.entries<string>(glossJson[cat])) {
          if (!glossary[zh]) {
            glossary[zh] = en
          }
        }
      }
    }
  } catch (_e) {
    // Glossary optional
  }

  return { overrides, wiki, glossary }
}

/**
 * Resolves localized string across priority layers:
 * manual > official-repo > wiki > machine > zh
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

  // 3. Wiki (arknights.wiki.gg)
  if (wikiEn.length > 0) {
    if (tracker) tracker.sources.wiki++
    return {
      en: wikiEn,
      zh: zh || wikiEn,
      source: 'wiki',
      isMachineTranslation: false,
    }
  }

  // 4. Machine translation / Glossary
  if (zh.length > 0 && context.glossary[zh]) {
    const glossEn = context.glossary[zh]!.trim()
    if (tracker) tracker.sources.machine++
    return {
      en: glossEn,
      zh,
      source: 'machine',
      isMachineTranslation: true,
    }
  }

  if (fallbackEn.length > 0 && fallbackEn !== zh) {
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

/**
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
