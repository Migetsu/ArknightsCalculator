import { z } from 'zod'

/**
 * Raw schema for battle_equip_table.json.
 * Validates combat parameters, stage attributes, and talent modifications for modules.
 * Uses .passthrough() for unreferenced fields.
 */
export const RawBlackboardItemSchema = z
  .object({
    key: z.string(),
    value: z.number(),
    valueStr: z.string().nullable().optional(),
  })
  .passthrough()

export type RawBlackboardItem = z.infer<typeof RawBlackboardItemSchema>

export const RawEquipPartCandidateSchema = z
  .object({
    additionalDescription: z.string().nullable().optional(),
    upgradeDescription: z.string().nullable().optional(),
    overrideDescripton: z.string().nullable().optional(), // Typo in Arknights data
    blackboard: z.array(RawBlackboardItemSchema).optional(),
    unlockCondition: z
      .object({
        phase: z.string().optional(),
        level: z.number().optional(),
      })
      .passthrough()
      .optional(),
    requiredPotentialRank: z.number().optional(),
  })
  .passthrough()

export type RawEquipPartCandidate = z.infer<typeof RawEquipPartCandidateSchema>

export const RawEquipPartSchema = z
  .object({
    resKey: z.string().nullable().optional(),
    target: z.string(),
    isToken: z.boolean().optional(),
    addOrOverrideTalentDataBundle: z
      .object({
        candidates: z.array(RawEquipPartCandidateSchema).nullable().optional(),
      })
      .passthrough()
      .optional(),
    overrideTraitDataBundle: z
      .object({
        candidates: z.array(RawEquipPartCandidateSchema).nullable().optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough()

export type RawEquipPart = z.infer<typeof RawEquipPartSchema>

export const RawBattleEquipPhaseSchema = z
  .object({
    equipLevel: z.number(),
    parts: z.array(RawEquipPartSchema),
    attributeBlackboard: z.array(RawBlackboardItemSchema),
    tokenAttributeBlackboard: z
      .record(z.string(), z.array(RawBlackboardItemSchema))
      .optional(),
  })
  .passthrough()

export type RawBattleEquipPhase = z.infer<typeof RawBattleEquipPhaseSchema>

export const RawBattleEquipEntrySchema = z
  .object({
    phases: z.array(RawBattleEquipPhaseSchema),
  })
  .passthrough()

export type RawBattleEquipEntry = z.infer<typeof RawBattleEquipEntrySchema>

export const RawBattleEquipTableSchema = z.record(
  z.string(),
  RawBattleEquipEntrySchema,
)

export type RawBattleEquipTable = z.infer<typeof RawBattleEquipTableSchema>
