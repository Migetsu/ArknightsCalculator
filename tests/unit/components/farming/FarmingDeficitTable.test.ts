import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import FarmingDeficitTable from '../../../../app/components/farming/FarmingDeficitTable.vue'

describe('FarmingDeficitTable', () => {
  it('renders 3 rows sorted by remaining count descending with need, have, and remaining', async () => {
    const items = [
      { id: '30014', total: 17, remaining: 15, have: 2 },
      { id: '30013', total: 18, remaining: 8, have: 10 },
      { id: '30012', remaining: 4, have: 0 },
    ]

    const wrapper = await mountSuspended(FarmingDeficitTable, {
      props: { items },
    })

    const rows = wrapper.findAll('[data-testid="farming-deficit-row"]')
    expect(rows).toHaveLength(3)

    // Check need (total)
    expect(rows[0]!.find('.farming-deficit-table__num--need').text()).toBe('17')
    expect(rows[1]!.find('.farming-deficit-table__num--need').text()).toBe('18')
    expect(rows[2]!.find('.farming-deficit-table__num--need').text()).toBe('—')

    // Check order by remaining
    expect(rows[0]!.find('.farming-deficit-table__num--remaining').text()).toBe('15')
    expect(rows[1]!.find('.farming-deficit-table__num--remaining').text()).toBe('8')
    expect(rows[2]!.find('.farming-deficit-table__num--remaining').text()).toBe('4')

    // Check have counts
    expect(rows[0]!.find('.farming-deficit-table__num--have').text()).toBe('2')
    expect(rows[1]!.find('.farming-deficit-table__num--have').text()).toBe('10')
    expect(rows[2]!.find('.farming-deficit-table__num--have').text()).toBe('0')
  })

  it('renders 1 row with have=0 and remaining=5 correctly', async () => {
    const items = [{ id: '30011', remaining: 5, have: 0 }]

    const wrapper = await mountSuspended(FarmingDeficitTable, {
      props: { items },
    })

    const rows = wrapper.findAll('[data-testid="farming-deficit-row"]')
    expect(rows).toHaveLength(1)

    const row = rows[0]!
    expect(row.find('.farming-deficit-table__num--have').text()).toBe('0')
    expect(row.find('.farming-deficit-table__num--remaining').text()).toBe('5')
    expect(row.find('.farming-deficit-table__item-name').text()).toBeTruthy()
  })

  it('renders no item rows for empty items array', async () => {
    const wrapper = await mountSuspended(FarmingDeficitTable, {
      props: { items: [] },
    })

    const rows = wrapper.findAll('[data-testid="farming-deficit-row"]')
    expect(rows).toHaveLength(0)
  })

  it('skips items where remaining <= 0', async () => {
    const items = [
      { id: '30011', remaining: 5, have: 1 },
      { id: '30012', remaining: 0, have: 10 },
      { id: '30013', remaining: -2, have: 5 },
    ]

    const wrapper = await mountSuspended(FarmingDeficitTable, {
      props: { items },
    })

    const rows = wrapper.findAll('[data-testid="farming-deficit-row"]')
    expect(rows).toHaveLength(1)
    expect(rows[0]!.find('.farming-deficit-table__num--remaining').text()).toBe('5')
  })
})
