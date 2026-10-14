import { describe, expect, it } from 'vitest'
import {
  encodeShareCode,
  decodeShareCode,
  MAX_SHARE_CODE_LENGTH,
  bytesToBase64Url,
  base64UrlToBytes,
} from '../../../../shared/utils/planner/shareCode'
import type { PlanItem } from '../../../../app/schemas/planner'

describe('shareCode (shared/utils/planner/shareCode.ts)', () => {
  const samplePlan: PlanItem = {
    id: 'test-plan-1',
    operatorId: 'char_172_svrash',
    current: {
      elite: 0,
      level: 1,
      skillLevel: 1,
      skills: {},
      modules: {},
    },
    target: {
      elite: 2,
      level: 90,
      skillLevel: 7,
      skills: { skchr_svrash_3: 3 },
      modules: { uniequip_002_svrash: 3 },
    },
    priority: 1,
    note: 'Priority 6-star guard',
    createdAt: '2026-10-14T10:00:00.000Z',
  }

  it('performs complete round-trip encoding and decoding', async () => {
    const code = await encodeShareCode({ plans: [samplePlan] })

    expect(typeof code).toBe('string')
    expect(code.length).toBeGreaterThan(10)
    expect(code.length).toBeLessThan(MAX_SHARE_CODE_LENGTH)

    const result = await decodeShareCode(code)
    expect(result.success).toBe(true)

    if (result.success) {
      expect(result.payload.schemaVersion).toBe(1)
      expect(result.payload.plans).toHaveLength(1)
      expect(result.payload.plans[0]!.operatorId).toBe('char_172_svrash')
      expect(result.payload.plans[0]!.target.elite).toBe(2)
      expect(result.payload.plans[0]!.target.level).toBe(90)
      expect(result.payload.plans[0]!.target.skills['skchr_svrash_3']).toBe(3)
    }
  })

  it('detects checksum mismatch when payload is tampered', async () => {
    const code = await encodeShareCode({ plans: [samplePlan] })
    const bytes = base64UrlToBytes(code)

    // Tamper with one of the compressed payload bytes after header
    if (bytes.length > 8) {
      bytes[7] = bytes[7]! ^ 0xff
    }

    const tamperedCode = bytesToBase64Url(bytes)
    const result = await decodeShareCode(tamperedCode)

    expect(result.success).toBe(false)
    if (!result.success) {
      // Tampering may fail during decompression or checksum verification
      expect(['checksum_mismatch', 'invalid_format']).toContain(result.error)
    }
  })

  it('rejects unsupported header version', async () => {
    const code = await encodeShareCode({ plans: [samplePlan] })
    const bytes = base64UrlToBytes(code)

    // Set header version byte to 99
    bytes[0] = 99

    const unsupportedCode = bytesToBase64Url(bytes)
    const result = await decodeShareCode(unsupportedCode)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('unsupported_version')
    }
  })

  it('rejects empty, invalid base64, or corrupted strings', async () => {
    const emptyResult = await decodeShareCode('')
    expect(emptyResult.success).toBe(false)
    if (!emptyResult.success) {
      expect(emptyResult.error).toBe('invalid_format')
    }

    const shortResult = await decodeShareCode('abc')
    expect(shortResult.success).toBe(false)
    if (!shortResult.success) {
      expect(shortResult.error).toBe('invalid_format')
    }
  })

  it('rejects share codes that exceed MAX_SHARE_CODE_LENGTH', async () => {
    const tooLongCode = 'A'.repeat(MAX_SHARE_CODE_LENGTH + 1)
    const result = await decodeShareCode(tooLongCode)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('too_long')
    }
  })
})
