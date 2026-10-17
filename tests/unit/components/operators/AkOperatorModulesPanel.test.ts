import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import AkOperatorModulesPanel from '~/components/operators/AkOperatorModulesPanel.vue'
import AkItemIcon from '~/components/ui/AkItemIcon.vue'
import type { OperatorModule } from '~/../shared/schemas/operator'

describe('AkOperatorModulesPanel', () => {
  const mockModules: OperatorModule[] = [
    {
      id: 'uniequip_001_kalts',
      name: {
        en: "Kal'tsit's Badge",
        zh: '凯尔希证章',
        source: 'official',
        isMachineTranslation: false,
      },
      type: 'INITIAL',
      typeName2: '',
      icon: 'uniequip_001_kalts',
      description: {
        en: "Kal'tsit has demonstrated a remarkable aptitude for healing teammates in the field.",
        zh: '凯尔希擅长在战场上为干员提供治疗',
        source: 'official',
        isMachineTranslation: false,
      },
      servers: ['cn', 'global'],
      stages: [],
    },
    {
      id: 'uniequip_002_kalts',
      name: {
        en: 'Harmonious Convergence',
        zh: '合声',
        source: 'official',
        isMachineTranslation: false,
      },
      type: 'ADVANCED',
      typeName2: 'MED-X',
      icon: 'uniequip_002_kalts',
      description: {
        en: 'The wind and sand kissed the sky, and by an oasis pool in the distance, a wandering merchant rested.',
        zh: '风沙亲吻着天空，远处的绿洲水池边，有行脚商在歇脚。',
        source: 'official',
        isMachineTranslation: false,
      },
      servers: ['cn', 'global'],
      stages: [
        {
          stage: 1,
          stats: { atk: 35, def: 15 },
          parts: [
            {
              target: 'TRAIT',
              candidates: [
                {
                  additionalDescription: {
                    en: 'When healing allied units with less than 50% HP, increases heal amount by 15%',
                    zh: '治疗生命值低于50%的友方单位时治疗量提升15%',
                    source: 'official',
                    isMachineTranslation: false,
                  },
                  blackboard: { heal_scale: 1.15 },
                  requiredPotentialRank: 0,
                },
              ],
            },
          ],
          cost: [
            { id: 'mod_unlock_token', count: 4 },
            { id: '4001', count: 80000 },
          ],
        },
        {
          stage: 2,
          stats: { atk: 50, def: 20 },
          parts: [
            {
              target: 'TRAIT',
              candidates: [
                {
                  additionalDescription: {
                    en: 'When healing allied units with less than 50% HP, increases heal amount by 15%',
                    zh: '治疗生命值低于50%的友方单位时治疗量提升15%',
                    source: 'official',
                    isMachineTranslation: false,
                  },
                  blackboard: { heal_scale: 1.15 },
                  requiredPotentialRank: 0,
                },
              ],
            },
            {
              target: 'TALENT_DATA_ONLY',
              candidates: [
                {
                  upgradeDescription: {
                    en: 'When Mon3tr is defeated or drops below 50% HP, enemies in 8 tiles receive {value} True damage',
                    zh: 'Mon3tr在生命值首次低于50%和被击倒后使周围8格内所有敌人受到{value}点真实伤害',
                    source: 'official',
                    isMachineTranslation: false,
                  },
                  requiredPotentialRank: 0,
                },
              ],
            },
            {
              // Purely numeric data-only part with no description
              target: 'TALENT',
              candidates: [
                {
                  blackboard: { value: 1200, stun: 3 },
                  requiredPotentialRank: 0,
                },
              ],
            },
          ],
          cost: [
            { id: 'mod_unlock_token', count: 4 },
            { id: '4001', count: 100000 },
          ],
        },
      ],
    },
  ]

  it('renders module lore dossier for initial badges', async () => {
    const wrapper = await mountSuspended(AkOperatorModulesPanel, {
      props: { modules: mockModules },
    })

    const initialCard = wrapper.findAll('.ak-operator-modules-panel__module-card')[0]
    expect(initialCard?.find('.ak-operator-modules-panel__dossier-box').exists()).toBe(true)
    expect(initialCard?.find('.ak-operator-modules-panel__dossier-text').text()).toContain(
      "Kal'tsit has demonstrated a remarkable aptitude",
    )
  })

  it('renders module lore dossier for advanced modules', async () => {
    const wrapper = await mountSuspended(AkOperatorModulesPanel, {
      props: { modules: mockModules },
    })

    const advancedCard = wrapper.findAll('.ak-operator-modules-panel__module-card')[1]
    expect(advancedCard?.find('.ak-operator-modules-panel__dossier-box').exists()).toBe(true)
    expect(advancedCard?.find('.ak-operator-modules-panel__dossier-text').text()).toContain(
      'The wind and sand kissed the sky',
    )
  })

  it('omits empty parts with no candidate text descriptions', async () => {
    const wrapper = await mountSuspended(AkOperatorModulesPanel, {
      props: { modules: mockModules },
    })

    const advancedCard = wrapper.findAll('.ak-operator-modules-panel__module-card')[1]
    // Switch to Stage 2 (which has 1 trait part, 1 talent part with description, and 1 talent part with ONLY blackboard)
    const stageBtns = advancedCard?.findAll('.ak-operator-modules-panel__stages-bar button')
    await stageBtns?.[1]?.trigger('click')

    const partBlocks = advancedCard?.findAll('.ak-operator-modules-panel__part-block')
    // Should render only 2 parts, omitting the 3rd part that has no text descriptions
    expect(partBlocks?.length).toBe(2)

    // Verify interpolated blackboard value from stage-merged blackboard
    expect(partBlocks?.[1]?.text()).toContain('1200')
  })

  it('resolves item name LMD for currency 4001 in upgrade requirements', async () => {
    const wrapper = await mountSuspended(AkOperatorModulesPanel, {
      props: { modules: mockModules },
    })

    const advancedCard = wrapper.findAll('.ak-operator-modules-panel__module-card')[1]
    const itemIcons = advancedCard?.findAllComponents(AkItemIcon)
    const lmdIcon = itemIcons?.find((icon) => icon.props('itemId') === '4001')

    expect(lmdIcon?.exists()).toBe(true)
    expect(lmdIcon?.props('name')).toBe('LMD')
  })
})
