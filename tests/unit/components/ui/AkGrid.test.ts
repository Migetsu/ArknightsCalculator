import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import AkGrid from '~/components/ui/AkGrid.vue'

describe('AkGrid', () => {
  it('renders default grid with cols-1 and gap-md', async () => {
    const wrapper = await mountSuspended(AkGrid, {
      slots: {
        default: () => '<div>Grid Item</div>',
      },
    })

    expect(wrapper.classes()).toContain('ak-grid')
    expect(wrapper.classes()).toContain('ak-grid--cols-1')
    expect(wrapper.classes()).toContain('ak-grid--gap-md')
  })

  it('renders presets and responsive classes', async () => {
    const wrapper = await mountSuspended(AkGrid, {
      props: {
        preset: 'panels',
        colsSm: 2,
        colsXl: 4,
        gap: 'lg',
        tag: 'section',
      },
    })

    expect(wrapper.element.tagName.toLowerCase()).toBe('section')
    expect(wrapper.classes()).toContain('ak-grid--preset-panels')
    expect(wrapper.classes()).toContain('ak-grid--cols-sm-2')
    expect(wrapper.classes()).toContain('ak-grid--cols-xl-4')
    expect(wrapper.classes()).toContain('ak-grid--gap-lg')
  })
})
