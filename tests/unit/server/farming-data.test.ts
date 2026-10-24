import { describe, it, expect, beforeEach, vi } from 'vitest'
import { readFarmingData } from '../../../server/utils/farmingData'
import rawUs from '../../../data/penguin/us.json'
import rawCn from '../../../data/penguin/cn.json'
import rawStages from '../../../data/stages.json'
import rawItems from '../../../data/items.json'

describe('server: farmingData', () => {
  beforeEach(() => {
    vi.stubGlobal('useStorage', (namespace: string) => ({
      getItem: async (key: string) => {
        if (namespace === 'assets:penguin' && key === 'us.json') return rawUs
        if (namespace === 'assets:penguin' && key === 'cn.json') return rawCn
        if (namespace === 'assets:stages' && key === 'stages.json') return rawStages
        if (namespace === 'assets:items' && key === 'items.json') return rawItems
        return null
      },
    }))
  })

  it('reads global farming data with compact stages and stagesMap', async () => {
    const data = await readFarmingData('global')
    expect(data.server).toBe('US')
    expect(data.snapshot.server).toBe('US')
    expect(Object.keys(data.snapshot.stages).length).toBeGreaterThan(0)

    // Check that drops are compact (no stdDev)
    const firstStage = Object.values(data.snapshot.stages)[0]
    expect(firstStage).toBeDefined()
    expect(firstStage?.drops.length).toBeGreaterThan(0)
    for (const drop of firstStage!.drops) {
      expect((drop as unknown as { stdDev?: number }).stdDev).toBeUndefined()
    }

    // Check that stagesMap contains only relevant stages
    expect(Object.keys(data.stagesMap).length).toBeLessThan(Object.keys(rawStages).length)
    expect(data.stagesMap[firstStage!.stageId]).toBeDefined()

    // Check itemsMap
    expect(data.itemsMap['30012']).toBeDefined()
    expect(data.itemsMap['30012']?.name).toBe('Orirock Cube')
    expect(data.itemsMap['30012']?.rarity).toBe(2)
  })

  it('reads CN farming data', async () => {
    const data = await readFarmingData('cn')
    expect(data.server).toBe('CN')
    expect(data.snapshot.server).toBe('CN')
    expect(Object.keys(data.snapshot.stages).length).toBeGreaterThan(0)
  })

  it('reuses in-memory cache on subsequent calls', async () => {
    const first = await readFarmingData('global')
    const second = await readFarmingData('global')
    expect(first).toBe(second)
  })
})
