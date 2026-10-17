import { z } from 'zod'

export const BannerTypeSchema = z.enum(['standard', 'limited', 'joint_operation'])
export type BannerType = z.infer<typeof BannerTypeSchema>

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
})

export type GachaBanner = z.infer<typeof GachaBannerSchema>
