import { z } from 'zod'
import { I18nStringSchema } from './operator'

/**
 * Server availability flag for skin releases.
 */
export const SkinServerRegionSchema = z.enum(['cn', 'en', 'global'])
export type SkinServerRegion = z.infer<typeof SkinServerRegionSchema>

/**
 * Zod schema for an operator skin/outfit in Arknights.
 */
export const SkinSchema = z.object({
  /** Unique skin identifier, e.g. 'char_102_texas@summer#1' or 'char_002_amiya#1' */
  skinId: z.string(),
  /** Parent operator identifier, e.g. 'char_102_texas' */
  charId: z.string(),
  /** Localized skin name with layered provenance */
  skinName: I18nStringSchema,
  /** Fashion brand identifier, e.g. 'sale', 'epoque', 'summer', 'winter' */
  brandId: z.string().nullable().optional(),
  /** Display brand name, e.g. 'Coral Coast', 'EPOQUE' */
  brandName: z.string().nullable().optional(),
  /** List of illustrators/artists credited for the skin */
  drawerList: z.array(z.string()),
  /** Lore description or flavor text */
  description: z.string().nullable().optional(),
  /** Outfit quote or voice dialogue line */
  dialog: z.string().nullable().optional(),
  /** How the outfit is obtained, e.g. 'Store', 'Event Reward', 'Quest Reward' */
  obtainApproach: z.string().nullable().optional(),
  /** Whether the skin is sold in the Outfit Store for premium currency */
  isBuySkin: z.boolean(),
  /** Numerical cost if known/applicable (in Originite Prime), null/undefined for free reward skins */
  price: z.number().nullable().optional(),
  /** Currency code for the cost, e.g. 'ORIGINITE_PRIME' */
  currency: z.string().nullable().optional(),
  /** Illustration asset ID for full body art */
  illustId: z.string(),
  /** Square avatar/icon asset ID */
  avatarId: z.string(),
  /** Half-body portrait asset ID */
  portraitId: z.string(),
  /** Whether this skin is currently available only on CN servers */
  isCnOnly: z.boolean(),
  /** List of server regions where this skin is released ('cn' or 'en' / 'global') */
  servers: z.array(SkinServerRegionSchema).min(1),
})

export type Skin = z.infer<typeof SkinSchema>

/**
 * Array of skins.
 */
export const SkinListSchema = z.array(SkinSchema)
export type SkinList = z.infer<typeof SkinListSchema>

/**
 * Dictionary mapping skinId to Skin.
 */
export const SkinRecordMapSchema = z.record(z.string(), SkinSchema)
export type SkinRecordMap = z.infer<typeof SkinRecordMapSchema>
