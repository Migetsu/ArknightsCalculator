import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import fs from 'node:fs'
import path from 'node:path'
import type { OperatorDetail } from '../../../../shared/schemas/operator'
import AkOperatorInfoPanel from '~/components/operators/AkOperatorInfoPanel.vue'

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
  })
})
