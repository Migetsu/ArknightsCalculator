import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import AkStat from '~/components/ui/AkStat.vue'

describe('AkStat', () => {
  it('renders label and value', async () => {
    const wrapper = await mountSuspended(AkStat, {
      props: {
        label: 'AVAILABLE PULLS:',
        value: '142 ROLLS',
        variant: 'cyan',
      },
    })

    expect(wrapper.find('.ak-stat__label').text()).toBe('AVAILABLE PULLS:')
    expect(wrapper.find('.ak-stat__value').text()).toBe('142 ROLLS')
    expect(wrapper.classes()).toContain('ak-stat--cyan')
  })

  it('renders subvalue when provided', async () => {
    const wrapper = await mountSuspended(AkStat, {
      props: {
        label: 'SPARK READINESS:',
        value: '47%',
        subvalue: '(142/300)',
        variant: 'amber',
      },
    })

    expect(wrapper.find('.ak-stat__subvalue').text()).toBe('(142/300)')
    expect(wrapper.classes()).toContain('ak-stat--amber')
  })
})
