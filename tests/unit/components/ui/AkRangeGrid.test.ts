import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import AkRangeGrid from '~/components/ui/AkRangeGrid.vue'
import type { RangeTableEntry } from '~~/shared/schemas/range'

const sampleRange3x3: RangeTableEntry = {
  id: '3-6',
  direction: 1,
  grids: [
    { row: 1, col: 0 },
    { row: 1, col: 1 },
    { row: 1, col: 2 },
    { row: 0, col: 0 },
    { row: 0, col: 1 },
    { row: 0, col: 2 },
    { row: -1, col: 0 },
    { row: -1, col: 1 },
    { row: -1, col: 2 },
  ],
  rows: 3,
  cols: 3,
  anchor: { row: 1, col: 0 },
  matrix: [
    [1, 1, 1],
    [1, 1, 1],
    [1, 1, 1],
  ],
}

const sampleBesieger4_3: RangeTableEntry = {
  id: '4-3',
  direction: 1,
  grids: [
    { row: 1, col: 1 },
    { row: 0, col: 1 },
    { row: -1, col: 1 },
  ],
  rows: 5,
  cols: 5,
  anchor: { row: 2, col: 0 },
  matrix: [
    [0, 0, 0, 0, 0],
    [0, 1, 0, 0, 0],
    [0, 1, 0, 0, 0], // row 2, col 0 is 0 (dead zone anchor!)
    [0, 1, 0, 0, 0],
    [0, 0, 0, 0, 0],
  ],
}

const sample1x1: RangeTableEntry = {
  id: '0-1',
  direction: 1,
  grids: [{ row: 0, col: 0 }],
  rows: 1,
  cols: 1,
  anchor: { row: 0, col: 0 },
  matrix: [[1]],
}

describe('AkRangeGrid', () => {
  it('renders range grid with correct dimensions and cell count', async () => {
    const wrapper = await mountSuspended(AkRangeGrid, {
      props: {
        range: sampleRange3x3,
        size: 'md',
      },
    })

    expect(wrapper.find('.ak-range-grid__id').text()).toContain('3-6')
    expect(wrapper.find('.ak-range-grid__dims').text()).toBe('3 × 3')

    const cells = wrapper.findAll('.ak-range-grid__cell')
    expect(cells).toHaveLength(9)

    const attackableCells = wrapper.findAll('.ak-range-grid__cell--attackable')
    expect(attackableCells).toHaveLength(9)

    const anchorCells = wrapper.findAll('.ak-range-grid__cell--anchor')
    expect(anchorCells).toHaveLength(1)
    expect(wrapper.find('.ak-range-grid__anchor-marker').exists()).toBe(true)
  })

  it('correctly handles Besieger dead-zone anchor on non-attackable cell', async () => {
    const wrapper = await mountSuspended(AkRangeGrid, {
      props: {
        range: sampleBesieger4_3,
        size: 'md',
      },
    })

    const cells = wrapper.findAll('.ak-range-grid__cell')
    expect(cells).toHaveLength(25)

    // Anchor is at row 2, col 0 (cell index = 2 * 5 + 0 = 10)
    const anchorCell = wrapper.find('.ak-range-grid__cell--dead-zone-anchor')
    expect(anchorCell.exists()).toBe(true)
    expect(anchorCell.classes()).toContain('ak-range-grid__cell--empty')
    expect(anchorCell.classes()).not.toContain('ak-range-grid__cell--attackable')

    // Operator marker is still present on the dead-zone anchor
    const marker = anchorCell.find('.ak-range-grid__anchor-marker')
    expect(marker.exists()).toBe(true)
    expect(marker.classes()).toContain('ak-range-grid__anchor-marker--dead-zone')
  })

  it('renders extreme 1x1 melee range 0-1', async () => {
    const wrapper = await mountSuspended(AkRangeGrid, {
      props: {
        range: sample1x1,
        size: 'sm',
      },
    })

    expect(wrapper.find('.ak-range-grid__dims').text()).toBe('1 × 1')
    const cells = wrapper.findAll('.ak-range-grid__cell')
    expect(cells).toHaveLength(1)
    expect(cells[0]!.classes()).toContain('ak-range-grid__cell--attackable')
    expect(cells[0]!.classes()).toContain('ak-range-grid__cell--anchor')
  })

  it('renders modified variant badge', async () => {
    const wrapper = await mountSuspended(AkRangeGrid, {
      props: {
        range: sampleRange3x3,
        variant: 'modified',
      },
    })

    expect(wrapper.classes()).toContain('ak-range-grid--modified')
    expect(wrapper.find('.ak-range-grid__badge').exists()).toBe(true)
  })

  it('renders inherited variant badge', async () => {
    const wrapper = await mountSuspended(AkRangeGrid, {
      props: {
        range: sampleRange3x3,
        variant: 'inherited',
      },
    })

    expect(wrapper.classes()).toContain('ak-range-grid--inherited')
    expect(wrapper.find('.ak-range-grid__badge').exists()).toBe(true)
  })

  it('renders empty state when no range is available', async () => {
    const wrapper = await mountSuspended(AkRangeGrid, {
      props: {
        range: null,
      },
    })

    expect(wrapper.find('.ak-range-grid__empty').exists()).toBe(true)
  })

  it('fetches range by rangeId if range prop is omitted', async () => {
    const wrapper = await mountSuspended(AkRangeGrid, {
      props: {
        rangeId: '3-6',
        size: 'sm',
      },
    })
    await flushPromises()

    expect(wrapper.find('.ak-range-grid__id').text()).toContain('3-6')
    expect(wrapper.findAll('.ak-range-grid__cell')).toHaveLength(9)
  })
})
