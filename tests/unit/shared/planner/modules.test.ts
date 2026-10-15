import { describe, it, expect } from 'vitest'
import { isPlannerModule, getPlannerModules } from '../../../../shared/utils/planner'
import type { OperatorModule } from '../../../../shared/schemas/operator'

describe('planner modules filter', () => {
  const fiammettaModules: OperatorModule[] = [
    {
      id: 'uniequip_001_phenxi',
      typeName2: 'ORIGINAL',
      name: { en: "Liberator's Badge", zh: '解放者证章' },
      type: 'INITIAL',
      stages: [],
    },
    {
      id: 'uniequip_002_phenxi',
      typeName2: 'ART-Y',
      name: { en: 'Suffering', zh: '苦难' },
      type: 'ADVANCED',
      stages: [
        { stage: 1, parts: [] },
        { stage: 2, parts: [] },
        { stage: 3, parts: [] },
      ],
    },
    {
      id: 'uniequip_003_phenxi',
      typeName2: 'ART-X',
      name: { en: 'Deliverance', zh: '解脱' },
      type: 'ADVANCED',
      stages: [
        { stage: 1, parts: [] },
        { stage: 2, parts: [] },
        { stage: 3, parts: [] },
      ],
    },
    {
      id: 'uniequip_004_phenxi',
      typeName2: 'ISW-α',
      name: { en: 'Catastrophe Relief', zh: '天灾救援' },
      type: 'ADVANCED',
      stages: [
        { stage: 1, parts: [] },
        { stage: 2, parts: [] },
        { stage: 3, parts: [] },
      ],
    },
  ]

  it('rejects initial and mission badges with _001_ or type INITIAL', () => {
    expect(isPlannerModule(fiammettaModules[0]!)).toBe(false)
    expect(isPlannerModule({ id: 'uniequip_001_svrash', typeName2: 'ORIGINAL' })).toBe(false)
    expect(
      isPlannerModule({ id: 'uniequip_002_svrash', typeName2: 'SWD-X', type: 'INITIAL' }),
    ).toBe(false)
  })

  it('accepts combat modules and special equipment with stages', () => {
    expect(isPlannerModule(fiammettaModules[1]!)).toBe(true)
    expect(isPlannerModule(fiammettaModules[2]!)).toBe(true)
    expect(isPlannerModule(fiammettaModules[3]!)).toBe(true)
  })

  it('filters 4-module operator to only 3 planner modules', () => {
    const filtered = getPlannerModules(fiammettaModules)
    expect(filtered).toHaveLength(3)
    expect(filtered.map((m) => m.id)).toEqual([
      'uniequip_002_phenxi',
      'uniequip_003_phenxi',
      'uniequip_004_phenxi',
    ])
  })
})
