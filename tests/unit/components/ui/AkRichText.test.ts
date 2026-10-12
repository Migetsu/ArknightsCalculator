import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import AkRichText from '~/components/ui/AkRichText.vue'

describe('AkRichText', () => {
  it('renders plain text into the DOM container without HTML markup', async () => {
    const wrapper = await mountSuspended(AkRichText, {
      props: {
        text: 'Basic tactical description',
      },
    })

    expect(wrapper.text()).toContain('Basic tactical description')
    expect(wrapper.find('.ak-rich-text').exists()).toBe(true)
    expect(wrapper.find('.ak-rich-text__highlight').exists()).toBe(false)
  })

  it('renders highlights with appropriate BEM classes and interpolates blackboard', async () => {
    const wrapper = await mountSuspended(AkRichText, {
      props: {
        text: 'ATK increases by <@ba.vup>+{atk_scale:0%}</> and DEF by <@ba.vdown>-{def:0%}</>',
        blackboard: {
          atk_scale: 0.5,
          def: 0.2,
        },
      },
    })

    expect(wrapper.text()).toContain('ATK increases by +50% and DEF by -20%')
    const vup = wrapper.find('.ak-rich-text__highlight--vup')
    expect(vup.exists()).toBe(true)
    expect(vup.text()).toBe('+50%')

    const vdown = wrapper.find('.ak-rich-text__highlight--vdown')
    expect(vdown.exists()).toBe(true)
    expect(vdown.text()).toBe('-20%')
  })

  it('renders interactive term pills with accessibility attributes', async () => {
    const wrapper = await mountSuspended(AkRichText, {
      props: {
        text: 'Inflicts <$ba.stun>Stun</> on target',
      },
    })

    const term = wrapper.find('.ak-rich-text__term')
    expect(term.exists()).toBe(true)
    expect(term.attributes('role')).toBe('button')
    expect(term.attributes('tabindex')).toBe('0')
    expect(term.attributes('aria-expanded')).toBe('false')

    // Popover is unmounted by default
    expect(wrapper.find('.ak-rich-text__term-popover').exists()).toBe(false)
  })

  it('toggles term popover on click and keyboard activation (Enter / Space)', async () => {
    const wrapper = await mountSuspended(AkRichText, {
      props: {
        text: 'Target is <$ba.sleep>Asleep</>',
      },
    })

    const term = wrapper.find('.ak-rich-text__term')
    expect(term.exists()).toBe(true)

    // Click to open
    await term.trigger('click')
    expect(term.attributes('aria-expanded')).toBe('true')
    expect(wrapper.find('.ak-rich-text__term-popover').exists()).toBe(true)
    expect(wrapper.find('.ak-rich-text__term-title').text()).toBe('Sleep')

    // Click again to close
    await term.trigger('click')
    expect(term.attributes('aria-expanded')).toBe('false')
    expect(wrapper.find('.ak-rich-text__term-popover').exists()).toBe(false)

    // Keyboard Enter to open
    await term.trigger('keydown', { key: 'Enter' })
    expect(term.attributes('aria-expanded')).toBe('true')
    expect(wrapper.find('.ak-rich-text__term-popover').exists()).toBe(true)

    // Keyboard Escape to close
    await term.trigger('keydown', { key: 'Escape' })
    expect(term.attributes('aria-expanded')).toBe('false')
    expect(wrapper.find('.ak-rich-text__term-popover').exists()).toBe(false)
  })

  it('renders line breaks as <br> elements', async () => {
    const wrapper = await mountSuspended(AkRichText, {
      props: {
        text: 'First line\nSecond line',
      },
    })

    expect(wrapper.findAll('br').length).toBe(1)
  })
})
