import { z } from 'zod'

export const RawEvolutionCostSchema = z
  .object({
    id: z.string(),
    count: z.number(),
    type: z.string().optional(),
  })
  .passthrough()

export const RawPhaseSchema = z
  .object({
    maxLevel: z.number(),
    rangeId: z.string().nullable().optional(),
    evolveCost: z.array(RawEvolutionCostSchema).nullable().optional(),
  })
  .passthrough()

export const RawSkillLvlUpCostCondSchema = z
  .object({
    unlockCond: z
      .object({
        phase: z.union([z.string(), z.number()]),
        level: z.number(),
      })
      .passthrough(),
    lvlUpTime: z.number().optional(),
    levelUpCost: z.array(RawEvolutionCostSchema).nullable().optional(),
  })
  .passthrough()

export const RawCharSkillSchema = z
  .object({
    skillId: z.string().nullable().optional(),
    overridePrefabKey: z.string().nullable().optional(),
    overrideTokenKey: z.string().nullable().optional(),
    levelUpCostCond: z.array(RawSkillLvlUpCostCondSchema).optional(),
  })
  .passthrough()

export const RawAllSkillLvlupSchema = z
  .object({
    unlockCond: z
      .object({
        phase: z.union([z.string(), z.number()]),
        level: z.number(),
      })
      .passthrough(),
    lvlUpTime: z.number().optional(),
    lvlUpCost: z.array(RawEvolutionCostSchema).nullable().optional(),
  })
  .passthrough()

export const RawCharacterSchema = z
  .object({
    name: z.string(),
    description: z.string().nullable().optional(),
    appellation: z.string().optional(),
    profession: z.string(),
    subProfessionId: z.string().nullable().optional(),
    rarity: z.union([z.string(), z.number()]),
    phases: z.array(RawPhaseSchema),
    skills: z.array(RawCharSkillSchema),
    allSkillLvlup: z.array(RawAllSkillLvlupSchema).optional(),
    tagList: z.array(z.string()).nullable().optional(),
  })
  .passthrough()

export const RawCharacterTableSchema = z.record(z.string(), RawCharacterSchema)

export type RawEvolutionCost = z.infer<typeof RawEvolutionCostSchema>
export type RawPhase = z.infer<typeof RawPhaseSchema>
export type RawCharSkill = z.infer<typeof RawCharSkillSchema>
export type RawCharacter = z.infer<typeof RawCharacterSchema>
export type RawCharacterTable = z.infer<typeof RawCharacterTableSchema>
