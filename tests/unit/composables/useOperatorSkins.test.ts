import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref } from 'vue'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { fetchOperatorSkins, useOperatorSkins } from '~/composables/useOperatorSkins'
import skinsDataset from '../../../data/skins.json'
import type { Skin } from '../../../shared/schemas/skin'

const mockRequestFetch = vi.fn()

mockNuxtImport('useRequestFetch', () => () => mockRequestFetch)

const skins = skinsDataset as unknown as Skin[]

describe('useOperatorSkins composable', () => {
  beforeEach(() => {
    mockRequestFetch.mockReset()
    mockRequestFetch.mockImplementation(async (url: string) => {
      const charId = url.replace('/api/skins/', '')
      return skins.filter((skin) => skin.charId === charId)
    })
  })

  it('fetches only the requested operator skins through the data endpoint', async () => {
    const silverAsh = await fetchOperatorSkins('char_172_svrash', mockRequestFetch)

    expect(mockRequestFetch).toHaveBeenCalledWith('/api/skins/char_172_svrash')
    expect(silverAsh.length).toBe(5)
    expect(silverAsh.every((skin) => skin.charId === 'char_172_svrash')).toBe(true)
  })

  it('returns an empty list for an operator without outfits', async () => {
    expect(await fetchOperatorSkins('char_999_unknown', mockRequestFetch)).toEqual([])
  })

  it('returns an empty list without a request for empty or unsafe ids', async () => {
    expect(await fetchOperatorSkins('', mockRequestFetch)).toEqual([])
    // @ts-expect-error test invalid input types
    expect(await fetchOperatorSkins(null)).toEqual([])
    expect(await fetchOperatorSkins('../../data/skins', mockRequestFetch)).toEqual([])
    expect(await fetchOperatorSkins('char_002_amiya?x=1', mockRequestFetch)).toEqual([])
    expect(mockRequestFetch).not.toHaveBeenCalled()
  })

  it('returns an empty list instead of throwing when the request fails', async () => {
    mockRequestFetch.mockRejectedValueOnce(new Error('404'))
    expect(await fetchOperatorSkins('char_002_amiya', mockRequestFetch)).toEqual([])
  })

  it('useOperatorSkins reactive composable resolves data with useAsyncData', async () => {
    const id = ref('char_002_amiya')
    const asyncData = useOperatorSkins(id)
    await asyncData

    expect(asyncData.status.value).toBe('success')
    expect(asyncData.data.value?.length).toBe(11)
  })
})
