import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import FarmingMaterialList from '../../../../app/components/farming/FarmingMaterialList.vue'

const items = [
  {
    id: '31044',
    name: 'Refined Solvent',
    need: 52,
    have: 11,
    craft: 30,
    farm: 11,
    isGoal: true,
    recipe: [],
    usages: [{ name: 'Nucleic Crystal Sinter', amount: 22 }],
  },
  {
    id: '30155',
    name: 'Nucleic Crystal Sinter',
    need: 22,
    have: 0,
    craft: 22,
    farm: 0,
    isGoal: true,
    recipe: [{ name: 'Refined Solvent', amount: 44 }],
    usages: [],
  },
]

describe('FarmingMaterialList', () => {
  it('separates items that still need farming from covered ones', async () => {
    const wrapper = await mountSuspended(FarmingMaterialList, { props: { items } })

    const rows = wrapper.findAll('[data-testid="farming-material-row"]')
    expect(rows).toHaveLength(2)
    expect(wrapper.text()).toContain('1 to farm')
    expect(wrapper.text()).toContain('1 covered')
  })

  it('explains where an item is used even when its own farm amount is positive', async () => {
    const wrapper = await mountSuspended(FarmingMaterialList, { props: { items } })

    const text = wrapper.text()
    expect(text).toContain('Refined Solvent')
    expect(text).toContain('need 52')
    expect(text).toContain('have 11')
    expect(text).toContain('craft 30')
    expect(text).toContain('to farm 11')
    expect(text).toContain('Used to craft:')
    expect(text).toContain('Nucleic Crystal Sinter ×22')
  })

  it('shows the recipe of a crafted item', async () => {
    const wrapper = await mountSuspended(FarmingMaterialList, { props: { items } })

    expect(wrapper.text()).toContain('Recipe:')
    expect(wrapper.text()).toContain('Refined Solvent ×44')
  })

  it('renders an explicit empty state when nothing needs farming', async () => {
    const wrapper = await mountSuspended(FarmingMaterialList, { props: { items: [items[1]!] } })

    expect(wrapper.text()).toContain('Nothing to farm')
  })
})
