import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import {
  fetchOperatorHandbook,
  useOperatorHandbook,
  clearHandbookCache,
} from '~/composables/useOperatorHandbook'
import { readOperatorDataFixture } from '../support/operatorDataFixture'

const mockRequestFetch = vi.fn()

mockNuxtImport('useRequestFetch', () => () => mockRequestFetch)

describe('useOperatorHandbook composable', () => {
  beforeEach(() => {
    clearHandbookCache()
    mockRequestFetch.mockReset()
    mockRequestFetch.mockImplementation((url: string) => readOperatorDataFixture(url))
  })

  it('fetches valid operator handbook by charId', async () => {
    const handbook = await fetchOperatorHandbook('char_002_amiya', mockRequestFetch)
    expect(handbook).not.toBeNull()
    expect(handbook?.charId).toBe('char_002_amiya')
    expect(handbook?.profile.allFields.length).toBeGreaterThan(0)
    expect(handbook?.physicalExam.allFields.length).toBeGreaterThan(0)
    expect(handbook?.stories.length).toBeGreaterThan(0)
    expect(mockRequestFetch).toHaveBeenCalledWith('/api/handbook/char_002_amiya')
  })

  it('reuses the in-memory cached instance on repeat calls', async () => {
    const first = await fetchOperatorHandbook('char_003_kalts', mockRequestFetch)
    const second = await fetchOperatorHandbook('char_003_kalts', mockRequestFetch)
    expect(first).not.toBeNull()
    expect(first).toBe(second) // exact object reference identity from Map cache
    expect(mockRequestFetch).toHaveBeenCalledTimes(1)
  })

  it('returns null gracefully for missing handbook entries (Amiya patch forms)', async () => {
    const guardAmiya = await fetchOperatorHandbook('char_1001_amiya2', mockRequestFetch)
    expect(guardAmiya).toBeNull()

    const medicAmiya = await fetchOperatorHandbook('char_1037_amiya3', mockRequestFetch)
    expect(medicAmiya).toBeNull()

    expect(mockRequestFetch).toHaveBeenCalledWith('/api/handbook/char_1001_amiya2')
    expect(mockRequestFetch).toHaveBeenCalledWith('/api/handbook/char_1037_amiya3')
  })

  it('returns null for empty or invalid charId without a request', async () => {
    expect(await fetchOperatorHandbook('', mockRequestFetch)).toBeNull()
    // @ts-expect-error test invalid input types
    expect(await fetchOperatorHandbook(null)).toBeNull()
    // @ts-expect-error test invalid input types
    expect(await fetchOperatorHandbook(undefined)).toBeNull()
    expect(await fetchOperatorHandbook('../char_002_amiya', mockRequestFetch)).toBeNull()
    expect(mockRequestFetch).not.toHaveBeenCalled()
  })

  it('returns null for a well-formed but unknown charId', async () => {
    expect(await fetchOperatorHandbook('non_existent_char_id_99999', mockRequestFetch)).toBeNull()
    expect(mockRequestFetch).toHaveBeenCalledWith('/api/handbook/non_existent_char_id_99999')
  })

  it('useOperatorHandbook reactive composable resolves data with useAsyncData', async () => {
    const asyncData = useOperatorHandbook('char_002_amiya')
    await asyncData
    expect(asyncData.status.value).toBe('success')
    expect(asyncData.data.value?.charId).toBe('char_002_amiya')
  })
})
