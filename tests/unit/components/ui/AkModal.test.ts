import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import AkModal from '~/components/ui/AkModal.vue'

describe('AkModal', () => {
  it('renders modal content in document body when teleport is true and modelValue is true', async () => {
    await mountSuspended(AkModal, {
      props: {
        modelValue: true,
        title: 'Tactical Override',
        tag: 'PRTS.MODAL // 01',
      },
      slots: {
        default: () => 'Modal body text',
      },
    })

    const modal = document.querySelector('.ak-modal')
    expect(modal).not.toBeNull()
    expect(modal?.textContent).toContain('Tactical Override')
    expect(modal?.textContent).toContain('PRTS.MODAL // 01')
    expect(modal?.textContent).toContain('Modal body text')
  })

  it('emits update:modelValue false and close when clicking close button', async () => {
    const wrapper = await mountSuspended(AkModal, {
      props: {
        modelValue: true,
        title: 'Tactical Override',
        teleport: false,
      },
    })

    const closeBtn = wrapper.find('.ak-modal__close')
    expect(closeBtn.exists()).toBe(true)
    await closeBtn.trigger('click')

    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false])
    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('emits update:modelValue false when clicking backdrop', async () => {
    const wrapper = await mountSuspended(AkModal, {
      props: {
        modelValue: true,
        teleport: false,
      },
    })

    const backdrop = wrapper.find('.ak-modal__backdrop')
    expect(backdrop.exists()).toBe(true)
    await backdrop.trigger('click')

    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false])
  })

  it('emits update:modelValue false on Escape keydown', async () => {
    const wrapper = await mountSuspended(AkModal, {
      props: {
        modelValue: true,
        teleport: false,
      },
    })

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))

    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false])
  })
})
