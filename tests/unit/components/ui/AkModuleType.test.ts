import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import AkModuleType from '~/components/ui/AkModuleType.vue'
import rawSilverAsh from '~/../data/operators/char_172_svrash.json'
import rawKaltsit from '~/../data/operators/char_003_kalts.json'

describe('AkModuleType', () => {
  it('does not render when type is empty, undefined, or whitespace', async () => {
    const wrapperEmpty = await mountSuspended(AkModuleType, {
      props: { type: '' },
    })
    expect(wrapperEmpty.find('.ak-module-type').exists()).toBe(false)

    const wrapperUndefined = await mountSuspended(AkModuleType, {
      props: { type: undefined },
    })
    expect(wrapperUndefined.find('.ak-module-type').exists()).toBe(false)

    const wrapperWhitespace = await mountSuspended(AkModuleType, {
      props: { type: '   ' },
    })
    expect(wrapperWhitespace.find('.ak-module-type').exists()).toBe(false)
  })

  it('does not render for SilverAsh initial module without typeName2', async () => {
    // SilverAsh has only initial badge in uniequip (typeName2 is empty string '')
    const initialMod = rawSilverAsh.modules?.[0]
    expect(initialMod?.typeName2 || '').toBe('')

    const wrapper = await mountSuspended(AkModuleType, {
      props: { type: initialMod?.typeName2 },
    })
    expect(wrapper.find('.ak-module-type').exists()).toBe(false)
  })

  it('renders X and Y badges for Kaltsit combat modules', async () => {
    // Kaltsit Mod X (uniequip_002_kalts) has typeName2 === 'X'
    const modX = rawKaltsit.modules?.find((m) => m.id === 'uniequip_002_kalts')
    expect(modX?.typeName2).toBe('X')

    const wrapperX = await mountSuspended(AkModuleType, {
      props: { type: modX?.typeName2 },
    })
    const badgeX = wrapperX.find('.ak-module-type')
    expect(badgeX.exists()).toBe(true)
    expect(badgeX.text()).toBe('X')
    expect(badgeX.classes()).toContain('ak-module-type--x')
    expect(badgeX.attributes('aria-label')).toBe('Module Type X')

    // Kaltsit Mod Y (uniequip_003_kalts) has typeName2 === 'Y'
    const modY = rawKaltsit.modules?.find((m) => m.id === 'uniequip_003_kalts')
    expect(modY?.typeName2).toBe('Y')

    const wrapperY = await mountSuspended(AkModuleType, {
      props: { type: modY?.typeName2 },
    })
    const badgeY = wrapperY.find('.ak-module-type')
    expect(badgeY.exists()).toBe(true)
    expect(badgeY.text()).toBe('Y')
    expect(badgeY.classes()).toContain('ak-module-type--y')
    expect(badgeY.attributes('aria-label')).toBe('Module Type Y')
  })

  it('normalizes D branch into Greek uppercase Delta (Δ) with Delta aria-label', async () => {
    const wrapperD = await mountSuspended(AkModuleType, {
      props: { type: 'D' },
    })
    const badgeD = wrapperD.find('.ak-module-type')
    expect(badgeD.exists()).toBe(true)
    expect(badgeD.text()).toBe('Δ')
    expect(badgeD.classes()).toContain('ak-module-type--delta')
    expect(badgeD.attributes('aria-label')).toBe('Module Type Delta')

    // Also handles direct Δ
    const wrapperDelta = await mountSuspended(AkModuleType, {
      props: { type: 'Δ' },
    })
    const badgeDelta = wrapperDelta.find('.ak-module-type')
    expect(badgeDelta.exists()).toBe(true)
    expect(badgeDelta.text()).toBe('Δ')
    expect(badgeDelta.classes()).toContain('ak-module-type--delta')
    expect(badgeDelta.attributes('aria-label')).toBe('Module Type Delta')
  })

  it('renders different size modifier classes correctly', async () => {
    const wrapperXs = await mountSuspended(AkModuleType, {
      props: { type: 'X', size: 'xs' },
    })
    expect(wrapperXs.find('.ak-module-type').classes()).toContain('ak-module-type--size-xs')

    const wrapperSm = await mountSuspended(AkModuleType, {
      props: { type: 'X', size: 'sm' },
    })
    expect(wrapperSm.find('.ak-module-type').classes()).toContain('ak-module-type--size-sm')

    const wrapperMd = await mountSuspended(AkModuleType, {
      props: { type: 'X', size: 'md' },
    })
    expect(wrapperMd.find('.ak-module-type').classes()).toContain('ak-module-type--size-md')
  })

  it('renders A, B, SP, alpha module type badges correctly', async () => {
    const wrapperA = await mountSuspended(AkModuleType, {
      props: { type: 'A' },
    })
    const badgeA = wrapperA.find('.ak-module-type')
    expect(badgeA.text()).toBe('A')
    expect(badgeA.classes()).toContain('ak-module-type--a')

    const wrapperB = await mountSuspended(AkModuleType, {
      props: { type: 'B' },
    })
    const badgeB = wrapperB.find('.ak-module-type')
    expect(badgeB.text()).toBe('B')
    expect(badgeB.classes()).toContain('ak-module-type--b')

    const wrapperAlpha = await mountSuspended(AkModuleType, {
      props: { type: 'α' },
    })
    const badgeAlpha = wrapperAlpha.find('.ak-module-type')
    expect(badgeAlpha.text()).toBe('α')
    expect(badgeAlpha.classes()).toContain('ak-module-type--alpha')
  })
})
