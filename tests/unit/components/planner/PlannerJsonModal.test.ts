import { describe, expect, it, beforeEach } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import PlannerJsonModal from '../../../../app/components/planner/PlannerJsonModal.vue'
import { usePlannerStore } from '../../../../app/stores/planner'
import { MemoryStorageAdapter } from '../../../../app/utils/storage'

describe('PlannerJsonModal.vue', () => {
  beforeEach(async () => {
    const store = usePlannerStore()
    store.setAdapter(new MemoryStorageAdapter())
    await store.init()
    store.clearPlans()
  })

  it('renders modal when open and displays export tab content by default', async () => {
    const store = usePlannerStore()
    await store.addPlan('char_172_svrash')

    const wrapper = await mountSuspended(PlannerJsonModal, {
      props: {
        modelValue: true,
        initialTab: 'export',
        teleport: false,
      },
    })

    expect(wrapper.find('.planner-modal').exists()).toBe(true)
    const textarea = wrapper.find('.planner-modal__textarea')
    expect(textarea.exists()).toBe(true)
    expect((textarea.element as HTMLTextAreaElement).value).toContain('char_172_svrash')
  })

  it('displays share tab when initialTab is share', async () => {
    const store = usePlannerStore()
    await store.addPlan('char_172_svrash')

    const wrapper = await mountSuspended(PlannerJsonModal, {
      props: {
        modelValue: true,
        initialTab: 'share',
        teleport: false,
      },
    })

    expect(wrapper.find('.planner-modal').exists()).toBe(true)
    const codeArea = wrapper.find('.planner-modal__textarea--code')
    expect(codeArea.exists()).toBe(true)
  })

  it('renders import preview when valid share code is passed', async () => {
    const store = usePlannerStore()
    await store.addPlan('char_172_svrash')
    const code = await store.exportShareCode()

    const wrapper = await mountSuspended(PlannerJsonModal, {
      props: {
        modelValue: true,
        initialTab: 'import',
        initialShareCode: code,
        teleport: false,
      },
    })

    // Allow async parsing in watch
    await new Promise((resolve) => setTimeout(resolve, 80))
    await wrapper.vm.$nextTick()

    const preview = wrapper.find('.planner-modal__preview')
    expect(preview.exists()).toBe(true)
  })
})
