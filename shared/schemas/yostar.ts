import { z } from 'zod'

/**
 * Arknights Global (Yostar EN) account sync contract.
 *
 * Only the subset the app consumes is declared here. The upstream `syncData`
 * response carries dozens of unrelated fields; everything outside these schemas
 * is dropped at the Nitro boundary so it can never reach the browser.
 *
 * Endpoints, headers and the verification date are documented in
 * `docs/yostar-sync.md`.
 */

/** Servers this build can log into. JP/KR use the same protocol but are unverified. */
export const YOSTAR_SERVERS = ['en'] as const
export type YostarServer = (typeof YOSTAR_SERVERS)[number]

/** Client-visible failure reasons; mapped to HTTP statuses by the Nitro routes. */
export const YOSTAR_ERROR_REASONS = [
  'invalid_email',
  'invalid_code',
  'rate_limited',
  'timeout',
  'unavailable',
  'invalid_payload',
  'disabled',
] as const
export const YostarErrorReasonSchema = z.enum(YOSTAR_ERROR_REASONS)
export type YostarErrorReason = z.infer<typeof YostarErrorReasonSchema>

/** One owned operator, already normalized to planner-compatible units. */
export const YostarOperatorSchema = z.object({
  charId: z.string().min(1),
  /** Elite phase, 0..2. */
  elite: z.number().int().min(0).max(2),
  /** Current level inside the elite phase, 1..90. */
  level: z.number().int().min(1).max(90),
  /** Skill rank, 1..7 (mastery is stored per skill). */
  skillLevel: z.number().int().min(1).max(7),
  potential: z.number().int().min(0).max(5),
  favor: z.number().int().min(0),
  /** skillId -> mastery 0..3, only for unlocked skills. */
  skills: z.record(z.string(), z.number().int().min(0).max(3)),
  /** moduleId -> unlocked stage 1..3, only for unlocked modules. */
  modules: z.record(z.string(), z.number().int().min(1).max(3)),
})
export type YostarOperator = z.infer<typeof YostarOperatorSchema>

export const YostarDoctorSchema = z.object({
  name: z.string().max(64),
  level: z.number().int().min(1),
  server: z.literal('en'),
})
export type YostarDoctor = z.infer<typeof YostarDoctorSchema>

export const YostarCurrenciesSchema = z.object({
  lmd: z.number().int().min(0),
  orundum: z.number().int().min(0),
  originitePrime: z.number().int().min(0),
})
export type YostarCurrencies = z.infer<typeof YostarCurrenciesSchema>

/**
 * Sanitized payload returned by `/api/yostar/login` and imported on the client.
 * Contains no account identifiers, no tokens and no e-mail.
 */
export const YostarSyncPayloadSchema = z.object({
  doctor: YostarDoctorSchema,
  operators: z.array(YostarOperatorSchema),
  depot: z.object({
    currencies: YostarCurrenciesSchema,
    /** itemId -> count, currency pseudo-items (4001/4002/4003) excluded. */
    items: z.record(z.string(), z.number().int().min(1)),
  }),
  /** Operator ids the game returned but this build's catalog does not know. */
  unknownOperatorIds: z.array(z.string()),
  /** Number of inventory entries skipped because the catalog does not know them. */
  unknownItemCount: z.number().int().min(0),
  /** Entries dropped because their shape did not match the expected schema. */
  skippedEntries: z.number().int().min(0),
  syncedAt: z.string(),
})
export type YostarSyncPayload = z.infer<typeof YostarSyncPayloadSchema>
