import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import IndexPage from '../../../app/pages/index.vue'

describe('IndexPage', () => {
  it('mounts in Nuxt environment and displays dashboard overview title', async () => {
    const wrapper = await mountSuspended(IndexPage)
    expect(wrapper.find('.dashboard-page__title').exists()).toBe(true)
    expect(wrapper.find('.dashboard-page__stats-grid').exists()).toBe(true)
  })
})
