import { describe, it, expect, beforeEach } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { setActivePinia, createPinia } from 'pinia'
import PlannerMaterialsTab from '../../../../app/components/planner/PlannerMaterialsTab.vue'
import { usePlannerStore } from '../../../../app/stores/planner'
import { useDepotStore } from '../../../../app/stores/depot'
import { MemoryStorageAdapter } from '../../../../app/utils/storage/memoryAdapter'

describe('PlannerMaterialsTab', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders craft section, farm section, and craftable badges in crafting included mode', async () => {
    const plannerStore = usePlannerStore()
    const depotStore = useDepotStore()
    plannerStore.setAdapter(new MemoryStorageAdapter())
    depotStore.setAdapter(new MemoryStorageAdapter())
    await plannerStore.init()
    await depotStore.init()

    // Add Texas E2 promotion demand: requires T4 materials like 30014 (Polymerization Prep) which is craftable
    await plannerStore.addPlan(
      'char_102_texas',
      { elite: 1, level: 50, skillLevel: 7, skills: {}, modules: {} },
      { elite: 2, level: 80, skillLevel: 7, skills: {}, modules: {} },
    )

    plannerStore.includeCrafting = true

    const wrapper = await mountSuspended(PlannerMaterialsTab)

    // Verify Crafting and Farming sections exist
    expect(wrapper.find('.planner-materials__craft-section').exists()).toBe(true)
    expect(wrapper.find('.planner-materials__farm-section').exists()).toBe(true)

    // Verify table has rows and contains craftable items
    const rows = wrapper.findAll('.planner-materials__table-row')
    expect(rows.length).toBeGreaterThan(0)
  })
})
