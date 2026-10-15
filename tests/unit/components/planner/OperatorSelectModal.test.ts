import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import OperatorSelectModal from '../../../../app/components/planner/OperatorSelectModal.vue'

describe('OperatorSelectModal', () => {
  it('renders localized class options and supports SPECIALIST class filtering', async () => {
    const _wrapper = await mountSuspended(OperatorSelectModal, {
      props: {
        modelValue: true,
      },
    })

    const classButtons = Array.from(
      document.body.querySelectorAll<HTMLButtonElement>('.op-modal__class-btn'),
    )
    expect(classButtons.length).toBeGreaterThan(0)

    // Find the Specialist filter button
    const specialistBtn = classButtons.find((btn) =>
      btn.textContent?.toLowerCase().includes('specialist'),
    )
    expect(specialistBtn).toBeDefined()

    // Click Specialist filter
    specialistBtn?.click()
    await flushPromises()

    // Expect items to show Specialist operators
    const items = Array.from(document.body.querySelectorAll<HTMLElement>('.op-modal__item'))
    expect(items.length).toBeGreaterThan(0)
    for (const item of items) {
      const classLabel = item.querySelector('.op-modal__item-class')?.textContent?.trim()
      expect(classLabel).toBe('Specialist')
    }
  })
})
