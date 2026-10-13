import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import fs from 'node:fs'
import path from 'node:path'
import type { OperatorDetail } from '../../../../shared/schemas/operator'
import AkArtViewer from '~/components/operators/AkArtViewer.vue'

function loadOperatorDetail(id: string): OperatorDetail {
  const filePath = path.resolve(process.cwd(), `data/operators/${id}.json`)
  const raw = fs.readFileSync(filePath, 'utf-8')
  return JSON.parse(raw) as OperatorDetail
}

describe('AkArtViewer', () => {
  const silverAsh = loadOperatorDetail('char_172_svrash')

  it('renders modal when open with zoom controls and stage toggles', async () => {
    const wrapper = await mountSuspended(AkArtViewer, {
      props: {
        modelValue: true,
        operator: silverAsh,
        activeStage: 'e2',
      },
      global: {
        stubs: {
          teleport: true,
        },
      },
    })

    expect(wrapper.find('.ak-art-viewer').exists()).toBe(true)
    expect(wrapper.find('.ak-art-viewer__art-img').exists()).toBe(true)

    // Stage toggle buttons
    const stageBtns = wrapper.findAll('.ak-art-viewer__thumb-btn')
    expect(stageBtns.length).toBe(2)

    // Zoom controls
    const zoomInBtn = wrapper.find('button[aria-label="Zoom in"]')
    expect(zoomInBtn.exists()).toBe(true)
    const zoomOutBtn = wrapper.find('button[aria-label="Zoom out"]')
    expect(zoomOutBtn.exists()).toBe(true)
  })

  it('emits update:activeStage when clicking stage button or arrow keys', async () => {
    const wrapper = await mountSuspended(AkArtViewer, {
      props: {
        modelValue: true,
        operator: silverAsh,
        activeStage: 'e2',
      },
      global: {
        stubs: {
          teleport: true,
        },
      },
    })

    const stageBtns = wrapper.findAll('.ak-art-viewer__thumb-btn')
    expect(stageBtns[0]).toBeDefined()
    await stageBtns[0]!.trigger('click')

    const emitted = wrapper.emitted('update:activeStage')
    expect(emitted).toBeTruthy()
    expect(emitted?.[0]?.[0]).toBe('e0')
  })

  it('emits update:modelValue false on close button click and Escape key', async () => {
    const wrapper = await mountSuspended(AkArtViewer, {
      props: {
        modelValue: true,
        operator: silverAsh,
        activeStage: 'e2',
      },
      global: {
        stubs: {
          teleport: true,
        },
      },
    })

    const closeBtn = wrapper.find('.ak-art-viewer__btn--close')
    expect(closeBtn.exists()).toBe(true)
    await closeBtn.trigger('click')

    const emitted = wrapper.emitted('update:modelValue')
    expect(emitted).toBeTruthy()
    expect(emitted?.[0]?.[0]).toBe(false)
  })
})
