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

  describe('Regression: Cosmetic outfits with #1 and #2 suffixes', () => {
    function loadOperatorSkins(charId: string): Skin[] {
      const filePath = path.resolve(process.cwd(), 'data/skins.json')
      const raw = fs.readFileSync(filePath, 'utf-8')
      const allSkins = JSON.parse(raw) as Skin[]
      return allSkins.filter((s) => s.charId === charId)
    }

    const ifrit = loadOperatorDetail('char_134_ifrit')
    const ifritSkins = loadOperatorSkins('char_134_ifrit')

    it('retains cosmetic outfits ending in #1 (e.g. char_134_ifrit@summer#1) in availableVariants and opens on activeStage', async () => {
      // char_134_ifrit has 5 skins: 2 default (#1, #2) and 3 cosmetic (@kfc#1, @rilakkuma#1, @summer#1)
      expect(ifritSkins.length).toBe(5)
      const cosmeticCount = ifritSkins.filter((s) => !s.isDefault).length
      expect(cosmeticCount).toBe(3)

      const wrapper = await mountSuspended(AkArtViewer, {
        props: {
          modelValue: true,
          operator: ifrit,
          activeStage: 'char_134_ifrit@summer#1',
          skins: ifritSkins,
        },
        global: {
          stubs: {
            teleport: true,
          },
        },
      })

      // Expected variants: E0/E1 (1) + E2 (1) + 3 cosmetic outfits = 5 total
      const stageBtns = wrapper.findAll('.ak-art-viewer__thumb-btn')
      expect(stageBtns.length).toBe(1 + 1 + cosmeticCount)

      // Confirm all cosmetic outfits ending in #1 are present as buttons
      const btnTexts = stageBtns.map((b) => b.text())
      expect(btnTexts.some((t) => t.includes('Sunburn SS.SP'))).toBe(true)
      expect(btnTexts.some((t) => t.includes("Children's Party"))).toBe(true)
      expect(btnTexts.some((t) => t.includes('Relaxing Trip'))).toBe(true)

      // Active button must be the Sunburn skin, NOT e0 or e2
      const activeBtn = wrapper.find('.ak-art-viewer__thumb-btn--active')
      expect(activeBtn.exists()).toBe(true)
      expect(activeBtn.text()).toContain('Sunburn SS.SP')

      // Stage badge must display the outfit name
      const badge = wrapper.find('.ak-art-viewer__stage-badge')
      expect(badge.text()).toBe('SUNBURN SS.SP')
    })

    it('retains cosmetic outfits ending in #2 (e.g. char_010_chen@nian#2) in availableVariants and activates correctly', async () => {
      const chen = loadOperatorDetail('char_010_chen')
      const chenSkins = loadOperatorSkins('char_010_chen')
      const cosmeticCount = chenSkins.filter((s) => !s.isDefault).length

      const wrapper = await mountSuspended(AkArtViewer, {
        props: {
          modelValue: true,
          operator: chen,
          activeStage: 'char_010_chen@nian#2',
          skins: chenSkins,
        },
        global: {
          stubs: {
            teleport: true,
          },
        },
      })

      // 1 (E0) + 1 (E2) + cosmetic outfits
      const stageBtns = wrapper.findAll('.ak-art-viewer__thumb-btn')
      expect(stageBtns.length).toBe(2 + cosmeticCount)

      // Active button must be Ageless Afterglow (@nian#2), not e0 or e2
      const activeBtn = wrapper.find('.ak-art-viewer__thumb-btn--active')
      expect(activeBtn.exists()).toBe(true)
      expect(activeBtn.text()).toContain('Ageless Afterglow')

      const badge = wrapper.find('.ak-art-viewer__stage-badge')
      expect(badge.text()).toBe('AGELESS AFTERGLOW')
    })

    it('calculates total variants strictly equal to 1 (e0) + (1 if E2) + cosmetic count without dropping any #1/#2 outfits', async () => {
      // 1. Operator with no cosmetic skins and no E2 (Noir Corne char_500_noirc, 2★)
      const noir = loadOperatorDetail('char_500_noirc')
      const noirSkins = loadOperatorSkins('char_500_noirc')
      expect(noirSkins.filter((s) => !s.isDefault).length).toBe(0)

      const wrapperNoir = await mountSuspended(AkArtViewer, {
        props: {
          modelValue: true,
          operator: noir,
          skins: noirSkins,
        },
        global: {
          stubs: { teleport: true },
        },
      })
      // Exactly 1 variant (E0) -> footer navigation hidden
      const noirBtns = wrapperNoir.findAll('.ak-art-viewer__thumb-btn')
      expect(noirBtns.length).toBe(0)

      // 2. Operator without E2 but with a cosmetic outfit (Lancet-2 char_285_medic2, 1★ with boc#4)
      const lancet = loadOperatorDetail('char_285_medic2')
      const lancetSkins = loadOperatorSkins('char_285_medic2')
      const lancetCosmetic = lancetSkins.filter((s) => !s.isDefault)
      expect(lancetCosmetic.length).toBe(1)

      const wrapperLancet = await mountSuspended(AkArtViewer, {
        props: {
          modelValue: true,
          operator: lancet,
          skins: lancetSkins,
        },
        global: {
          stubs: { teleport: true },
        },
      })
      // 1 (E0) + 0 (no E2) + 1 (cosmetic) = 2 variants
      const lancetBtns = wrapperLancet.findAll('.ak-art-viewer__thumb-btn')
      expect(lancetBtns.length).toBe(1 + 0 + lancetCosmetic.length)

      // 3. Operator with E2 and multiple outfits ending in #1 and #2 (Ch'en char_010_chen)
      const chen = loadOperatorDetail('char_010_chen')
      const chenSkins = loadOperatorSkins('char_010_chen')
      const chenCosmetic = chenSkins.filter((s) => !s.isDefault)
      expect(chenCosmetic.length).toBeGreaterThan(0)

      const wrapperChen = await mountSuspended(AkArtViewer, {
        props: {
          modelValue: true,
          operator: chen,
          skins: chenSkins,
        },
        global: {
          stubs: { teleport: true },
        },
      })
      // 1 (E0) + 1 (E2) + cosmetic count
      const chenBtns = wrapperChen.findAll('.ak-art-viewer__thumb-btn')
      expect(chenBtns.length).toBe(1 + 1 + chenCosmetic.length)
    })
  })
})
