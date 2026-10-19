import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import fs from 'node:fs'
import path from 'node:path'
import type { OperatorDetail } from '../../../../shared/schemas/operator'
import type { Skin } from '../../../../shared/schemas/skin'
import AkOperatorSkinsPanel from '~/components/operators/AkOperatorSkinsPanel.vue'

function loadOperatorDetail(id: string): OperatorDetail {
  const filePath = path.resolve(process.cwd(), `data/operators/${id}.json`)
  const raw = fs.readFileSync(filePath, 'utf-8')
  return JSON.parse(raw) as OperatorDetail
}

describe('AkOperatorSkinsPanel', () => {
  const silverAsh = loadOperatorDetail('char_172_svrash')

  const mockSkins: Skin[] = [
    {
      skinId: 'char_172_svrash#1',
      charId: 'char_172_svrash',
      skinName: { en: 'Default', zh: '默认', source: 'official', isMachineTranslation: false },
      brandId: null,
      brandName: null,
      drawerList: ['Ryuzakiichi'],
      description: null,
      dialog: null,
      obtainApproach: null,
      isBuySkin: false,
      isDefault: true,
      price: null,
      priceStatus: 'default',
      priceSource: null,
      currency: null,
      illustId: 'illust_char_172_svrash_1',
      avatarId: 'char_172_svrash',
      portraitId: 'char_172_svrash_1',
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
      brandId: 'snow',
      brandName: {
        en: 'Icefield Messenger/I',
        zh: '冰原信使/I',
        source: 'official',
        isMachineTranslation: false,
      },
      drawerList: ['Ryuzakiichi'],
      description: {
        en: 'A warm tailored coat for cold regions.',
        zh: '专门定制的保暖外衣。',
        source: 'official',
        isMachineTranslation: false,
      },
      dialog: {
        en: 'The snow falls silently on the mountain.',
        zh: '雪静静地下在山上。',
        source: 'official',
        isMachineTranslation: false,
      },
      obtainApproach: {
        en: 'Store',
        zh: '时装商店',
        source: 'official',
        isMachineTranslation: false,
      },
      isBuySkin: true,
      isDefault: false,
      price: null,
      priceStatus: 'unknown',
      priceSource: null,
      currency: null,
      illustId: 'illust_char_172_svrash_snow#1',
      avatarId: 'char_172_svrash_snow#1',
      portraitId: 'char_172_svrash_snow#1',
      isCnOnly: false,
      servers: ['cn', 'en'],
    },
    {
      skinId: 'char_172_svrash@event#1',
      charId: 'char_172_svrash',
      skinName: {
        en: 'Karlan Herald',
        zh: '喀兰先驱',
        source: 'pending',
        isMachineTranslation: false,
      },
      brandId: 'test',
      brandName: {
        en: 'Test Collection',
        zh: '忒斯特收藏',
        source: 'pending',
        isMachineTranslation: false,
      },
      drawerList: ['Ryuzakiichi'],
      description: {
        en: 'Special ceremonial wear.',
        zh: '特别典礼服饰。',
        source: 'official',
        isMachineTranslation: false,
      },
      dialog: null,
      obtainApproach: {
        en: 'Event Reward',
        zh: '活动获得',
        source: 'official',
        isMachineTranslation: false,
      },
      isBuySkin: false,
      isDefault: false,
      price: null,
      priceStatus: 'free',
      priceSource: null,
      currency: null,
      illustId: 'illust_char_172_svrash_event#1',
      avatarId: 'char_172_svrash_event#1',
      portraitId: 'char_172_svrash_event#1',
      isCnOnly: true,
      servers: ['cn'],
    },
  ]

  it('renders empty state when no skins are present', async () => {
    const wrapper = await mountSuspended(AkOperatorSkinsPanel, {
      props: {
        operator: silverAsh,
        skins: [],
      },
    })

    expect(wrapper.find('.ak-empty-state').exists()).toBe(true)
    expect(wrapper.text()).toContain('NO OUTFITS CATALOGED')
  })

  it('renders all operator skins with correct honest status badges and no numeric prices', async () => {
    const wrapper = await mountSuspended(AkOperatorSkinsPanel, {
      props: {
        operator: silverAsh,
        skins: mockSkins,
      },
    })

    expect(wrapper.find('.ak-operator-skins-panel__grid').exists()).toBe(true)
    const cards = wrapper.findAll('.ak-operator-skins-panel__card')
    expect(cards.length).toBe(3)

    // Verify outfit names
    expect(wrapper.text()).toContain('Default')
    expect(wrapper.text()).toContain("York's Bise")
    expect(wrapper.text()).toContain('Karlan Herald')

    // Verify price status badges (Base, —, Free)
    expect(wrapper.text()).toContain('Base')
    expect(wrapper.text()).toContain('—')
    expect(wrapper.text()).toContain('Free')

    // CRITICAL: Mathematically verify NO numeric price appears in text (e.g. "18 OP" or "15 OP" or digits)
    expect(wrapper.text()).not.toMatch(/\b(?:15|18|21|24)\s*OP\b/i)
    expect(wrapper.text()).not.toMatch(/Originite Prime/i)
  })

  it('renders CN-only badge for CN exclusive skins', async () => {
    const wrapper = await mountSuspended(AkOperatorSkinsPanel, {
      props: {
        operator: silverAsh,
        skins: mockSkins,
      },
    })

    const cnCard = wrapper.find('.ak-operator-skins-panel__card--cn')
    expect(cnCard.exists()).toBe(true)
    expect(cnCard.text()).toContain('CN EXCLUSIVE')
  })

  it('renders PENDING translation badge for pending strings', async () => {
    const wrapper = await mountSuspended(AkOperatorSkinsPanel, {
      props: {
        operator: silverAsh,
        skins: mockSkins,
      },
    })

    const pendingBadges = wrapper.findAll('.ak-translation-badge--pending')
    expect(pendingBadges.length).toBeGreaterThan(0)
    expect(pendingBadges[0]?.text()).toContain('PENDING')
  })

  it('emits inspect event with skinId on click of inspect button or preview', async () => {
    const wrapper = await mountSuspended(AkOperatorSkinsPanel, {
      props: {
        operator: silverAsh,
        skins: mockSkins,
      },
    })

    const inspectButtons = wrapper.findAll('button')
    const inspectBtn = inspectButtons.find((b) => b.text().includes('Inspect Artwork'))
    expect(inspectBtn).toBeDefined()

    await inspectBtn!.trigger('click')
    const emitted = wrapper.emitted('inspect')
    expect(emitted).toBeTruthy()
    expect(emitted?.[0]?.[0]).toBe('char_172_svrash#1')
  })

  it('renders valid CDN artwork URLs for skin preview images without non-existent thumbs', async () => {
    const wrapper = await mountSuspended(AkOperatorSkinsPanel, {
      props: {
        operator: silverAsh,
        skins: mockSkins,
      },
    })

    const previewImages = wrapper.findAll('.ak-operator-skins-panel__preview-img')
    expect(previewImages.length).toBe(3)

    const firstImg = previewImages[0]!
    const src = firstImg.attributes('src')
    expect(src).toBeDefined()
    expect(src).toContain('cdn.jsdelivr.net/gh/yuanyan3060/ArknightsGameResource')
    expect(src).toContain('/portrait/char_172_svrash_1.png')
    expect(src).not.toContain('/skin/')
    expect(src).not.toContain('/art/thumbs/')

    // Trigger error event to test fallback to secondary CDN portrait
    await firstImg.trigger('error')
    const fallbackSrc = firstImg.attributes('src')
    expect(fallbackSrc).toContain('cdn.statically.io/gh/yuanyan3060/ArknightsGameResource')
    expect(fallbackSrc).toContain('/portrait/char_172_svrash_1.png')
  })
})
