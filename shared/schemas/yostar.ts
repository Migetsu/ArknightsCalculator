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
  'invalid_session',
  'rate_limited',
  'timeout',
  'unavailable',
  'invalid_payload',
  'disabled',
] as const
export const YostarErrorReasonSchema = z.enum(YOSTAR_ERROR_REASONS)
export type YostarErrorReason = z.infer<typeof YostarErrorReasonSchema>

/**
 * Long-lived Yostar account token the client keeps on the device.
 *
 * Owner decision (2026-10-21): stored in `localStorage` under a namespaced key so
 * a repeat sync does not ask for e-mail and code again. It never goes to Supabase
 * or any server storage; the Nitro proxy stays stateless. The UI must warn that
 * the token lives on this device.
 */
export const YostarSessionSchema = z.object({
  /** Yostar channel uid, the account half of the credential. */
  uid: z.string().min(1).max(128),
  /** Yostar account token. Never logged. */
  token: z.string().min(1).max(512),
  /** ISO timestamp after which the client must forget the token. */
  expiresAt: z.string(),
})
export type YostarSession = z.infer<typeof YostarSessionSchema>

/** localStorage key for {@link YostarSession}. */
export const YOSTAR_SESSION_STORAGE_KEY = 'arkcalc_yostar_session'

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
 * Sanitized payload returned by `/api/yostar/login` and `/api/yostar/sync` and
 * imported on the client. Contains no e-mail and no token.
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

/**
 * `/api/yostar/login` response: the import payload plus the account token the
 * client stores on the device. `/api/yostar/sync` returns the payload only.
 */
export const YostarLoginResponseSchema = YostarSyncPayloadSchema.extend({
  session: YostarSessionSchema,
})
export type YostarLoginResponse = z.infer<typeof YostarLoginResponseSchema>
