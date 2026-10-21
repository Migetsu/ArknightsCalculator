import { describe, it, expect } from 'vitest'
import {
  OPERATOR_DATA_DATASETS,
  bucketIndexForId,
  isValidOperatorDataId,
} from '../../../shared/utils/operatorData'

describe('operator data contract', () => {
  it('declares operators and handbook datasets with bounded bucket counts', () => {
    expect(OPERATOR_DATA_DATASETS.map((dataset) => dataset.name)).toEqual(['operators', 'handbook'])
    for (const dataset of OPERATOR_DATA_DATASETS) {
      expect(dataset.bucketCount).toBeGreaterThan(0)
      expect(dataset.bucketCount).toBeLessThan(32)
    }
  })

  it('accepts only safe operator ids', () => {
    expect(isValidOperatorDataId('char_002_amiya')).toBe(true)
    expect(isValidOperatorDataId('char_1001_amiya2')).toBe(true)
    expect(isValidOperatorDataId('OPERATOR123')).toBe(true)
    expect(isValidOperatorDataId('')).toBe(false)
    expect(isValidOperatorDataId('../data/operators/char_002_amiya')).toBe(false)
    expect(isValidOperatorDataId('char_002_amiya/../secret')).toBe(false)
    expect(isValidOperatorDataId('char-002-amiya')).toBe(false)
    expect(isValidOperatorDataId('char 002')).toBe(false)
    expect(isValidOperatorDataId(null)).toBe(false)
    expect(isValidOperatorDataId(undefined)).toBe(false)
    expect(isValidOperatorDataId(42)).toBe(false)
  })

  it('maps ids to stable in-range bucket indexes', () => {
    const id = 'char_002_amiya'
    expect(bucketIndexForId(id, 8)).toBe(bucketIndexForId(id, 8))
    expect(bucketIndexForId(id, 4)).toBe(bucketIndexForId(id, 8) % 4)

    for (const count of [1, 4, 8, 16]) {
      for (const operatorId of ['char_002_amiya', 'char_003_kalts', 'char_172_svrash']) {
        const index = bucketIndexForId(operatorId, count)
        expect(index).toBeGreaterThanOrEqual(0)
        expect(index).toBeLessThan(count)
      }
    }
  })

  it('rejects invalid bucket counts', () => {
    expect(() => bucketIndexForId('char_002_amiya', 0)).toThrow()
    expect(() => bucketIndexForId('char_002_amiya', -1)).toThrow()
    expect(() => bucketIndexForId('char_002_amiya', 2.5)).toThrow()
  })
})
