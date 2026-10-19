import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import fs from 'node:fs'
import path from 'node:path'
import type { OperatorDetail } from '../../../../shared/schemas/operator'
import type { Skin } from '../../../../shared/schemas/skin'
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

  it('renders cosmetic skin tabs when skins prop is provided and switches to skin variant', async () => {
    const mockSkins = [
      {
        skinId: 'char_172_svrash#1',
        charId: 'char_172_svrash',
        skinName: { en: 'Default', zh: '默认', source: 'official', isMachineTranslation: false },
        isDefault: true,
        drawerList: [],
        isBuySkin: false,
        priceStatus: 'default',
        illustId: 'illust_1',
        avatarId: 'avatar_1',
        portraitId: 'portrait_1',
        isCnOnly: false,
        servers: ['cn', 'en'],
      },
      {
        skinId: 'char_172_svrash@snow#1',
        charId: 'char_172_svrash',
        skinName: {
          en: "York's Bise",
          zh: '约克郡的风',
          source: 'official',
          isMachineTranslation: false,
        },
        isDefault: false,
        drawerList: [],
        isBuySkin: true,
        priceStatus: 'unknown',
        illustId: 'illust_snow',
        avatarId: 'avatar_snow',
        portraitId: 'portrait_snow',
        isCnOnly: false,
        servers: ['cn', 'en'],
      },
    ]

    const wrapper = await mountSuspended(AkArtViewer, {
      props: {
        modelValue: true,
        operator: silverAsh,
        activeStage: 'e2',
        skins: mockSkins as unknown as Skin[],
      },
      global: {
        stubs: {
          teleport: true,
        },
      },
    })

    const stageBtns = wrapper.findAll('.ak-art-viewer__thumb-btn')
    // E0/E1 + E2 + York's Bise = 3 tabs
    expect(stageBtns.length).toBe(3)
    expect(wrapper.text()).toContain("York's Bise")

    // Click the cosmetic skin button
    const skinBtn = stageBtns.find((b) => b.text().includes("York's Bise"))
    expect(skinBtn).toBeDefined()
    await skinBtn!.trigger('click')

    const emitted = wrapper.emitted('update:activeStage')
    expect(emitted).toBeTruthy()
    expect(emitted?.[0]?.[0]).toBe('char_172_svrash@snow#1')
  })
})
