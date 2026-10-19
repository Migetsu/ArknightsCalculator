import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import AkOperatorSkillsPanel from '~/components/operators/AkOperatorSkillsPanel.vue'
import AkItemIcon from '~/components/ui/AkItemIcon.vue'
import AkRangeGrid from '~/components/ui/AkRangeGrid.vue'
import type { OperatorSkill } from '~/../shared/schemas/operator'

describe('AkOperatorSkillsPanel', () => {
  const mockSkills: OperatorSkill[] = [
    {
      skillId: 'skchr_aglna2_1',
      icon: 'skchr_aglna2_1',
      levels: [
        {
          name: { en: 'Express Delivery', zh: '特快专递', source: 'official' },
          description: { en: '[Pending Translation]', zh: '被动技能', source: 'pending' },
          skillType: 'PASSIVE',
          spType: 8,
          spCost: 0,
          initSp: 0,
          duration: 60,
          blackboard: {},
        },
      ],
      masteryCosts: [
        {
          unlockCond: { phase: 2, level: 1 },
          levelUpCost: [
            { id: '3303', count: 8 },
            { id: '31104', count: 4 },
          ],
        },
        {
          unlockCond: { phase: 2, level: 1 },
          levelUpCost: [
            { id: '3303', count: 12 },
            { id: '30014', count: 4 },
          ],
        },
        {
          unlockCond: { phase: 2, level: 1 },
          levelUpCost: [
            { id: '3303', count: 15 },
            { id: '30165', count: 6 },
            { id: '31044', count: 1 },
          ],
        },
      ],
    },
    {
      skillId: 'skchr_aglna2_2',
      icon: 'skchr_aglna2_2',
      levels: [
        {
          name: { en: 'Customized Gravity', zh: '重力自定义', source: 'official' },
          description: { en: '[Pending Translation]', zh: '主动技能', source: 'pending' },
          skillType: 'MANUAL',
          spType: 'INCREASE_WITH_TIME',
          spCost: 25,
          initSp: 21,
          duration: 22,
          blackboard: { atk: 1.0 },
        },
      ],
      masteryCosts: [],
    },
  ]

  it('renders skill names and telemetry correctly', async () => {
    const wrapper = await mountSuspended(AkOperatorSkillsPanel, {
      props: { skills: mockSkills },
    })

    const skillCards = wrapper.findAll('.ak-operator-skills-panel__skill-card')
    expect(skillCards.length).toBe(2)
    expect(skillCards[0]?.text()).toContain('Express Delivery')
    expect(skillCards[1]?.text()).toContain('Customized Gravity')
  })

  it('hides duplicate passive badge when spType is 8', async () => {
    const wrapper = await mountSuspended(AkOperatorSkillsPanel, {
      props: { skills: mockSkills },
    })

    const skillCards = wrapper.findAll('.ak-operator-skills-panel__skill-card')
    const passiveBadges = skillCards[0]?.findAll('.ak-badge')
    // Should render only 1 badge (PASSIVE in amber), omitting the cyan spTypes.8 badge
    expect(passiveBadges?.length).toBe(1)
    expect(passiveBadges?.[0]?.text().toUpperCase()).toBe('PASSIVE')

    // Second skill has INCREASE_WITH_TIME and MANUAL
    const manualBadges = skillCards[1]?.findAll('.ak-badge')
    expect(manualBadges?.length).toBe(2)
    expect(manualBadges?.[0]?.text()).toBe('Auto Recovery')
    expect(manualBadges?.[1]?.text().toUpperCase()).toBe('MANUAL')
  })

  it('resolves item name, iconId, and tier for mastery levelUpCost items', async () => {
    // Generate full 10 levels for skill 1 so M3 is selectable
    const full10Skill: OperatorSkill = {
      ...mockSkills[0]!,
      levels: Array.from({ length: 10 }, () => ({
        ...mockSkills[0]!.levels[0]!,
        name: { en: 'Express Delivery', zh: '特快专递', source: 'official' },
      })),
    }

    const wrapper = await mountSuspended(AkOperatorSkillsPanel, {
      props: { skills: [full10Skill] },
    })

    // By default, max level (level 10 / M3) is selected
    const itemIcons = wrapper.findAllComponents(AkItemIcon)
    expect(itemIcons.length).toBe(3)

    // Item 1: 3303 (Skill Summary - 3)
    const icon3303 = itemIcons[0]
    expect(icon3303?.props('itemId')).toBe('3303')
    expect(icon3303?.props('iconId')).toBe('MTL_SKILL3')
    expect(icon3303?.props('name')).toBe('Skill Summary - 3')
    expect(icon3303?.props('tier')).toBe(4)
    expect(icon3303?.props('count')).toBe(15)

    // Item 2: 30165 (Rephasic Enantiomer)
    const icon30165 = itemIcons[1]
    expect(icon30165?.props('itemId')).toBe('30165')
    expect(icon30165?.props('iconId')).toBe('MTL_SL_DYT')
    expect(icon30165?.props('name')).toBe('Rephasic Enantiomer')
    expect(icon30165?.props('tier')).toBe(5)
    expect(icon30165?.props('count')).toBe(6)

    // Item 3: 31044 (Refined Solvent)
    const icon31044 = itemIcons[2]
    expect(icon31044?.props('itemId')).toBe('31044')
    expect(icon31044?.props('iconId')).toBe('MTL_SL_RS')
    expect(icon31044?.props('name')).toBe('Refined Solvent')
    expect(icon31044?.props('tier')).toBe(4)
    expect(icon31044?.props('count')).toBe(1)
  })

  it('renders empty message when no skills provided', async () => {
    const wrapper = await mountSuspended(AkOperatorSkillsPanel, {
      props: { skills: [] },
    })

    expect(wrapper.find('.ak-operator-skills-panel__empty').exists()).toBe(true)
  })

  it('renders inherited range when skill rangeId is null, and modified range when specified', async () => {
    const skillsWithRanges: OperatorSkill[] = [
      {
        skillId: 'sk_test_inherited',
        icon: null,
        levels: [
          {
            name: { en: 'Skill 1', zh: '技能1', source: 'official' },
            description: { en: 'Desc 1', zh: '描述1', source: 'official' },
            rangeId: null, // inherits defaultRangeId
            skillType: 'AUTO',
            spType: 1,
            spCost: 30,
            initSp: 0,
            duration: 10,
            blackboard: {},
          },
        ],
      },
      {
        skillId: 'sk_test_modified',
        icon: null,
        levels: [
          {
            name: { en: 'Skill 2', zh: '技能2', source: 'official' },
            description: { en: 'Desc 2', zh: '描述2', source: 'official' },
            rangeId: '3-4', // custom modified range
            skillType: 'MANUAL',
            spType: 1,
            spCost: 50,
            initSp: 20,
            duration: 30,
            blackboard: {},
          },
        ],
      },
    ]

    const wrapper = await mountSuspended(AkOperatorSkillsPanel, {
      props: {
        skills: skillsWithRanges,
        defaultRangeId: '3-1',
      },
    })

    const skillCards = wrapper.findAll('.ak-operator-skills-panel__skill-card')
    expect(skillCards).toHaveLength(2)

    // Skill 1: Inherited range '3-1'
    const range1 = skillCards[0]?.findComponent(AkRangeGrid)
    expect(range1?.exists()).toBe(true)
    expect(range1?.props('rangeId')).toBe('3-1')
    expect(range1?.props('variant')).toBe('inherited')

    // Skill 2: Modified range '3-4'
    const range2 = skillCards[1]?.findComponent(AkRangeGrid)
    expect(range2?.exists()).toBe(true)
    expect(range2?.props('rangeId')).toBe('3-4')
    expect(range2?.props('variant')).toBe('modified')
  })

  it('renders base skill levels (1 -> 7) section when allSkillLvlup is provided', async () => {
    const mockAllSkillLvlup = [
      {
        unlockCond: { phase: 0, level: 1 },
        lvlUpCost: [{ id: '3301', count: 5 }],
      },
      {
        unlockCond: { phase: 0, level: 1 },
        lvlUpCost: [
          { id: '3301', count: 5 },
          { id: '30031', count: 6 },
        ],
      },
      {
        unlockCond: { phase: 0, level: 1 },
        lvlUpCost: [{ id: '3302', count: 8 }],
      },
      {
        unlockCond: { phase: 1, level: 1 },
        lvlUpCost: [{ id: '3302', count: 8 }],
      },
      {
        unlockCond: { phase: 1, level: 1 },
        lvlUpCost: [{ id: '3302', count: 8 }],
      },
      {
        unlockCond: { phase: 1, level: 1 },
        lvlUpCost: [{ id: '3303', count: 8 }],
      },
    ]

    const wrapper = await mountSuspended(AkOperatorSkillsPanel, {
      props: {
        skills: mockSkills,
        allSkillLvlup: mockAllSkillLvlup,
      },
    })

    const baseSection = wrapper.find('.ak-operator-skills-panel__base-section')
    expect(baseSection.exists()).toBe(true)
    expect(baseSection.text()).toContain('Base Skill Levels (1 → 7)')
    expect(baseSection.text()).toContain('Total Materials (Lv 1 → 7)')

    // 6 Step cards rendered
    const steps = wrapper.findAll('.ak-operator-skills-panel__base-step')
    expect(steps).toHaveLength(6)
    expect(steps[0]!.text()).toContain('Lv 1 → Lv 2')
    expect(steps[0]!.text()).toContain('Req: E0 Lv 1')
    expect(steps[5]!.text()).toContain('Lv 6 → Lv 7')
    expect(steps[5]!.text()).toContain('Req: E1 Lv 1')
  })

  it('omits base skill levels section when allSkillLvlup is undefined or empty', async () => {
    const wrapper = await mountSuspended(AkOperatorSkillsPanel, {
      props: {
        skills: mockSkills,
        allSkillLvlup: [],
      },
    })

    const baseSection = wrapper.find('.ak-operator-skills-panel__base-section')
    expect(baseSection.exists()).toBe(false)
  })
})
