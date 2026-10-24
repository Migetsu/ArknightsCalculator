import { describe, it, expect, beforeEach } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { setActivePinia, createPinia } from 'pinia'
import GachaCalculator from '~/components/gacha/GachaCalculator.vue'
import { useDepotStore } from '~/stores/depot'
import type { GachaBanner } from '~/../shared/schemas/banner'

const sampleLimitedBanner: GachaBanner = {
  id: 'banner_closure_crossover',
  type: 'limited',
  title: 'Hunters of the Umbral Wilds',
  cnStartDate: '2026/06/01',
  cnEndDate: '2026/06/15',
  rateUp6: ['char_4228_closur'],
  rateUp5: ['char_4225_tanya'],
}

const sampleMultiBanner: GachaBanner = {
  id: 'banner_joint',
  type: 'joint_operation',
  title: 'Joint Operation',
  cnStartDate: '2026/06/26',
  cnEndDate: '2026/07/10',
  rateUp6: ['char_003_kalts', 'char_4228_closur'],
  rateUp5: [],
}

const sampleManualUnavailableBanner: GachaBanner = {
  id: 'banner_manual_unavail',
  type: 'standard',
  title: 'Manual Without Share',
  cnStartDate: '2026/05/15',
  cnEndDate: '2026/05/29',
  rateUp6: ['char_003_kalts'],
  rateUp5: [],
  rateUpShareMode: 'manual',
}

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

  it('correctly calculates total rolls when filling from depot with joint currency remainder (420 Orundum + 1 OP = 1 pull)', async () => {
    const wrapper = await mountSuspended(GachaCalculator, {
      props: { activeBannerType: 'standard' },
    })

    const depotStore = useDepotStore()
    depotStore.currencies.orundum = 420
    depotStore.currencies.originitePrime = 1

    const fillBtn = wrapper.find('.gacha-calc__depot-btn')
    await fillBtn.trigger('click')

    const rollsVal = wrapper.find('.gacha-calc__stat-value--rolls')
    expect(rollsVal.text()).toBe('1')
  })

  it('correctly calculates total rolls when filling from depot with only OP yielding whole pulls (0 Orundum + 4 OP = 1 pull)', async () => {
    const wrapper = await mountSuspended(GachaCalculator, {
      props: { activeBannerType: 'standard' },
    })

    const depotStore = useDepotStore()
    depotStore.currencies.orundum = 0
    depotStore.currencies.originitePrime = 4

    const fillBtn = wrapper.find('.gacha-calc__depot-btn')
    await fillBtn.trigger('click')

    const rollsVal = wrapper.find('.gacha-calc__stat-value--rolls')
    expect(rollsVal.text()).toBe('1')
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

  it('does not display percentage when banner is not selected (banner: null)', async () => {
    const wrapper = await mountSuspended(GachaCalculator, {
      props: { banner: null },
    })

    const probVal = wrapper.find('.gacha-calc__stat-value--prob')
    expect(probVal.exists()).toBe(false)

    const noneVal = wrapper.find('.gacha-calc__stat-value--none')
    expect(noneVal.exists()).toBe(true)
    expect(noneVal.text()).toBe('—')
  })

  it('displays probability and includes target operator name in label when banner is passed', async () => {
    const wrapper = await mountSuspended(GachaCalculator, {
      props: { banner: sampleLimitedBanner },
    })

    const depotStore = useDepotStore()
    depotStore.currencies.orundum = 30000 // 50 rolls
    const fillBtn = wrapper.find('.gacha-calc__depot-btn')
    await fillBtn.trigger('click')

    const label = wrapper.find('.gacha-calc__stat-label--prob')
    expect(label.text()).toContain('Closure')

    const probVal = wrapper.find('.gacha-calc__stat-value--prob')
    expect(probVal.exists()).toBe(true)
    expect(probVal.text()).toMatch(/\d+(\.\d+)?%/)
  })

  it('displays unavailable message when target rate-up share is null', async () => {
    const wrapper = await mountSuspended(GachaCalculator, {
      props: { banner: sampleManualUnavailableBanner },
    })

    const unavailVal = wrapper.find('.gacha-calc__stat-value--unavailable')
    expect(unavailVal.exists()).toBe(true)
    expect(unavailVal.text().toLowerCase()).toMatch(/unavailable|недоступ/i)
  })

  it('allows changing target operator via selector when multiple 6-stars are featured', async () => {
    const wrapper = await mountSuspended(GachaCalculator, {
      props: { banner: sampleMultiBanner },
    })

    const select = wrapper.find<HTMLSelectElement>('.gacha-calc__target-select')
    expect(select.exists()).toBe(true)
    const options = select.findAll('option')
    expect(options.length).toBe(2)

    const label = wrapper.find('.gacha-calc__stat-label--prob')
    expect(label.text()).toContain("Kal'tsit")

    await select.setValue('char_4228_closur')
    expect(label.text()).toContain('Closure')
  })

  it('fills treasury from depot including single and ten-roll permits', async () => {
    const wrapper = await mountSuspended(GachaCalculator, {
      props: { banner: sampleLimitedBanner },
    })

    const depotStore = useDepotStore()
    depotStore.currencies.orundum = 1200
    depotStore.currencies.originitePrime = 10
    depotStore.items['7003'] = 5
    depotStore.items['7004'] = 2

    const fillBtn = wrapper.find('.gacha-calc__depot-btn')
    expect(fillBtn.exists()).toBe(true)
    await fillBtn.trigger('click')

    // 1200/600 (2) + 10*180/600 (3) + 5 (5) + 2*10 (20) = 30 pulls
    const pullsVal = wrapper.find('.gacha-calc__stat-value--rolls')
    expect(pullsVal.text()).toBe('30')
  })
})
