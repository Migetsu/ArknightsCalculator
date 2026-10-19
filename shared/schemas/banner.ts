import { z } from 'zod'

export const BannerServerSchema = z.enum(['cn', 'en'])
export type BannerServer = z.infer<typeof BannerServerSchema>

export const BannerTypeSchema = z.enum(['standard', 'limited', 'joint_operation'])
export type BannerType = z.infer<typeof BannerTypeSchema>

export const RateUpShareModeSchema = z.enum(['single', 'equal_split', 'manual'])
export type RateUpShareMode = z.infer<typeof RateUpShareModeSchema>

export const GachaBannerSchema = z.object({
  id: z.string(),
  server: BannerServerSchema.default('cn'),
  ruleType: z.string().default('NORMAL'),
  type: BannerTypeSchema,
  tag: z.string().optional(),
  name: z.string().optional(),
  title: z.string(),
  subtitle: z.string().optional(),
  description: z.string().optional(),
  openTime: z.number().default(0),
  endTime: z.number().default(0),
  openIso: z.string().default(''),
  endIso: z.string().default(''),
  durationDays: z.number().optional(),
  isActive: z.boolean().default(false),
  gachaIndex: z.number().optional(),
  lmtgsid: z.string().nullable().optional(),
  pairedBannerId: z.string().nullable().optional(),
  isNextEnBanner: z.boolean().optional(),
  cnStartDate: z.string().default(''),
  cnEndDate: z.string().default(''),
  bannerArt: z.string().optional(),
  rateUp6: z.array(z.string()).default([]),
  rateUp5: z.array(z.string()).default([]),
  rateUpShareMode: RateUpShareModeSchema.optional(),
  rateUpShare: z.number().min(0).max(1).optional(),
})

export type GachaBanner = z.infer<typeof GachaBannerSchema>

export const BannerSummarySchema = z.object({
  id: z.string(),
  server: BannerServerSchema,
  name: z.string(),
  ruleType: z.string(),
  openTime: z.number(),
  endTime: z.number(),
  openIso: z.string(),
  endIso: z.string(),
})
export type BannerSummary = z.infer<typeof BannerSummarySchema>

export const NextBannerSummarySchema = z.object({
  id: z.string(),
  server: BannerServerSchema,
  name: z.string(),
  ruleType: z.string(),
  lmtgsid: z.string().nullable().optional(),
  openTime: z.number(),
  endTime: z.number(),
  openIso: z.string(),
  endIso: z.string(),
})
export type NextBannerSummary = z.infer<typeof NextBannerSummarySchema>

export const BannersMetaSchema = z.object({
  generatedAt: z.string(),
  currentEnBanner: BannerSummarySchema.nullable(),
  activeEnBanners: z.array(BannerSummarySchema),
  activeCnBanners: z.array(BannerSummarySchema),
  nextEnLimitedBanner: NextBannerSummarySchema.nullable(),
  nextEnBanner: NextBannerSummarySchema.nullable(),
})
export type BannersMeta = z.infer<typeof BannersMetaSchema>

export const BannersDatasetSchema = z.object({
  meta: BannersMetaSchema,
  cnBanners: z.array(GachaBannerSchema),
  enBanners: z.array(GachaBannerSchema),
  banners: z.array(GachaBannerSchema),
})
export type BannersDataset = z.infer<typeof BannersDatasetSchema>
