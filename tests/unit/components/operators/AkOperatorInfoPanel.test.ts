import { describe, expect, it } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import fs from 'node:fs'
import path from 'node:path'
import type { OperatorDetail } from '../../../../shared/schemas/operator'
import AkOperatorInfoPanel from '~/components/operators/AkOperatorInfoPanel.vue'
import { readOperatorDataFixture } from '../../support/operatorDataFixture'

const mockRequestFetch = (url: string) => readOperatorDataFixture(url)

mockNuxtImport('useRequestFetch', () => () => mockRequestFetch)

function loadOperatorDetail(id: string): OperatorDetail {
  const filePath = path.resolve(process.cwd(), `data/operators/${id}.json`)
  const raw = fs.readFileSync(filePath, 'utf-8')
  return JSON.parse(raw) as OperatorDetail
}

describe('AkOperatorInfoPanel', () => {
  const amiya = loadOperatorDetail('char_002_amiya')

  it('renders metadata, item usage, and embedded dossier panel for Amiya', async () => {
    const wrapper = await mountSuspended(AkOperatorInfoPanel, {
      props: {
        operator: amiya,
      },
    })
    await flushPromises()

    // Info panel metadata
    const text = wrapper.text()
    expect(text).toContain(amiya.displayNumber)
    expect(text).toContain(amiya.itemUsage?.en ?? '')

    // Embedded AkOperatorDossierPanel
    expect(wrapper.find('[data-testid="dossier-profile-section"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="dossier-physical-section"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="dossier-stories-section"]').exists()).toBe(true)

    // Tag links: DPS is a recruit tag and should be wrapped in NuxtLink
    const tagLinks = wrapper.findAll('.ak-operator-info-panel__tag-link')
    expect(tagLinks.length).toBe(1)
    expect(tagLinks[0]!.text()).toBe('DPS')
    expect(tagLinks[0]!.attributes('href')).toBe('/recruit?tags=DPS')
  })

  it('renders non-recruit tag "Soar" without a link while recruit tags are linked', async () => {
    const aglna2 = loadOperatorDetail('char_1015_aglna2')
    const wrapper = await mountSuspended(AkOperatorInfoPanel, {
      props: {
        operator: aglna2,
      },
    })
    await flushPromises()

    // aglna2 tagList: ['Soar', 'DPS', 'Crowd-Control']
    const tagLinks = wrapper.findAll('.ak-operator-info-panel__tag-link')
    expect(tagLinks.length).toBe(2)
    const linkedTagNames = tagLinks.map((l) => l.text())
    expect(linkedTagNames).toContain('DPS')
    expect(linkedTagNames).toContain('Crowd-Control')
    expect(linkedTagNames).not.toContain('Soar')

    // Soar is rendered in an AkBadge outside of tag-link
    const allBadges = wrapper.findAll('.ak-badge')
    const soarBadge = allBadges.find((b) => b.text() === 'Soar')
    expect(soarBadge).toBeDefined()
    expect(soarBadge!.element.closest('a')).toBeNull()
  })
})
