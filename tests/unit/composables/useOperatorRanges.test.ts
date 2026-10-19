import { describe, it, expect } from 'vitest'
import { fetchRange, fetchRanges, useRange } from '~/composables/useOperatorRanges'

describe('useOperatorRanges composable', () => {
  it('useRange composable resolves data', async () => {
    const asyncData = useRange('3-6')
    await asyncData
    expect(asyncData.status.value).toBe('success')
    expect(asyncData.data.value?.id).toBe('3-6')
  })

  it('fetches valid range entry by id', async () => {
    const entry = await fetchRange('3-6')
    expect(entry).not.toBeNull()
    expect(entry?.id).toBe('3-6')
    expect(entry?.rows).toBe(3)
    expect(entry?.cols).toBe(3)
    expect(entry?.anchor).toEqual({ row: 1, col: 0 })
    expect(entry?.matrix.length).toBe(3)
  })

  it('fetches Besieger dead-zone range 4-3', async () => {
    const entry = await fetchRange('4-3')
    expect(entry).not.toBeNull()
    expect(entry?.id).toBe('4-3')
    expect(entry?.rows).toBe(5)
    expect(entry?.cols).toBe(5)
    expect(entry?.anchor).toEqual({ row: 2, col: 0 })
    // Anchor cell itself is a dead zone (0)
    expect(entry?.matrix[2]?.[0]).toBe(0)
  })

  it('returns null for non-existent or empty range id', async () => {
    expect(await fetchRange('non-existent-range-id-999')).toBeNull()
    expect(await fetchRange('')).toBeNull()
    expect(await fetchRange(null)).toBeNull()
    expect(await fetchRange(undefined)).toBeNull()
  })

  it('fetches multiple ranges via fetchRanges', async () => {
    const dict = await fetchRanges(['3-6', '0-1', 'invalid-id'])
    expect(dict['3-6']).toBeDefined()
    expect(dict['0-1']).toBeDefined()
    expect(dict['3-6']?.id).toBe('3-6')
    expect(dict['0-1']?.id).toBe('0-1')
    expect(dict['invalid-id']).toBeUndefined()
  })
})
