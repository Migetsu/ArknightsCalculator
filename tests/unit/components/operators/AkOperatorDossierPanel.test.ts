import { describe, expect, it } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import AkOperatorDossierPanel from '~/components/operators/AkOperatorDossierPanel.vue'
import { readOperatorDataFixture } from '../../support/operatorDataFixture'

const mockRequestFetch = (url: string) => readOperatorDataFixture(url)

mockNuxtImport('useRequestFetch', () => () => mockRequestFetch)

describe('AkOperatorDossierPanel', () => {
  it('renders basic profile and physical evaluation fields correctly for Amiya (char_002_amiya)', async () => {
    const wrapper = await mountSuspended(AkOperatorDossierPanel, {
      props: {
        charId: 'char_002_amiya',
      },
    })
    await flushPromises()

    // Profile section is rendered
    const profileSection = wrapper.find('[data-testid="dossier-profile-section"]')
    expect(profileSection.exists()).toBe(true)

    // Check specific profile fields in English
    const text = wrapper.text()
    expect(text).toContain('Code Name')
    expect(text).toContain('Amiya')
    expect(text).toContain('Gender')
    expect(text).toContain('Female')
    expect(text).toContain('Combat Experience')
    expect(text).toContain('3 years')
    expect(text).toContain('Place of Birth')
    expect(text).toContain('Rim Billiton')
    expect(text).toContain('Race')
    expect(text).toContain('Cautus/Chimera')
    expect(text).toContain('Height')
    expect(text).toContain('142cm')
    expect(text).toContain('Infection Status')

    // Physical exam section is rendered
    const physicalSection = wrapper.find('[data-testid="dossier-physical-section"]')
    expect(physicalSection.exists()).toBe(true)
    expect(text).toContain('Physical Strength')
    expect(text).toContain('Mobility')
    expect(text).toContain('Standard')
    expect(text).toContain('Tactical Acumen')
    expect(text).toContain('Excellent')
    expect(text).toContain('Combat Skill')
    expect(text).toContain('Originium Arts Assimilation')
  })

  it('renders archival stories in canonical order for Amiya', async () => {
    const wrapper = await mountSuspended(AkOperatorDossierPanel, {
      props: {
        charId: 'char_002_amiya',
      },
    })

    const storiesSection = wrapper.find('[data-testid="dossier-stories-section"]')
    expect(storiesSection.exists()).toBe(true)

    const storyTitles = storiesSection.findAll('.ak-operator-dossier-panel__story-title')
    expect(storyTitles.length).toBe(4)

    // Canonical order: Basic Info comes first, then Profile, then Clinical Analysis
    expect(storyTitles[0]?.text()).toBe('Basic Info')
    expect(storyTitles[1]?.text()).toBe('Profile')
    expect(storyTitles[2]?.text()).toBe('Clinical Analysis')
    expect(storyTitles[3]?.text()).toBe('Clinical Analysis')

    // First story body is expanded by default
    expect(storiesSection.find('.ak-operator-dossier-panel__story-body').exists()).toBe(true)
    expect(storiesSection.find('.ak-operator-dossier-panel__story-text').text()).toContain(
      '[Code Name] Amiya',
    )
  })

  it('displays PATCH class conversion stories in dedicated section with form badges', async () => {
    const wrapper = await mountSuspended(AkOperatorDossierPanel, {
      props: {
        charId: 'char_002_amiya',
      },
    })

    const patchSection = wrapper.find('[data-testid="dossier-patch-section"]')
    expect(patchSection.exists()).toBe(true)

    const patchStoryTitles = patchSection.findAll('.ak-operator-dossier-panel__story-title')
    expect(patchStoryTitles.length).toBe(2)
    expect(patchStoryTitles[0]?.text()).toBe('Class Conversion Record 1')
    expect(patchStoryTitles[1]?.text()).toBe('Class Conversion Record 2')

    // Badges identify the class forms (Guard and Medic)
    const formBadges = patchSection.findAll('.ak-operator-dossier-panel__patch-form-badge')
    expect(formBadges.length).toBe(2)
    expect(formBadges[0]?.text()).toContain('Guard')
    expect(formBadges[1]?.text()).toContain('Medic')
  })

  it('handles absent handbook data gracefully (char_1001_amiya2) without errors or visual junk', async () => {
    const wrapper = await mountSuspended(AkOperatorDossierPanel, {
      props: {
        charId: 'char_1001_amiya2',
      },
    })

    // Renders nothing (empty/null state), no broken cards or containers
    expect(wrapper.find('.ak-operator-dossier-panel').exists()).toBe(false)
    expect(wrapper.find('[data-testid="dossier-profile-section"]').exists()).toBe(false)
    expect(wrapper.text()).toBe('')
  })

  it('renders translation badges for machine translations on CN-only operators (char_4217_makoto)', async () => {
    const wrapper = await mountSuspended(AkOperatorDossierPanel, {
      props: {
        charId: 'char_4217_makoto',
      },
    })

    expect(wrapper.find('.ak-operator-dossier-panel').exists()).toBe(true)

    // Makoto has machine translation badges
    const badges = wrapper.findAll('.ak-translation-badge--machine')
    expect(badges.length).toBeGreaterThan(0)

    // Check that badge has MT text
    const badgeTexts = badges.map((b) => b.text())
    expect(badgeTexts).toContain('MT')

    // Confirm no raw CJK characters appear in the English rendered view of Makoto's profile fields
    const cjkRegex = /[\u4e00-\u9fa5]/
    const labels = wrapper.findAll('.ak-operator-dossier-panel__label')
    for (const label of labels) {
      expect(label.text()).not.toMatch(cjkRegex)
    }
  })

  it('toggles accordion story state on click', async () => {
    const wrapper = await mountSuspended(AkOperatorDossierPanel, {
      props: {
        charId: 'char_002_amiya',
      },
    })

    const storiesSection = wrapper.find('[data-testid="dossier-stories-section"]')
    const toggleButtons = storiesSection.findAll('.ak-operator-dossier-panel__story-toggle')
    expect(toggleButtons.length).toBe(4)

    // Story 0 is open by default
    expect(toggleButtons[0]?.attributes('aria-expanded')).toBe('true')
    expect(toggleButtons[1]?.attributes('aria-expanded')).toBe('false')

    // Click Story 1 to open
    await toggleButtons[1]?.trigger('click')
    expect(toggleButtons[1]?.attributes('aria-expanded')).toBe('true')

    // Click Story 0 to collapse
    await toggleButtons[0]?.trigger('click')
    expect(toggleButtons[0]?.attributes('aria-expanded')).toBe('false')
  })
})
