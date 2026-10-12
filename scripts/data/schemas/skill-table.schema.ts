import { z } from 'zod'

export const RawSkillLevelSchema = z
  .object({
    name: z.string(),
    description: z.string().nullable().optional(),
    spData: z
      .object({
        spType: z.union([z.string(), z.number()]).optional(),
        maxChargeTime: z.number().optional(),
        spCost: z.number().optional(),
        initSp: z.number().optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough()

export const RawSkillSchema = z
  .object({
    skillId: z.string(),
    iconId: z.string().nullable().optional(),
    hidden: z.boolean().optional(),
    levels: z.array(RawSkillLevelSchema),
  })
  .passthrough()

export const RawSkillTableSchema = z.record(z.string(), RawSkillSchema)

export type RawSkillLevel = z.infer<typeof RawSkillLevelSchema>
export type RawSkill = z.infer<typeof RawSkillSchema>
export type RawSkillTable = z.infer<typeof RawSkillTableSchema>
