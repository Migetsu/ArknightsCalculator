import { createHash, createHmac, randomUUID } from 'node:crypto'
import { z } from 'zod'
import type { YostarErrorReason } from '../../shared/schemas/yostar'

/**
 * Stateless Arknights Global (Yostar EN) login proxy.
 *
 * Nothing here persists or logs anything: the e-mail, the verification code and
 * every intermediate token live only in locals of a single request and are
 * garbage collected when it ends. Endpoints and headers are verified against
 * public clients; see `docs/yostar-sync.md` for URLs, dates and sources.
 */

/**
 * Public game-client signing constants of the Yostar SDK. They identify the
 * official Android client and are published verbatim by several open-source
 * clients (ArkPRTS `arkprts/auth.py`, `neeia/ak-roster`). They are not account
 * credentials and cannot authenticate anything on their own.
 */
const YOSTAR_PLATFORM_SIGN_KEY = '886c085e4a8d30a703367b120dd8353948405ec2'
const YOSTAR_U8_SIGN_KEY = '91240f70c09a08a6bc72af1a5c8d4670'
const YOSTAR_ANDROID_USER_AGENT =
  'Dalvik/2.1.0 (Linux; U; Android 11; KB2000 Build/RP1A.201005.001)'
const YOSTAR_UNITY_VERSION = '2017.4.39f1'
/** Channel ids: 1 = Hypergryph, 2 = Bilibili, 3 = Yostar. */
const YOSTAR_CHANNEL_ID = '3'
const YOSTAR_NETWORK_VERSION = '1'

export const YOSTAR_ENDPOINTS = {
  /** Serves the `as`/`gs`/`u8`/`hv` server map. Verified 2026-10-21. */
  networkConfig: 'https://ak-conf.arknights.global/config/prod/official/network_config',
  /** Yostar account SDK (send-code / get-auth / user login). Verified 2026-10-21. */
  sdkBase: 'https://en-sdk-api.yostarplat.com',
} as const

/** Per-request upstream timeout. The login chain makes six sequential calls. */
export const YOSTAR_TIMEOUT_MS = 8_000

export const SendCodeInputSchema = z.object({
  email: z.email().max(254),
})

export const LoginInputSchema = z.object({
  email: z.email().max(254),
  code: z.string().regex(/^\d{6}$/),
})

export type SendCodeInput = z.infer<typeof SendCodeInputSchema>
export type LoginInput = z.infer<typeof LoginInputSchema>

/**
 * h3 v1 `readValidatedBody` returns whatever the validator returns, so the
 * validator must unwrap Zod's result itself. Throwing here becomes the usual
 * 400 `Validation Error` response.
 */
export function createBodyValidator<T>(schema: z.ZodType<T>): (raw: unknown) => T {
  return (raw: unknown): T => {
    const parsed = schema.safeParse(raw)
    if (!parsed.success) throw new TypeError('Invalid request body')
    return parsed.data
  }
}

export class YostarError extends Error {
  readonly reason: YostarErrorReason

  constructor(reason: YostarErrorReason) {
    // The message is the reason code only: never an e-mail, a code or a token.
    super(reason)
    this.name = 'YostarError'
    this.reason = reason
  }
}

export interface YostarRequestDeps {
  fetchImpl: typeof fetch
  timeoutMs: number
}

export function createYostarDeps(): YostarRequestDeps {
  return {
    fetchImpl: (input, init) => globalThis.fetch(input, init),
    timeoutMs: YOSTAR_TIMEOUT_MS,
  }
}

/**
 * Feature flag: the proxy answers 404 unless the deployment enables it.
 * `NUXT_PUBLIC_YOSTAR_SYNC_ENABLED=false` disables both the UI and the routes.
 */
export function isYostarSyncEnabled(config: { public?: Record<string, unknown> }): boolean {
  return config.public?.yostarSyncEnabled !== false
}

function isAbortLike(error: unknown): boolean {
  return error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')
}

async function requestJson(
  url: string,
  init: RequestInit,
  deps: YostarRequestDeps,
): Promise<unknown> {
  let response: Response
  try {
    response = await deps.fetchImpl(url, {
      ...init,
      signal: AbortSignal.timeout(deps.timeoutMs),
    })
  } catch (error) {
    throw new YostarError(isAbortLike(error) ? 'timeout' : 'unavailable')
  }

  if (response.status === 429) throw new YostarError('rate_limited')
  if (!response.ok) throw new YostarError('unavailable')

  try {
    return await response.json()
  } catch {
    throw new YostarError('invalid_payload')
  }
}

const YostarplatEnvelopeSchema = z.object({
  Code: z.number(),
  Msg: z.string().optional(),
  Data: z.unknown().optional(),
})

type YostarplatEnvelope = z.infer<typeof YostarplatEnvelopeSchema>

function signYostarplatHeaders(body: string): string {
  const head = {
    PID: 'US-ARKNIGHTS',
    Channel: 'googleplay',
    Platform: 'android',
    Version: '4.10.0',
    GVersionNo: '2000112',
    GBuildNo: '',
    Lang: 'en',
    DeviceID: randomUUID(),
    DeviceModel: 'F9',
    UID: '',
    Token: '',
    Time: Math.floor(Date.now() / 1000),
  }
  const headJson = JSON.stringify(head)
  const sign = createHash('md5')
    .update(headJson + body + YOSTAR_PLATFORM_SIGN_KEY)
    .digest('hex')
    .toUpperCase()

  return JSON.stringify({ Head: head, Sign: sign })
}

async function postYostarplat(
  endpoint: string,
  payload: Record<string, unknown>,
  deps: YostarRequestDeps,
): Promise<YostarplatEnvelope> {
  const body = JSON.stringify(payload)
  const data = await requestJson(
    YOSTAR_ENDPOINTS.sdkBase + endpoint,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': YOSTAR_ANDROID_USER_AGENT,
        Authorization: signYostarplatHeaders(body),
      },
      body,
    },
    deps,
  )

  const parsed = YostarplatEnvelopeSchema.safeParse(data)
  if (!parsed.success) throw new YostarError('invalid_payload')
  return parsed.data
}

const SEND_CODE_ERRORS: Record<number, YostarErrorReason> = {
  100400: 'invalid_email',
  100429: 'rate_limited',
}

const CODE_AUTH_ERRORS: Record<number, YostarErrorReason> = {
  100303: 'invalid_code',
  100302: 'invalid_code',
}

const TOKEN_EXCHANGE_ERRORS: Record<number, YostarErrorReason> = {
  100190: 'invalid_code',
}

function yostarplatFailure(
  envelope: YostarplatEnvelope,
  known: Record<number, YostarErrorReason>,
): YostarError {
  return new YostarError(known[envelope.Code] ?? 'unavailable')
}

/**
 * Requests a 6-digit e-mail code. Returns nothing: the code itself is generated
 * by Yostar and only ever reaches the player's inbox.
 */
export async function requestYostarEmailCode(
  email: string,
  deps: YostarRequestDeps = createYostarDeps(),
): Promise<void> {
  const envelope = await postYostarplat(
    '/yostar/send-code',
    { Account: email, Randstr: '', Ticket: '' },
    deps,
  )
  if (envelope.Code !== 200) throw yostarplatFailure(envelope, SEND_CODE_ERRORS)
}

async function submitEmailCode(
  email: string,
  code: string,
  deps: YostarRequestDeps,
): Promise<string> {
  const envelope = await postYostarplat('/yostar/get-auth', { Account: email, Code: code }, deps)
  if (envelope.Code !== 200) throw yostarplatFailure(envelope, CODE_AUTH_ERRORS)

  const data = z.object({ Token: z.string().min(1) }).safeParse(envelope.Data)
  if (!data.success) throw new YostarError('invalid_payload')
  return data.data.Token
}

async function exchangeYostarToken(
  email: string,
  emailToken: string,
  deps: YostarRequestDeps,
): Promise<{ uid: string; token: string }> {
  const envelope = await postYostarplat(
    '/user/login',
    {
      CheckAccount: 0,
      Geetest: {
        CaptchaID: null,
        CaptchaOutput: null,
        GenTime: null,
        LotNumber: null,
        PassToken: null,
      },
      OpenID: email,
      Secret: '',
      Token: emailToken,
      Type: 'yostar',
      UserName: email,
    },
    deps,
  )
  if (envelope.Code !== 200) throw yostarplatFailure(envelope, TOKEN_EXCHANGE_ERRORS)

  const data = z
    .object({ UserInfo: z.object({ ID: z.string().min(1), Token: z.string().min(1) }) })
    .safeParse(envelope.Data)
  if (!data.success) throw new YostarError('invalid_payload')
  return { uid: data.data.UserInfo.ID, token: data.data.UserInfo.Token }
}

interface YostarServerMap {
  gs: string
  u8: string
  hv: string
}

const ServerMapSchema = z.object({
  gs: z.string().startsWith('https://'),
  u8: z.string().startsWith('https://'),
  hv: z.string().startsWith('https://'),
})

const NetworkConfigSchema = z.object({
  funcVer: z.string().min(1),
  configs: z.record(z.string(), z.object({ network: ServerMapSchema })),
})

async function loadServerMap(deps: YostarRequestDeps): Promise<YostarServerMap> {
  const raw = await requestJson(
    YOSTAR_ENDPOINTS.networkConfig,
    { headers: { 'User-Agent': YOSTAR_ANDROID_USER_AGENT } },
    deps,
  )
  const envelope = z.object({ content: z.string() }).safeParse(raw)
  if (!envelope.success) throw new YostarError('invalid_payload')

  let content: unknown
  try {
    content = JSON.parse(envelope.data.content)
  } catch {
    throw new YostarError('invalid_payload')
  }

  const parsed = NetworkConfigSchema.safeParse(content)
  if (!parsed.success) throw new YostarError('invalid_payload')
  const current = parsed.data.configs[parsed.data.funcVer]
  if (!current) throw new YostarError('invalid_payload')
  return current.network
}

const ClientVersionSchema = z.object({
  resVersion: z.string().min(1),
  clientVersion: z.string().min(1),
})

async function loadClientVersion(
  hvUrlTemplate: string,
  deps: YostarRequestDeps,
): Promise<{ resVersion: string; clientVersion: string }> {
  // `hv` is a template: `.../{0}/version`, with the platform name substituted.
  const url = hvUrlTemplate.replace('{0}', 'Android')
  const raw = await requestJson(url, { headers: { 'User-Agent': YOSTAR_ANDROID_USER_AGENT } }, deps)
  const parsed = ClientVersionSchema.safeParse(raw)
  if (!parsed.success) throw new YostarError('invalid_payload')
  return parsed.data
}

function createDeviceIds(): { deviceId: string; deviceId2: string; deviceId3: string } {
  const digits = Array.from({ length: 13 }, () => Math.floor(Math.random() * 10)).join('')
  return { deviceId: randomUUID(), deviceId2: `86${digits}`, deviceId3: randomUUID() }
}

function signU8Body(body: Record<string, string | number>): string {
  const sorted = Object.keys(body)
    .sort()
    .map((key) => [key, String(body[key])] as const)
  const query = new URLSearchParams(sorted.map(([key, value]) => [key, value])).toString()
  return createHmac('sha1', YOSTAR_U8_SIGN_KEY).update(query).digest('hex').toLowerCase()
}

const U8TokenSchema = z.object({
  result: z.number(),
  uid: z.string().min(1),
  token: z.string().min(1),
})

async function loadU8Token(
  account: { uid: string; token: string },
  u8BaseUrl: string,
  deviceIds: { deviceId: string; deviceId2: string; deviceId3: string },
  deps: YostarRequestDeps,
): Promise<{ uid: string; token: string }> {
  const body: Record<string, string | number> = {
    appId: '1',
    platform: 1,
    channelId: YOSTAR_CHANNEL_ID,
    subChannel: YOSTAR_CHANNEL_ID,
    extension: JSON.stringify({ type: 1, uid: account.uid, token: account.token }),
    worldId: YOSTAR_CHANNEL_ID,
    deviceId: deviceIds.deviceId,
    deviceId2: deviceIds.deviceId2,
    deviceId3: deviceIds.deviceId3,
  }
  body.sign = signU8Body(body)

  const raw = await requestJson(
    `${u8BaseUrl}/user/v1/getToken`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': YOSTAR_ANDROID_USER_AGENT,
        'X-Unity-Version': YOSTAR_UNITY_VERSION,
      },
      body: JSON.stringify(body),
    },
    deps,
  )

  const parsed = U8TokenSchema.safeParse(raw)
  if (!parsed.success) throw new YostarError('invalid_payload')
  if (parsed.data.result !== 0) throw new YostarError('invalid_code')
  return { uid: parsed.data.uid, token: parsed.data.token }
}

const LoginSecretSchema = z.object({
  result: z.number(),
  uid: z.string().min(1),
  secret: z.string().min(1),
})

async function loadLoginSecret(
  u8Token: { uid: string; token: string },
  gsBaseUrl: string,
  version: { resVersion: string; clientVersion: string },
  deviceIds: { deviceId: string; deviceId2: string; deviceId3: string },
  deps: YostarRequestDeps,
): Promise<{ uid: string; secret: string }> {
  const body = {
    platform: 1,
    networkVersion: YOSTAR_NETWORK_VERSION,
    assetsVersion: version.resVersion,
    clientVersion: version.clientVersion,
    token: u8Token.token,
    uid: u8Token.uid,
    deviceId: deviceIds.deviceId,
    deviceId2: deviceIds.deviceId2,
    deviceId3: deviceIds.deviceId3,
  }

  const raw = await requestJson(
    `${gsBaseUrl}/account/login`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': YOSTAR_ANDROID_USER_AGENT,
        'X-Unity-Version': YOSTAR_UNITY_VERSION,
        secret: '',
        seqnum: '1',
        uid: u8Token.uid,
      },
      body: JSON.stringify(body),
    },
    deps,
  )

  const parsed = LoginSecretSchema.safeParse(raw)
  if (!parsed.success) throw new YostarError('invalid_payload')
  if (parsed.data.result !== 0) throw new YostarError('unavailable')
  return { uid: parsed.data.uid, secret: parsed.data.secret }
}

const SyncDataSchema = z.object({
  result: z.number(),
  user: z.unknown(),
})

async function loadSyncData(
  session: { uid: string; secret: string },
  gsBaseUrl: string,
  deps: YostarRequestDeps,
): Promise<unknown> {
  const raw = await requestJson(
    `${gsBaseUrl}/account/syncData`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': YOSTAR_ANDROID_USER_AGENT,
        'X-Unity-Version': YOSTAR_UNITY_VERSION,
        secret: session.secret,
        seqnum: '2',
        uid: session.uid,
      },
      body: JSON.stringify({ platform: 1 }),
    },
    deps,
  )

  const parsed = SyncDataSchema.safeParse(raw)
  if (!parsed.success) throw new YostarError('invalid_payload')
  if (parsed.data.result !== 0) throw new YostarError('unavailable')
  return parsed.data.user
}

/**
 * Full stateless login chain: e-mail code -> Yostar token -> u8 token ->
 * session secret -> `syncData.user`. The intermediate tokens never leave this
 * function.
 */
export async function fetchYostarSyncUser(
  email: string,
  code: string,
  deps: YostarRequestDeps = createYostarDeps(),
): Promise<unknown> {
  const emailToken = await submitEmailCode(email, code, deps)
  const account = await exchangeYostarToken(email, emailToken, deps)
  const serverMap = await loadServerMap(deps)
  const version = await loadClientVersion(serverMap.hv, deps)
  const deviceIds = createDeviceIds()
  const u8Token = await loadU8Token(account, serverMap.u8, deviceIds, deps)
  const session = await loadLoginSecret(u8Token, serverMap.gs, version, deviceIds, deps)
  return loadSyncData(session, serverMap.gs, deps)
}

/** Maps a failure reason to the HTTP status the routes return. */
export function yostarHttpStatus(reason: YostarErrorReason): number {
  switch (reason) {
    case 'invalid_email':
    case 'invalid_code':
      return 400
    case 'rate_limited':
      return 429
    case 'timeout':
      return 504
    case 'disabled':
      return 404
    default:
      return 502
  }
}
