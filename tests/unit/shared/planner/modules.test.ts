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
      typeName2: 'A',
      name: { en: "Fiammetta's Specialized Badge", zh: '菲亚梅塔特限证章' },
      type: 'ADVANCED',
      stages: [
        { stage: 1, parts: [] },
        { stage: 2, parts: [] },
        { stage: 3, parts: [] },
      ],
    },
  ]

  it('rejects initial and mission badges with type INITIAL', () => {
    expect(isPlannerModule(fiammettaModules[0]!)).toBe(false)
    expect(
      isPlannerModule({
        id: 'uniequip_001_svrash',
        typeName2: '',
        type: 'INITIAL',
      } as OperatorModule),
    ).toBe(false)
    expect(
      isPlannerModule({
        id: 'uniequip_002_svrash',
        typeName2: 'X',
        type: 'INITIAL',
      } as OperatorModule),
    ).toBe(false)
  })

  it('accepts all combat modules with stages (X, Y, D, A, B)', () => {
    expect(isPlannerModule(fiammettaModules[1]!)).toBe(true)
    expect(isPlannerModule(fiammettaModules[2]!)).toBe(true)
    expect(isPlannerModule(fiammettaModules[3]!)).toBe(true)
    expect(
      isPlannerModule({
        id: 'uniequip_004_kalts',
        typeName2: 'A',
        name: { en: "Kal'tsit's Specialized Badge", zh: '凯尔希特限证章' },
        type: 'ADVANCED',
        stages: [{ stage: 1, parts: [] }],
      } as OperatorModule),
    ).toBe(true)
    expect(
      isPlannerModule({
        id: 'uniequip_002_kalts',
        typeName2: 'X',
        name: { en: 'Mon2tr', zh: 'Mon2tr' },
        type: 'ADVANCED',
        stages: [{ stage: 1, parts: [] }],
      } as OperatorModule),
    ).toBe(true)
  })

  it('filters 4-module operator (Fiammetta) to all 3 combat modules (Y, X, A)', () => {
    const filtered = getPlannerModules(fiammettaModules)
    expect(filtered).toHaveLength(3)
    expect(filtered.map((m) => m.id)).toEqual([
      'uniequip_002_phenxi',
      'uniequip_003_phenxi',
      'uniequip_004_phenxi',
    ])
  })

  it('filters Kaltsit real operator modules to exactly 3 combat modules (X, Y, A)', async () => {
    const kaltsitData = (await import('../../../../data/operators/char_003_kalts.json'))
      .default as { modules: OperatorModule[] }
    expect(kaltsitData.modules).toHaveLength(4)
    const filtered = getPlannerModules(kaltsitData.modules)
    expect(filtered).toHaveLength(3)
    expect(filtered.map((m) => m.id)).toEqual([
      'uniequip_002_kalts',
      'uniequip_003_kalts',
      'uniequip_004_kalts',
    ])
  })
})
