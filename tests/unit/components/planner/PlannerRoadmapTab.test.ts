import { describe, it, expect, beforeEach } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import fs from 'node:fs'
import path from 'node:path'
import PlannerRoadmapTab from '../../../../app/components/planner/PlannerRoadmapTab.vue'
import { usePlannerStore } from '../../../../app/stores/planner'
import { useDepotStore } from '../../../../app/stores/depot'
import { MemoryStorageAdapter } from '../../../../app/utils/storage/memoryAdapter'
import type { OperatorDetail } from '../../../../shared/schemas/operator'

function loadOperator(id: string): OperatorDetail {
  const filePath = path.resolve(process.cwd(), `data/operators/${id}.json`)
  return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as OperatorDetail
}

describe('PlannerRoadmapTab', () => {
  const silverAsh = loadOperator('char_172_svrash')

  beforeEach(() => {
    const pinia = createPinia()
    setActivePinia(pinia)
  })

  it('renders empty state when no plan is selected', async () => {
    const plannerStore = usePlannerStore()
    plannerStore.setAdapter(new MemoryStorageAdapter())
    await plannerStore.init()

    const wrapper = await mountSuspended(PlannerRoadmapTab)
    expect(wrapper.find('.ak-empty-state').exists()).toBe(true)
  })

  it('renders milestone step cards when active plan is selected', async () => {
    const plannerStore = usePlannerStore()
    const depotStore = useDepotStore()
    plannerStore.setAdapter(new MemoryStorageAdapter())
    depotStore.setAdapter(new MemoryStorageAdapter())
    await plannerStore.init()
    await depotStore.init()

    // Add plan with SilverAsh: E0 Lv1 -> E1 Lv50
    const plan = await plannerStore.addPlan(
      'char_172_svrash',
      { elite: 0, level: 1, skillLevel: 1, skills: {}, modules: {} },
      { elite: 1, level: 50, skillLevel: 4, skills: {}, modules: {} },
    )
    plannerStore.operatorDetailsCache.set('char_172_svrash', silverAsh)

    const wrapper = await mountSuspended(PlannerRoadmapTab, {
      props: {
        plan,
        detail: silverAsh,
      },
    })

    expect(wrapper.find('.planner-roadmap__operator-name').text()).toContain('SilverAsh')
    const cards = wrapper.findAll('.planner-roadmap__step-card')
    expect(cards.length).toBeGreaterThan(0)

    // Check first step is level
    expect(cards[0]?.text()).toContain('Elite 0 Level 1 → 50')
  })

  it('updates plan state when "Mark as Done" button is clicked', async () => {
    const plannerStore = usePlannerStore()
    const depotStore = useDepotStore()
    plannerStore.setAdapter(new MemoryStorageAdapter())
    depotStore.setAdapter(new MemoryStorageAdapter())
    await plannerStore.init()
    await depotStore.init()

    const plan = await plannerStore.addPlan(
      'char_172_svrash',
      { elite: 0, level: 1, skillLevel: 1, skills: {}, modules: {} },
      { elite: 1, level: 50, skillLevel: 1, skills: {}, modules: {} },
    )
    plannerStore.operatorDetailsCache.set('char_172_svrash', silverAsh)

    const wrapper = await mountSuspended(PlannerRoadmapTab, {
      props: {
        plan,
        detail: silverAsh,
      },
    })

    const applyBtn = wrapper.find('.planner-roadmap__step-action button')
    expect(applyBtn.exists()).toBe(true)

    await applyBtn.trigger('click')
    await flushPromises()

    const emitted = wrapper.emitted('apply-step')
    expect(emitted).toBeTruthy()
    const appliedStep = emitted?.[0]?.[0]
    expect(appliedStep?.resultingState.level).toBe(50)
  })
})
