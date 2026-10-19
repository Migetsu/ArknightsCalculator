import { z } from 'zod'
import { I18nStringSchema } from './operator'

/**
 * Server availability flag for skin releases.
 */
export const SkinServerRegionSchema = z.enum(['cn', 'en', 'global'])
export type SkinServerRegion = z.infer<typeof SkinServerRegionSchema>

/**
 * Verifiable status of operator skin pricing.
 * - 'default': default operator form (E0/E1/E2)
 * - 'free': obtained outside store via event, gift, mission, IS, RA
 * - 'unknown': sold in Outfit Store, verified numeric price not yet cataloged
 */
export const SkinPriceStatusSchema = z.enum(['default', 'free', 'unknown'])
export type SkinPriceStatus = z.infer<typeof SkinPriceStatusSchema>

/**
 * Zod schema for an operator skin/outfit in Arknights.
 */
export const SkinSchema = z
  .object({
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
    /** Whether this is a default character appearance (E0/E1/E2) */
    isDefault: z.boolean(),
    /** Numerical cost in OP if known from a verified source, currently null */
    price: z.number().nullable().optional(),
    /** Verifiable price status ('default' | 'free' | 'unknown') */
    priceStatus: SkinPriceStatusSchema,
    /** Verified data source for the price, currently null */
    priceSource: z.string().nullable().optional(),
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
  .refine(
    (skin) =>
      typeof skin.price !== 'number' ||
      (typeof skin.priceSource === 'string' && skin.priceSource.trim().length > 0),
    {
      message: 'A numeric price cannot be assigned without a verified, non-empty priceSource.',
      path: ['priceSource'],
    },
  )

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
