import { describe, it, expect, beforeEach } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { setActivePinia, createPinia } from 'pinia'
import RecruitPage from '~/pages/recruit.vue'
import { useRecruitStore } from '~/stores/recruit'

describe('RecruitPage', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders page header and empty state when no tags are passed', async () => {
    const wrapper = await mountSuspended(RecruitPage, {
      route: '/recruit',
    })

    expect(wrapper.text()).toContain('Recruitment Matrix')
    expect(wrapper.text()).toContain('Select up to 5 tags')
    expect(wrapper.find('.recruit-page__alert').exists()).toBe(false)
  })

  it('pre-populates selected tags from query parameter ?tags=DPS', async () => {
    const wrapper = await mountSuspended(RecruitPage, {
      route: '/recruit?tags=DPS',
    })

    const recruitStore = useRecruitStore()
    expect(recruitStore.selectedTags).toEqual(['DPS'])
    expect(recruitStore.combinations.length).toBeGreaterThan(0)
    expect(wrapper.find('.recruit-page__alert').exists()).toBe(false)
  })

  it('filters out non-recruit and unknown tags without warning if within limit', async () => {
    const wrapper = await mountSuspended(RecruitPage, {
      route: '/recruit?tags=DPS,Soar,NonExistentTag,Support',
    })

    const recruitStore = useRecruitStore()
    expect(recruitStore.selectedTags).toEqual(['DPS', 'Support'])
    expect(wrapper.find('.recruit-page__alert').exists()).toBe(false)
  })

  it('truncates to 5 tags and displays AkAlert warning when > 5 tags are passed', async () => {
    const wrapper = await mountSuspended(RecruitPage, {
      route: '/recruit?tags=DPS,Support,Robot,Guard,Sniper,Vanguard',
    })

    const recruitStore = useRecruitStore()
    expect(recruitStore.selectedTags).toHaveLength(5)
    expect(recruitStore.selectedTags).toEqual(['DPS', 'Support', 'Robot', 'Guard', 'Sniper'])

    const alert = wrapper.find('.recruit-page__alert')
    expect(alert.exists()).toBe(true)
    expect(alert.text()).toContain('TAG LIMIT EXCEEDED')
    expect(alert.text()).toContain('Only the first 5 valid tags were selected')
  })

  it('clears selected tags and dismisses warning on reset button click', async () => {
    const wrapper = await mountSuspended(RecruitPage, {
      route: '/recruit?tags=DPS,Support,Robot,Guard,Sniper,Vanguard',
    })

    const recruitStore = useRecruitStore()
    expect(recruitStore.selectedTags).toHaveLength(5)
    expect(wrapper.find('.recruit-page__alert').exists()).toBe(true)

    const resetBtn = wrapper.find('.recruit-page__reset-btn')
    await resetBtn.trigger('click')

    expect(recruitStore.selectedTags).toEqual([])
    expect(wrapper.find('.recruit-page__alert').exists()).toBe(false)
  })

  it('verifies exact combination counts for single tags in Global pool', async () => {
    const store = useRecruitStore()
    store.serverPool = 'global'

    // DPS
    store.setSelectedTags(['DPS'])
    expect(store.combinations.length).toBe(1)
    expect(store.combinations[0]!.operators.length).toBe(55)

    // Support
    store.setSelectedTags(['Support'])
    expect(store.combinations.length).toBe(1)
    expect(store.combinations[0]!.operators.length).toBe(8)

    // Robot
    store.setSelectedTags(['Robot'])
    expect(store.combinations.length).toBe(1)
    expect(store.combinations[0]!.operators.length).toBe(8)
  })
})
