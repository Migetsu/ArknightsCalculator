import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
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

    const input = wrapper.find('#op-level-slider')
    expect(input.exists()).toBe(true)
    await input.setValue('45')
    await input.trigger('input')

    const emitted = wrapper.emitted('update:level')
    expect(emitted).toBeTruthy()
    expect(emitted?.[0]?.[0]).toBe(45)
  })

  it('renders branch codes and module names for operator with multiple modules and never shows ADVANCED', async () => {
    const kaltsit = loadOperatorDetail('char_003_kalts')
    const wrapper = await mountSuspended(AkOperatorStatsPanel, {
      props: {
        operator: kaltsit,
        elite: 2,
        level: 90,
        trust: 100,
        potential: 1,
        selectedModuleId: 'uniequip_002_kalts',
        moduleStage: 3,
      },
    })

    const text = wrapper.text()
    // Must never show legacy "ADVANCED" label
    expect(text).not.toContain('ADVANCED')

    // Must display branch codes and module names
    expect(text).toContain('Mon2tr')
    expect(text).toContain('Panacea')

    // Module buttons rendered as AkButton
    const buttons = wrapper.findAll('button')
    const mon2trBtn = buttons.find((b) => b.text().includes('Mon2tr'))
    expect(mon2trBtn).toBeDefined()
    const panaceaBtn = buttons.find((b) => b.text().includes('Panacea'))
    expect(panaceaBtn).toBeDefined()

    await panaceaBtn!.trigger('click')
    const emitted = wrapper.emitted('update:selectedModuleId')
    expect(emitted).toBeTruthy()
  })

  it('renders attack range card and updates range on elite phase change', async () => {
    // SilverAsh: E0 -> range '2-3', E2 -> range '3-12'
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

    const rangeCard = wrapper.find('.ak-operator-stats-panel__range-card')
    expect(rangeCard.exists()).toBe(true)
    expect(rangeCard.text()).toContain('Range 3-12')
    expect(rangeCard.text()).toContain('E2')

    // Change elite to 0
    await wrapper.setProps({ elite: 0 })
    await flushPromises()
    expect(rangeCard.text()).toContain('Range 2-3')
    expect(rangeCard.text()).toContain('E0')
  })

  it('renders promotion costs for 6★ operator with E1 and E2, materials, and LMD', async () => {
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

    const promoCard = wrapper.find('.ak-operator-stats-panel__promotion-card')
    expect(promoCard.exists()).toBe(true)

    const phaseCards = wrapper.findAll('.ak-operator-stats-panel__phase-card')
    expect(phaseCards).toHaveLength(2)

    // E1 card
    const e1Card = phaseCards[0]!
    expect(e1Card.text()).toContain('E1')
    expect(e1Card.text()).toContain('Elite 1')
    expect(e1Card.text()).toContain('30,000') // LMD

    // E2 card
    const e2Card = phaseCards[1]!
    expect(e2Card.text()).toContain('E2')
    expect(e2Card.text()).toContain('Elite 2')
    expect(e2Card.text()).toContain('180,000') // LMD
  })

  it('renders E1 with 0 materials and 10,000 LMD, and omits E2 for 3★ operator (Fang)', async () => {
    const fang = loadOperatorDetail('char_123_fang')
    const wrapper = await mountSuspended(AkOperatorStatsPanel, {
      props: {
        operator: fang,
        elite: 1,
        level: 55,
        trust: 100,
        potential: 1,
        moduleStage: 0,
      },
    })

    const promoCard = wrapper.find('.ak-operator-stats-panel__promotion-card')
    expect(promoCard.exists()).toBe(true)

    const phaseCards = wrapper.findAll('.ak-operator-stats-panel__phase-card')
    expect(phaseCards).toHaveLength(1)

    const e1Card = phaseCards[0]!
    expect(e1Card.text()).toContain('E1')
    expect(e1Card.text()).toContain('Elite 1')
    expect(e1Card.text()).toContain('10,000') // LMD
    expect(e1Card.text()).toContain('No extra materials required')

    // E2 must never be rendered for 3-star
    expect(wrapper.text()).not.toContain('Elite 2')
  })

  it('does not render promotion card for 2★ and 1★ operators', async () => {
    const noirc = loadOperatorDetail('char_500_noirc')
    const wrapper = await mountSuspended(AkOperatorStatsPanel, {
      props: {
        operator: noirc,
        elite: 0,
        level: 30,
        trust: 100,
        potential: 1,
        moduleStage: 0,
      },
    })

    const promoCard = wrapper.find('.ak-operator-stats-panel__promotion-card')
    expect(promoCard.exists()).toBe(false)
  })
})
