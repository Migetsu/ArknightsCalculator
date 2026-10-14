import { z } from 'zod'

/**
 * Supported UI and content locales.
 */
export type ContentLocale = 'ru' | 'en' | 'zh'

/**
 * Provenance source for localized strings.
 * Priority: manual > official > wiki > community > machine > zh
 */
export const I18nSourceSchema = z.enum(['manual', 'official', 'wiki', 'community', 'machine', 'zh'])
export type I18nSource = z.infer<typeof I18nSourceSchema>

/**
 * Localized string with English (primary game glossary), Chinese (original),
 * optional Russian (fan/community translation), provenance source, and stale flag.
 */
export const I18nStringSchema = z.object({
  en: z.string(),
  zh: z.string(),
  ru: z.string().optional(),
  source: I18nSourceSchema,
  isMachineTranslation: z.boolean().optional().default(false),
  stale: z.boolean().optional(),
})

export type I18nString = z.infer<typeof I18nStringSchema>

export interface I18nInput {
  en: string
  zh: string
  ru?: string
  source?: I18nSource
  isMachineTranslation?: boolean
  stale?: boolean
}

/**
 * Checks whether the localized string is unofficial / machine-translated.
 */
export function isMachineTranslated(text: I18nInput | undefined | null): boolean {
  if (!text) return false
  return text.source === 'machine' || text.isMachineTranslation === true
}

/**
 * Checks whether the localized string is an unverified community translation.
 */
export function isCommunityTranslated(text: I18nInput | undefined | null): boolean {
  if (!text) return false
  return text.source === 'community'
}

/**
 * Pure helper to resolve localized text following the fallback chain:
 * ru -> en -> zh.
 */
export function resolveI18nString(
  text: I18nInput | undefined | null,
  locale: ContentLocale = 'en',
): string {
  if (!text) return ''

  if (locale === 'ru' && text.ru && text.ru.trim().length > 0) {
    return text.ru
  }
  if (locale === 'zh' && text.zh && text.zh.trim().length > 0) {
    return text.zh
  }
  if (text.en && text.en.trim().length > 0) {
    return text.en
  }
  return text.zh || text.ru || ''
}

/**
 * Core operator professions in Arknights.
 */
export const OperatorClassSchema = z.enum([
  'PIONEER', // Vanguard
  'WARRIOR', // Guard
  'SNIPER', // Sniper
  'TANK', // Defender
  'MEDIC', // Medic
  'SUPPORT', // Supporter
  'CASTER', // Caster
  'SPECIALIST', // Specialist
])

export type OperatorClass = z.infer<typeof OperatorClassSchema>

/**
 * Operator position on battlefield.
 */
export const OperatorPositionSchema = z.enum(['MELEE', 'RANGED', 'ALL'])
export type OperatorPosition = z.infer<typeof OperatorPositionSchema>

/**
 * Server availability flag.
 */
export const ServerRegionSchema = z.enum(['cn', 'global'])
export type ServerRegion = z.infer<typeof ServerRegionSchema>

/**
 * Lightweight operator summary for list, filters, search, and recruitment calculator.
 */
export const OperatorSummarySchema = z.object({
  id: z.string(),
  name: I18nStringSchema,
  appellation: z.string().optional(),
  displayNumber: z.string().nullable().optional(),
  rarity: z.number().int().min(1).max(6),
  class: OperatorClassSchema,
  subclass: z.string(),
  faction: z.string().nullable().optional(),
  position: OperatorPositionSchema,
  tagList: z.array(z.string()),
  servers: z.array(ServerRegionSchema).min(1),
  hasIcon: z.boolean(),
  isClassChange: z.boolean().optional().default(false),
})

export type OperatorSummary = z.infer<typeof OperatorSummarySchema>

/**
 * Evolution phase stats and level caps.
 */
export const OperatorPhaseStatSchema = z.object({
  phase: z.number().int().min(0).max(2),
  maxLevel: z.number().int().positive(),
  rangeId: z.string().optional(),
  evolveCost: z
    .array(
      z.object({
        id: z.string(),
        count: z.number().positive(),
      }),
    )
    .optional(),
  attributesKeyFrames: z
    .array(
      z.object({
        level: z.number().int().positive(),
        data: z.object({
          maxHp: z.number(),
          atk: z.number(),
          def: z.number(),
          magicResistance: z.number(),
          cost: z.number(),
          blockCnt: z.number(),
          moveSpeed: z.number().optional(),
          attackSpeed: z.number().optional(),
          baseAttackTime: z.number(),
          respawnTime: z.number(),
          hpRecoveryPerSec: z.number().optional(),
          spRecoveryPerSec: z.number().optional(),
        }),
      }),
    )
    .optional(),
})

export type OperatorPhaseStat = z.infer<typeof OperatorPhaseStatSchema>

/**
 * Skill level data and blackboard parameters.
 */
export const OperatorSkillLevelSchema = z.object({
  name: I18nStringSchema,
  description: I18nStringSchema,
  rangeId: z.string().nullable().optional(),
  skillType: z.union([z.string(), z.number()]).optional(),
  duration: z.number().optional(),
  spType: z.union([z.string(), z.number()]).optional(),
  spCost: z.number().optional(),
  initSp: z.number().optional(),
  blackboard: z.record(z.string(), z.number()).optional(),
})

export type OperatorSkillLevel = z.infer<typeof OperatorSkillLevelSchema>

/**
 * Operator skill summary with base levels (1-7) and masteries (M1-M3).
 */
export const OperatorSkillSchema = z.object({
  skillId: z.string(),
  iconId: z.string().nullable().optional(),
  levels: z.array(OperatorSkillLevelSchema),
  masteryCosts: z
    .array(
      z.object({
        unlockCond: z.object({
          phase: z.number(),
          level: z.number(),
        }),
        levelUpCost: z.array(
          z.object({
            id: z.string(),
            count: z.number().positive(),
          }),
        ),
      }),
    )
    .optional(),
})

export type OperatorSkill = z.infer<typeof OperatorSkillSchema>

/**
 * Operator talent with potential/elite improvements.
 */
export const OperatorTalentCandidateSchema = z.object({
  name: I18nStringSchema,
  description: I18nStringSchema,
  unlockCond: z.object({
    phase: z.number(),
    level: z.number(),
    potential: z.number(),
  }),
  blackboard: z.record(z.string(), z.number()).optional(),
})

export const OperatorTalentSchema = z.object({
  candidates: z.array(OperatorTalentCandidateSchema),
})

export type OperatorTalent = z.infer<typeof OperatorTalentSchema>

/**
 * Combat trait/talent modifications introduced by a module stage.
 */
export const OperatorModulePartCandidateSchema = z.object({
  additionalDescription: I18nStringSchema.optional(),
  upgradeDescription: I18nStringSchema.optional(),
  overrideDescription: I18nStringSchema.optional(),
  blackboard: z.record(z.string(), z.number()).optional(),
  requiredPotentialRank: z.number().optional(),
})

export type OperatorModulePartCandidate = z.infer<typeof OperatorModulePartCandidateSchema>

export const OperatorModulePartSchema = z.object({
  target: z.string(),
  candidates: z.array(OperatorModulePartCandidateSchema).optional(),
})

export type OperatorModulePart = z.infer<typeof OperatorModulePartSchema>

/**
 * Single upgrade stage of a combat module (Stage 1, 2, 3).
 */
export const OperatorModuleStageSchema = z.object({
  stage: z.number().int().min(1).max(3),
  stats: z.record(z.string(), z.number()),
  parts: z.array(OperatorModulePartSchema).optional(),
  cost: z
    .array(
      z.object({
        id: z.string(),
        count: z.number().positive(),
      }),
    )
    .optional(),
})

export type OperatorModuleStage = z.infer<typeof OperatorModuleStageSchema>

/**
 * Module / Uniequip item, stages, combat stats, and unlock costs.
 */
export const OperatorModuleSchema = z.object({
  id: z.string(),
  name: I18nStringSchema,
  type: z.string(), // e.g. "INITIAL" | "ADVANCED"
  typeName2: z.string(), // e.g. "CHG-X"
  icon: z.string(),
  description: I18nStringSchema.optional(),
  servers: z.array(ServerRegionSchema).min(1),
  itemCost: z
    .record(
      z.string(), // Stage level '1', '2', '3'
      z.array(
        z.object({
          id: z.string(),
          count: z.number().positive(),
        }),
      ),
    )
    .optional(),
  stages: z.array(OperatorModuleStageSchema).optional(),
})

export type OperatorModule = z.infer<typeof OperatorModuleSchema>

/**
 * Detailed operator payload for operator wiki page and planner.
 */
export const OperatorDetailSchema = z.object({
  id: z.string(),
  name: I18nStringSchema,
  appellation: z.string().optional(),
  displayNumber: z.string().nullable().optional(),
  rarity: z.number().int().min(1).max(6),
  class: OperatorClassSchema,
  subclass: z.string(),
  faction: z.string().nullable().optional(),
  position: OperatorPositionSchema,
  tagList: z.array(z.string()),
  servers: z.array(ServerRegionSchema).min(1),
  itemUsage: I18nStringSchema.optional(),
  itemDesc: I18nStringSchema.optional(),
  biography: I18nStringSchema.optional(),
  artist: z.string().nullable().optional(),
  va: z.string().nullable().optional(),
  phases: z.array(OperatorPhaseStatSchema),
  skills: z.array(OperatorSkillSchema),
  allSkillLvlup: z
    .array(
      z.object({
        unlockCond: z.object({
          phase: z.number(),
          level: z.number(),
        }),
        lvlUpCost: z.array(
          z.object({
            id: z.string(),
            count: z.number().positive(),
          }),
        ),
      }),
    )
    .optional(),
  talents: z.array(OperatorTalentSchema).optional(),
  potentialRanks: z
    .array(
      z.object({
        type: z.union([z.number(), z.string()]),
        description: I18nStringSchema,
      }),
    )
    .optional(),
  favorKeyFrames: z
    .array(
      z.object({
        level: z.number(),
        data: z.record(z.string(), z.number()),
      }),
    )
    .optional(),
  modules: z.array(OperatorModuleSchema).optional(),
})

export type OperatorDetail = z.infer<typeof OperatorDetailSchema>

/**
 * Metadata for generated game dataset.
 */
export const DataMetaSchema = z.object({
  cnCommit: z.string(),
  enCommit: z.string(),
  buildDate: z.string(),
  totalOperators: z.number().int().nonnegative(),
  globalOperators: z.number().int().nonnegative(),
  cnOnlyOperators: z.number().int().nonnegative(),
  untranslatedCount: z.number().int().nonnegative(),
})

export type DataMeta = z.infer<typeof DataMetaSchema>
