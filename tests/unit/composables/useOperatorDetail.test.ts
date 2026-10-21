import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref } from 'vue'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { fetchOperatorDetail, useOperatorDetail } from '~/composables/useOperatorDetail'
import { readOperatorDataFixture } from '../support/operatorDataFixture'

const mockRequestFetch = vi.fn()

mockNuxtImport('useRequestFetch', () => () => mockRequestFetch)

describe('useOperatorDetail composable', () => {
  beforeEach(() => {
    mockRequestFetch.mockReset()
    mockRequestFetch.mockImplementation((url: string) => readOperatorDataFixture(url))
  })

  it('fetches real operator detail by id through the data endpoint', async () => {
    const detail = await fetchOperatorDetail('char_172_svrash', mockRequestFetch)
    expect(detail).not.toBeNull()
    expect(detail?.id).toBe('char_172_svrash')
    expect(detail?.name.en).toBe('SilverAsh')
    expect(detail?.rarity).toBe(6)
    expect(detail?.phases.length).toBeGreaterThan(0)
    expect(detail?.skills.length).toBeGreaterThan(0)
    expect(mockRequestFetch).toHaveBeenCalledWith('/api/operators/char_172_svrash')
  })

  it('returns null for a non-existent operator', async () => {
    expect(await fetchOperatorDetail('non_existent_operator_xyz', mockRequestFetch)).toBeNull()
    expect(mockRequestFetch).toHaveBeenCalledWith('/api/operators/non_existent_operator_xyz')
  })

  it('returns null for empty or unsafe ids without a request', async () => {
    expect(await fetchOperatorDetail('', mockRequestFetch)).toBeNull()
    // @ts-expect-error test invalid input types
    expect(await fetchOperatorDetail(null)).toBeNull()
    // @ts-expect-error test invalid input types
    expect(await fetchOperatorDetail(undefined)).toBeNull()
    expect(
      await fetchOperatorDetail('../../data/operators/char_002_amiya', mockRequestFetch),
    ).toBeNull()
    expect(await fetchOperatorDetail('char_002_amiya?x=1', mockRequestFetch)).toBeNull()
    expect(mockRequestFetch).not.toHaveBeenCalled()
  })

  it('trims surrounding whitespace before requesting', async () => {
    const detail = await fetchOperatorDetail('  char_002_amiya  ', mockRequestFetch)
    expect(detail?.id).toBe('char_002_amiya')
    expect(mockRequestFetch).toHaveBeenCalledWith('/api/operators/char_002_amiya')
  })

  it('useOperatorDetail reactive composable resolves data with useAsyncData', async () => {
    const id = ref('char_002_amiya')
    const asyncData = useOperatorDetail(id)
    await asyncData
    expect(asyncData.status.value).toBe('success')
    expect(asyncData.data.value?.id).toBe('char_002_amiya')
  })
})
