import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import AkSkillIcon from '~/components/ui/AkSkillIcon.vue'
import { PRIMARY_CDN_BASE, SECONDARY_CDN_BASE } from '../../../../shared/utils/resolveAsset'

describe('AkSkillIcon', () => {
  it('renders image element when skillId is provided', async () => {
    const wrapper = await mountSuspended(AkSkillIcon, {
      props: {
        skillId: 'skchr_texas_2',
        name: 'Sword Rain',
        skillIndex: 2,
      },
    })

    const img = wrapper.find('.ak-skill-icon__image')
    expect(img.exists()).toBe(true)
    expect(img.attributes('src')).toBe(`${PRIMARY_CDN_BASE}/skill/skill_icon_skchr_texas_2.png`)
    expect(img.attributes('alt')).toBe('Sword Rain')
  })

  it('cycles to secondary CDN candidate and then slot abbreviation on error', async () => {
    const wrapper = await mountSuspended(AkSkillIcon, {
      props: {
        skillId: 'skchr_texas_2',
        name: 'Sword Rain',
        skillIndex: 2,
      },
    })

    const img = wrapper.find('.ak-skill-icon__image')
    await img.trigger('error')

    expect(wrapper.find('.ak-skill-icon__image').attributes('src')).toBe(
      `${SECONDARY_CDN_BASE}/skill/skill_icon_skchr_texas_2.png`,
    )

    // Trigger error again through candidate chain until fallback
    await wrapper.find('.ak-skill-icon__image').trigger('error')
    await wrapper.find('.ak-skill-icon__image').trigger('error')
    await wrapper.find('.ak-skill-icon__image').trigger('error')

    expect(wrapper.find('.ak-skill-icon__image').exists()).toBe(false)
    expect(wrapper.find('.ak-skill-icon__fallback').exists()).toBe(true)
    expect(wrapper.find('.ak-skill-icon__slot-label').text()).toBe('S2')
  })

  it('renders mastery badge when mastery is provided', async () => {
    const wrapper = await mountSuspended(AkSkillIcon, {
      props: {
        skillId: 'skchr_svrash_3',
        name: 'Truesilver Slash',
        mastery: 3,
      },
    })

    const badge = wrapper.find('.ak-skill-icon__badge')
    expect(badge.exists()).toBe(true)
    expect(badge.text()).toBe('M3')
    expect(badge.classes()).toContain('ak-skill-icon__badge--mastery')
  })

  it('renders rank badge when rank is provided', async () => {
    const wrapper = await mountSuspended(AkSkillIcon, {
      props: {
        skillId: 'skcom_charge_cost[3]',
        name: 'Charge γ',
        rank: 7,
      },
    })

    const badge = wrapper.find('.ak-skill-icon__badge')
    expect(badge.exists()).toBe(true)
    expect(badge.text()).toBe('7')
    expect(badge.classes()).not.toContain('ak-skill-icon__badge--mastery')
  })

  it('applies explicit width and height on root and image', async () => {
    const wrapper = await mountSuspended(AkSkillIcon, {
      props: {
        skillId: 'skchr_texas_2',
        name: 'Sword Rain',
        size: 56,
      },
    })

    expect(wrapper.classes()).toContain('ak-skill-icon--size-56')
    const img = wrapper.find('.ak-skill-icon__image')
    expect(img.attributes('width')).toBe('56')
    expect(img.attributes('height')).toBe('56')
  })
})
