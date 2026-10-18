import { z } from 'zod'

export const BannerTypeSchema = z.enum(['standard', 'limited', 'joint_operation'])
export type BannerType = z.infer<typeof BannerTypeSchema>

export const RateUpShareModeSchema = z.enum(['single', 'equal_split', 'manual'])
export type RateUpShareMode = z.infer<typeof RateUpShareModeSchema>

export const GachaBannerSchema = z.object({
  id: z.string(),
  type: BannerTypeSchema,
  tag: z.string().optional(),
  title: z.string(),
  subtitle: z.string().optional(),
  description: z.string().optional(),
  cnStartDate: z.string(),
  cnEndDate: z.string(),
  bannerArt: z.string().optional(),
  rateUp6: z.array(z.string()).default([]),
  rateUp5: z.array(z.string()).default([]),
  rateUpShareMode: RateUpShareModeSchema.optional(),
  rateUpShare: z.number().min(0).max(1).optional(),
})

export type GachaBanner = z.infer<typeof GachaBannerSchema>
