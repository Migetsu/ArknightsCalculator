import { describe, it, expect, beforeEach } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { setActivePinia, createPinia } from 'pinia'
import GachaCalculator from '~/components/gacha/GachaCalculator.vue'
import { useDepotStore } from '~/stores/depot'

describe('GachaCalculator', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders treasury inputs and initializes total rolls to 0', async () => {
    const wrapper = await mountSuspended(GachaCalculator, {
      props: { activeBannerType: 'standard' },
    })

    const rollsVal = wrapper.find('.gacha-calc__stat-value--rolls')
    expect(rollsVal.text()).toBe('0')
  })

  it('populates treasury from depot store when clicking Fill from Depot', async () => {
    const wrapper = await mountSuspended(GachaCalculator, {
      props: { activeBannerType: 'standard' },
    })

    const depotStore = useDepotStore()
    depotStore.currencies.orundum = 12000
    depotStore.currencies.originitePrime = 10

    const fillBtn = wrapper.find('.gacha-calc__depot-btn')
    await fillBtn.trigger('click')

    const rollsVal = wrapper.find('.gacha-calc__stat-value--rolls')
    // 12000 orundum = 20 rolls, 10 OP = 1800 orundum = 3 rolls -> total 23 rolls
    expect(rollsVal.text()).toBe('23')
  })

  it('renders probability milestones cards including 300-spark milestone', async () => {
    const wrapper = await mountSuspended(GachaCalculator, {
      props: { activeBannerType: 'limited' },
    })

    const milestoneCards = wrapper.findAll('.gacha-calc__milestone-card')
    expect(milestoneCards.length).toBe(5)
    expect(milestoneCards[0]?.text()).toContain('50 ROLLS')
    expect(milestoneCards[4]?.text()).toContain('300 ROLLS')
    expect(milestoneCards[4]?.text()).toContain('100% SPARK')
  })
})
