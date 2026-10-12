import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import fs from 'node:fs'
import path from 'node:path'
import type { OperatorDetail } from '../../../../shared/schemas/operator'
import AkOperatorStatsPanel from '~/components/operators/AkOperatorStatsPanel.vue'

function loadOperatorDetail(id: string): OperatorDetail {
  const filePath = path.resolve(process.cwd(), `data/operators/${id}.json`)
  const raw = fs.readFileSync(filePath, 'utf-8')
  return JSON.parse(raw) as OperatorDetail
}

describe('AkOperatorStatsPanel', () => {
  const silverAsh = loadOperatorDetail('char_172_svrash')

  it('renders stats grid with calculated attributes', async () => {
    const wrapper = await mountSuspended(AkOperatorStatsPanel, {
      props: {
        operator: silverAsh,
        elite: 2,
        level: 90,
        trust: 100,
        potential: 6,
        selectedModuleId: 'uniequip_002_svrash',
        moduleStage: 3,
      },
    })

    const text = wrapper.text()
    // SilverAsh max HP = 2890, ATK = 859, DEF = 447
    expect(text).toContain('2890')
    expect(text).toContain('859')
    expect(text).toContain('447')
  })

  it('emits update:level when input changed', async () => {
    const wrapper = await mountSuspended(AkOperatorStatsPanel, {
      props: {
        operator: silverAsh,
        elite: 2,
        level: 90,
        trust: 100,
        potential: 1,
        moduleStage: 0,
      },
    })

    const input = wrapper.find('#op-level-input')
    expect(input.exists()).toBe(true)
    await input.setValue('45')
    await input.trigger('change')

    const emitted = wrapper.emitted('update:level')
    expect(emitted).toBeTruthy()
    expect(emitted?.[0]?.[0]).toBe(45)
  })
})
