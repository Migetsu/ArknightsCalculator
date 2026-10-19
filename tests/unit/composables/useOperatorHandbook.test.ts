import { describe, it, expect, beforeEach } from 'vitest'
import {
  fetchOperatorHandbook,
  useOperatorHandbook,
  clearHandbookCache,
} from '~/composables/useOperatorHandbook'

describe('useOperatorHandbook composable', () => {
  beforeEach(() => {
    clearHandbookCache()
  })

  it('fetches valid operator handbook by charId', async () => {
    const handbook = await fetchOperatorHandbook('char_002_amiya')
    expect(handbook).not.toBeNull()
    expect(handbook?.charId).toBe('char_002_amiya')
    expect(handbook?.profile.allFields.length).toBeGreaterThan(0)
    expect(handbook?.physicalExam.allFields.length).toBeGreaterThan(0)
    expect(handbook?.stories.length).toBeGreaterThan(0)
  })

  it('reuses in-memory cached instance on repeat calls', async () => {
    const first = await fetchOperatorHandbook('char_003_kalts')
    const second = await fetchOperatorHandbook('char_003_kalts')
    expect(first).toBe(second) // exact object reference identity from Map cache
  })

  it('returns null gracefully for missing handbook files (Amiya patch forms)', async () => {
    const guardAmiya = await fetchOperatorHandbook('char_1001_amiya2')
    expect(guardAmiya).toBeNull()

    const medicAmiya = await fetchOperatorHandbook('char_1037_amiya3')
    expect(medicAmiya).toBeNull()
  })

  it('returns null for empty, invalid, or undefined charId', async () => {
    expect(await fetchOperatorHandbook('')).toBeNull()
    // @ts-expect-error test invalid input types
    expect(await fetchOperatorHandbook(null)).toBeNull()
    // @ts-expect-error test invalid input types
    expect(await fetchOperatorHandbook(undefined)).toBeNull()
    expect(await fetchOperatorHandbook('non_existent_char_id_99999')).toBeNull()
  })

  it('useOperatorHandbook reactive composable resolves data with useAsyncData', async () => {
    const asyncData = useOperatorHandbook('char_002_amiya')
    await asyncData
    expect(asyncData.status.value).toBe('success')
    expect(asyncData.data.value?.charId).toBe('char_002_amiya')
  })
})
