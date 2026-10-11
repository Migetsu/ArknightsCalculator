import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import IndexPage from '../../../app/pages/index.vue'

describe('IndexPage', () => {
  it('mounts in Nuxt environment and displays companion title', async () => {
    const wrapper = await mountSuspended(IndexPage)
    expect(wrapper.text()).toContain('Arknights Companion')
  })
})
