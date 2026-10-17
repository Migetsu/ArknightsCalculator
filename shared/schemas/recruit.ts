import { z } from 'zod'

export const RecruitTagGroupSchema = z.enum(['qualification', 'position', 'class', 'affix'])
export type RecruitTagGroup = z.infer<typeof RecruitTagGroupSchema>

export const RecruitTagSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1),
  group: RecruitTagGroupSchema,
})
export type RecruitTag = z.infer<typeof RecruitTagSchema>

export const RecruitOperatorSchema = z.object({
  id: z.string().min(1),
  name: z.object({
    en: z.string().min(1),
    zh: z.string().min(1),
  }),
  rarity: z.number().int().min(1).max(6),
  class: z.string().min(1),
  position: z.enum(['MELEE', 'RANGED']),
  tags: z.array(z.string().min(1)),
  hasIcon: z.boolean().default(true),
})
export type RecruitOperator = z.infer<typeof RecruitOperatorSchema>

export const RecruitDataSchema = z.object({
  tags: z.array(RecruitTagSchema),
  pools: z.object({
    global: z.array(RecruitOperatorSchema),
    cn: z.array(RecruitOperatorSchema),
  }),
})
export type RecruitData = z.infer<typeof RecruitDataSchema>

export type GuaranteeTier = '6_star' | '5_star' | '4_star' | 'robot' | '3_star_plus' | 'starter'

export interface RecruitCombinationResult {
  tags: string[]
  operators: RecruitOperator[]
  guaranteeTier: GuaranteeTier
  minRarity: number
  maxRarity: number
  hasRobot: boolean
}
