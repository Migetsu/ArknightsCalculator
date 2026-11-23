import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import FarmingDeficitTable from '../../../../app/components/farming/FarmingDeficitTable.vue'

describe('FarmingDeficitTable', () => {
  it('renders need, have, craft and farm columns in the provided order', async () => {
    const items = [
      { id: '30014', need: 42, have: 0, crafted: 32, remaining: 10 },
      { id: '30013', need: 18, have: 10, crafted: 0, remaining: 8 },
      { id: '30012', need: 4, have: 0, crafted: 0, remaining: 4 },
    ]

    const wrapper = await mountSuspended(FarmingDeficitTable, {
      props: { items },
    })

    const rows = wrapper.findAll('[data-testid="farming-deficit-row"]')
    expect(rows).toHaveLength(3)

    expect(rows[0]!.find('.farming-deficit-table__num--need').text()).toBe('42')
    expect(rows[0]!.find('.farming-deficit-table__num--craft').text()).toBe('32')
    expect(rows[0]!.find('.farming-deficit-table__num--remaining').text()).toBe('10')

    expect(rows[1]!.find('.farming-deficit-table__num--need').text()).toBe('18')
    expect(rows[1]!.find('.farming-deficit-table__num--craft').text()).toBe('0')
    expect(rows[1]!.find('.farming-deficit-table__num--remaining').text()).toBe('8')

    expect(rows[2]!.find('.farming-deficit-table__num--have').text()).toBe('0')
    expect(rows[2]!.find('.farming-deficit-table__num--remaining').text()).toBe('4')
  })

  it('renders a fully farmed row with have=0 and craft=0', async () => {
    const items = [{ id: '30011', need: 5, have: 0, crafted: 0, remaining: 5 }]

    const wrapper = await mountSuspended(FarmingDeficitTable, {
      props: { items },
    })

    const rows = wrapper.findAll('[data-testid="farming-deficit-row"]')
    expect(rows).toHaveLength(1)

    const row = rows[0]!
    expect(row.find('.farming-deficit-table__num--have').text()).toBe('0')
    expect(row.find('.farming-deficit-table__num--remaining').text()).toBe('5')
    const nameEl = row.find('.farming-deficit-table__item-name')
    expect(nameEl.text()).toBeTruthy()
    expect(nameEl.attributes('title')).toBe(nameEl.text())
  })

  it('renders no item rows for empty items array', async () => {
    const wrapper = await mountSuspended(FarmingDeficitTable, {
      props: { items: [] },
    })

    const rows = wrapper.findAll('[data-testid="farming-deficit-row"]')
    expect(rows).toHaveLength(0)
  })

  it('skips items with no gross need', async () => {
    const items = [
      { id: '30011', need: 5, have: 1, crafted: 0, remaining: 5 },
      { id: '30012', need: 0, have: 10, crafted: 0, remaining: 0 },
      { id: '30013', need: 0, have: 5, crafted: 0, remaining: 0 },
    ]

    const wrapper = await mountSuspended(FarmingDeficitTable, {
      props: { items },
    })

    const rows = wrapper.findAll('[data-testid="farming-deficit-row"]')
    expect(rows).toHaveLength(1)
    expect(rows[0]!.find('.farming-deficit-table__num--remaining').text()).toBe('5')
  })
})
