import { z } from 'zod'
import { PlanItemSchema, CURRENT_PLANNER_SCHEMA_VERSION, type PlanItem } from './types'

export const MAX_SHARE_CODE_LENGTH = 8192
export const SHARE_CODE_VERSION = 1

/**
 * Zod schema for shared plan payload.
 */
export const SharedPlansPayloadSchema = z.object({
  schemaVersion: z.literal(CURRENT_PLANNER_SCHEMA_VERSION),
  plans: z.array(PlanItemSchema).min(1),
})

export type SharedPlansPayload = z.infer<typeof SharedPlansPayloadSchema>

// CRC-32 Lookup Table (IEEE 802.3)
const CRC_TABLE = new Uint32Array(256)
for (let i = 0; i < 256; i++) {
  let c = i
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  }
  CRC_TABLE[i] = c >>> 0
}

export function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff
  for (let i = 0; i < bytes.length; i++) {
    const byte = bytes[i]!
    const tableIndex = (crc ^ byte) & 0xff
    crc = (crc >>> 8) ^ CRC_TABLE[tableIndex]!
  }
  return (crc ^ 0xffffffff) >>> 0
}

export function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!)
  }
  const base64 = btoa(binary)
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function base64UrlToBytes(str: string): Uint8Array {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/')
  while (base64.length % 4 !== 0) {
    base64 += '='
  }
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

export async function compressBytes(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Response(bytes as unknown as BodyInit).body!.pipeThrough(
    new CompressionStream('deflate-raw'),
  )
  const buffer = await new Response(stream).arrayBuffer()
  return new Uint8Array(buffer)
}

export async function decompressBytes(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Response(bytes as unknown as BodyInit).body!.pipeThrough(
    new DecompressionStream('deflate-raw'),
  )
  const buffer = await new Response(stream).arrayBuffer()
  return new Uint8Array(buffer)
}

export interface EncodeShareCodeOptions {
  plans: PlanItem[]
}

/**
 * Encodes planner items into a compressed, checksum-verified base64url string.
 * Format:
 * [1 byte]: Code format version (0x01)
 * [4 bytes]: Big-endian CRC32 checksum of the uncompressed JSON bytes
 * [remaining bytes]: Deflate-raw compressed payload
 */
export async function encodeShareCode(options: EncodeShareCodeOptions): Promise<string> {
  const payload: SharedPlansPayload = {
    schemaVersion: CURRENT_PLANNER_SCHEMA_VERSION,
    plans: options.plans,
  }

  const jsonStr = JSON.stringify(payload)
  const uncompressedBytes = new TextEncoder().encode(jsonStr)
  const checksum = crc32(uncompressedBytes)

  const compressed = await compressBytes(uncompressedBytes)

  // Header: 1 byte version + 4 bytes CRC32
  const combined = new Uint8Array(1 + 4 + compressed.length)
  combined[0] = SHARE_CODE_VERSION
  combined[1] = (checksum >>> 24) & 0xff
  combined[2] = (checksum >>> 16) & 0xff
  combined[3] = (checksum >>> 8) & 0xff
  combined[4] = checksum & 0xff
  combined.set(compressed, 5)

  const code = bytesToBase64Url(combined)
  if (code.length > MAX_SHARE_CODE_LENGTH) {
    throw new Error(
      `Share code length (${code.length}) exceeds maximum limit (${MAX_SHARE_CODE_LENGTH})`,
    )
  }

  return code
}

export type DecodeShareCodeResult =
  | { success: true; payload: SharedPlansPayload }
  | {
      success: false
      error:
        'too_long' | 'invalid_format' | 'checksum_mismatch' | 'unsupported_version' | 'schema_error'
      message: string
    }

/**
 * Decodes and validates a compressed share code.
 */
export async function decodeShareCode(code: string): Promise<DecodeShareCodeResult> {
  const trimmed = code.trim()
  if (!trimmed) {
    return { success: false, error: 'invalid_format', message: 'Share code is empty' }
  }

  if (trimmed.length > MAX_SHARE_CODE_LENGTH) {
    return {
      success: false,
      error: 'too_long',
      message: `Share code exceeds limit of ${MAX_SHARE_CODE_LENGTH} characters`,
    }
  }

  let bytes: Uint8Array
  try {
    bytes = base64UrlToBytes(trimmed)
  } catch {
    return { success: false, error: 'invalid_format', message: 'Invalid base64url string' }
  }

  if (bytes.length < 5) {
    return {
      success: false,
      error: 'invalid_format',
      message: 'Code payload too short for header',
    }
  }

  const version = bytes[0]
  if (version !== SHARE_CODE_VERSION) {
    return {
      success: false,
      error: 'unsupported_version',
      message: `Unsupported share code version: ${version}`,
    }
  }

  const expectedCrc = ((bytes[1]! << 24) | (bytes[2]! << 16) | (bytes[3]! << 8) | bytes[4]!) >>> 0

  const compressedData = bytes.subarray(5)
  let decompressed: Uint8Array

  try {
    decompressed = await decompressBytes(compressedData)
  } catch {
    return {
      success: false,
      error: 'invalid_format',
      message: 'Failed to decompress share payload',
    }
  }

  const actualCrc = crc32(decompressed)
  if (actualCrc !== expectedCrc) {
    return {
      success: false,
      error: 'checksum_mismatch',
      message: `Checksum mismatch: expected ${expectedCrc}, got ${actualCrc}`,
    }
  }

  let json: unknown
  try {
    const text = new TextDecoder().decode(decompressed)
    json = JSON.parse(text)
  } catch {
    return { success: false, error: 'invalid_format', message: 'Payload is not valid JSON' }
  }

  const parsed = SharedPlansPayloadSchema.safeParse(json)
  if (!parsed.success) {
    return {
      success: false,
      error: 'schema_error',
      message: parsed.error.issues.map((i) => i.message).join('; '),
    }
  }

  return {
    success: true,
    payload: parsed.data,
  }
}
