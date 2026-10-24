import { describe, it, expect, beforeEach, vi } from 'vitest'
import { nextTick } from 'vue'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { setActivePinia, createPinia } from 'pinia'
import FarmingPage from '../../../app/pages/farming.vue'
import { useFarmingStore } from '../../../app/stores/farming'
import { readOperatorDataFixture } from '../support/operatorDataFixture'

const mockFetch = vi.hoisted(() => vi.fn())
mockNuxtImport('$fetch', () => mockFetch)
mockFetch.mockImplementation((url: string) => readOperatorDataFixture(url))

describe('FarmingPage', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders page header with code FRM-07 and title', async () => {
    const wrapper = await mountSuspended(FarmingPage)
    expect(wrapper.text()).toContain('FRM-07')
    expect(wrapper.text()).toContain('Farming Efficiency')
    expect(wrapper.find('.farming-page__footer').text()).toContain('Penguin Statistics')
  })

  it('renders empty state and supply schedule when deficit is empty', async () => {
    const farming = useFarmingStore()
    farming.setCustomDeficit({})

    const wrapper = await mountSuspended(FarmingPage)
    expect(wrapper.find('.farming-page__empty-box').exists()).toBe(true)
    expect(wrapper.find('.farming-page__schedule-card').exists()).toBe(true)
    const dayButtons = wrapper.findAll('.farming-page__day-btn')
    expect(dayButtons.length).toBe(7)
  })

  it('renders best stages, drop rate per run, total cost, and uncovered items when deficit exists', async () => {
    const wrapper = await mountSuspended(FarmingPage)
    const farming = useFarmingStore()
    farming.setCustomDeficit({ '30011': 30, mod_unlock_token: 4 }) // 30 Orirock T1 + 4 Module Data Block
    await nextTick()

    expect(wrapper.find('.farming-page__stages-card').exists()).toBe(true)
    expect(wrapper.find('.farming-page__cost-card').exists()).toBe(true)
    expect(wrapper.find('.farming-page__stage-row').exists()).toBe(true)
    expect(wrapper.find('.farming-page__item-rate').exists()).toBe(true)
    expect(wrapper.find('.farming-page__uncovered-box').exists()).toBe(true)
    expect(wrapper.find('.farming-page__uncovered-name').text()).toContain('Module Data Block')
  })
})
