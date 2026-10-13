import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import AkTranslationBadge from '~/components/ui/AkTranslationBadge.vue'

describe('AkTranslationBadge', () => {
  it('does not render when translation is official and not stale', async () => {
    const wrapper = await mountSuspended(AkTranslationBadge, {
      props: {
        source: 'official',
        stale: false,
      },
    })

    expect(wrapper.find('.ak-translation-badge').exists()).toBe(false)
  })

  it('renders MT badge when source is machine', async () => {
    const wrapper = await mountSuspended(AkTranslationBadge, {
      props: {
        source: 'machine',
        stale: false,
      },
    })

    const badge = wrapper.find('.ak-translation-badge')
    expect(badge.exists()).toBe(true)
    expect(badge.classes()).toContain('ak-translation-badge--machine')
    expect(badge.text()).toContain('MT')
    expect(badge.attributes('title')).toBe(
      'Machine translation (not verified with official EN glossary)',
    )
  })

  it('renders STALE badge when translation is stale', async () => {
    const wrapper = await mountSuspended(AkTranslationBadge, {
      props: {
        source: 'official',
        stale: true,
      },
    })

    const badge = wrapper.find('.ak-translation-badge')
    expect(badge.exists()).toBe(true)
    expect(badge.classes()).toContain('ak-translation-badge--stale')
    expect(badge.text()).toContain('STALE')
    expect(badge.attributes('title')).toBe('Outdated translation (CN source text has been updated)')
  })
})
