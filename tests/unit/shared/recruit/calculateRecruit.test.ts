import { describe, it, expect } from 'vitest'
import { calculateRecruit } from '../../../../shared/utils/recruit/calculateRecruit'
import type { RecruitOperator } from '../../../../shared/schemas/recruit'
import recruitData from '../../../../data/recruit.json'

const MOCK_POOL: RecruitOperator[] = [
  {
    id: 'char_172_svrash',
    name: { en: 'SilverAsh', zh: '银灰' },
    rarity: 6,
    class: 'WARRIOR',
    position: 'MELEE',
    tags: ['Top Operator', 'Guard', 'Melee', 'DPS', 'Support'],
    hasIcon: true,
  },
  {
    id: 'char_102_texas',
    name: { en: 'Texas', zh: '德克萨斯' },
    rarity: 5,
    class: 'PIONEER',
    position: 'MELEE',
    tags: ['Senior Operator', 'Vanguard', 'Melee', 'DP-Recovery', 'Crowd-Control'],
    hasIcon: true,
  },
  {
    id: 'char_143_ghost',
    name: { en: 'Specter', zh: '幽灵鲨' },
    rarity: 5,
    class: 'WARRIOR',
    position: 'MELEE',
    tags: ['Senior Operator', 'Guard', 'Melee', 'DPS', 'Survival'],
    hasIcon: true,
  },
  {
    id: 'char_237_gravel',
    name: { en: 'Gravel', zh: '砾' },
    rarity: 4,
    class: 'SPECIAL',
    position: 'MELEE',
    tags: ['Specialist', 'Melee', 'Fast-Redeploy', 'Defense'],
    hasIcon: true,
  },
  {
    id: 'char_208_melan',
    name: { en: 'Melantha', zh: '玫兰莎' },
    rarity: 3,
    class: 'WARRIOR',
    position: 'MELEE',
    tags: ['Guard', 'Melee', 'DPS', 'Survival'],
    hasIcon: true,
  },
  {
    id: 'char_500_noirc',
    name: { en: 'Noir Corne', zh: '黑角' },
    rarity: 2,
    class: 'TANK',
    position: 'MELEE',
    tags: ['Starter', 'Defender', 'Melee'],
    hasIcon: true,
  },
  {
    id: 'char_286_cast3',
    name: { en: 'Castle-3', zh: '近卫近卫机械' },
    rarity: 1,
    class: 'WARRIOR',
    position: 'MELEE',
    tags: ['Robot', 'Guard', 'Melee', 'Support'],
    hasIcon: true,
  },
]

describe('calculateRecruit engine', () => {
  it('returns empty array when no tags are selected or pool is empty', () => {
    expect(calculateRecruit([], MOCK_POOL)).toEqual([])
    expect(calculateRecruit(['DPS'], [])).toEqual([])
  })

  it('excludes 6-star operators when Top Operator is not selected', () => {
    const results = calculateRecruit(['DPS'], MOCK_POOL)
    const dpsCombo = results.find((r) => r.tags.length === 1 && r.tags[0] === 'DPS')
    expect(dpsCombo).toBeDefined()

    const opIds = dpsCombo!.operators.map((o) => o.id)
    expect(opIds).not.toContain('char_172_svrash') // SilverAsh must be excluded!
    expect(opIds).toContain('char_143_ghost') // Specter (5★)
    expect(opIds).toContain('char_208_melan') // Melantha (3★)
    expect(dpsCombo!.guaranteeTier).toBe('3_star_plus')
    expect(dpsCombo!.minRarity).toBe(3)
  })

  it('includes 6-star operators when Top Operator is selected and assigns 6_star guarantee tier', () => {
    const results = calculateRecruit(['Top Operator', 'DPS'], MOCK_POOL)
    const combo = results.find((r) => r.tags.includes('Top Operator') && r.tags.includes('DPS'))
    expect(combo).toBeDefined()

    expect(combo!.operators.map((o) => o.id)).toContain('char_172_svrash')
    expect(combo!.guaranteeTier).toBe('6_star')
    expect(combo!.minRarity).toBe(6)
  })

  it('guarantees 5-star when Senior Operator or only 5-star units match', () => {
    const results = calculateRecruit(['Crowd-Control'], MOCK_POOL)
    expect(results.length).toBe(1)
    expect(results[0]?.guaranteeTier).toBe('5_star')
    expect(results[0]?.operators[0]?.id).toBe('char_102_texas')
    expect(results[0]?.minRarity).toBe(5)
  })

  it('guarantees 4-star when min rarity is 4', () => {
    const results = calculateRecruit(['Fast-Redeploy'], MOCK_POOL)
    expect(results.length).toBe(1)
    expect(results[0]?.guaranteeTier).toBe('4_star')
    expect(results[0]?.operators[0]?.id).toBe('char_237_gravel')
    expect(results[0]?.minRarity).toBe(4)
  })

  it('handles 1-star robot threshold and assigns robot tier', () => {
    const results = calculateRecruit(['Robot', 'Guard'], MOCK_POOL)
    const robotGuard = results.find((r) => r.tags.includes('Robot') && r.tags.includes('Guard'))
    expect(robotGuard).toBeDefined()
    expect(robotGuard!.guaranteeTier).toBe('robot')
    expect(robotGuard!.hasRobot).toBe(true)
    expect(robotGuard!.operators.length).toBe(1)
    expect(robotGuard!.operators[0]?.id).toBe('char_286_cast3')
  })

  it('excludes 1-star and 2-star from standard 9:00 combos when Robot or Starter are not picked', () => {
    const results = calculateRecruit(['Guard'], MOCK_POOL)
    const guardCombo = results.find((r) => r.tags.length === 1 && r.tags[0] === 'Guard')
    expect(guardCombo).toBeDefined()

    const opIds = guardCombo!.operators.map((o) => o.id)
    expect(opIds).not.toContain('char_286_cast3') // Castle-3 (1★ robot excluded)
    expect(opIds).not.toContain('char_500_noirc') // 2★ excluded
    expect(opIds).not.toContain('char_172_svrash') // 6★ excluded (no Top Operator)
    expect(opIds).toContain('char_143_ghost')
    expect(opIds).toContain('char_208_melan')
    expect(guardCombo!.minRarity).toBe(3)
  })

  it('generates all subsets of length 1, 2, 3 for 3 selected tags', () => {
    const results = calculateRecruit(['Top Operator', 'Guard', 'DPS'], MOCK_POOL)
    // Subsets of 3 items: 3 of len 1, 3 of len 2, 1 of len 3 = 7 total potential combos
    const tagsSet = results.map((r) => r.tags.join('+'))
    expect(tagsSet).toContain('DPS')
    expect(tagsSet).toContain('Guard')
    expect(tagsSet).toContain('Top Operator')
    expect(tagsSet).toContain('DPS+Guard')
    expect(tagsSet).toContain('DPS+Top Operator')
    expect(tagsSet).toContain('Guard+Top Operator')
    expect(tagsSet).toContain('DPS+Guard+Top Operator')
  })

  it('sorts higher guarantee tiers first', () => {
    const results = calculateRecruit(['Top Operator', 'Fast-Redeploy', 'DPS'], MOCK_POOL)
    expect(results[0]?.guaranteeTier).toBe('6_star')
    const fourStar = results.find((r) => r.guaranteeTier === '4_star')
    const threeStar = results.find((r) => r.guaranteeTier === '3_star_plus')

    expect(results.indexOf(results[0]!)).toBeLessThan(results.indexOf(fourStar!))
    expect(results.indexOf(fourStar!)).toBeLessThan(results.indexOf(threeStar!))
  })

  it('correctly calculates recruit combinations with real generated dataset', () => {
    const globalPool = recruitData.pools.global as RecruitOperator[]
    expect(globalPool.length).toBeGreaterThanOrEqual(140)

    // SilverAsh combo
    const saResults = calculateRecruit(['Top Operator', 'DPS'], globalPool)
    const topDps = saResults.find((r) => r.tags.includes('Top Operator') && r.tags.includes('DPS'))
    expect(topDps).toBeDefined()
    expect(topDps!.guaranteeTier).toBe('6_star')
    expect(topDps!.operators.some((o) => o.id === 'char_172_svrash')).toBe(true)

    // Senior Operator in real recruit pool is guaranteed 5★
    const soResults = calculateRecruit(['Senior Operator'], globalPool)
    expect(soResults[0]?.guaranteeTier).toBe('5_star')
    expect(soResults[0]?.minRarity).toBe(5)

    // Crowd-Control in real recruit pool is guaranteed 4★+ (Click, Indigo, Texas, etc.)
    const ccResults = calculateRecruit(['Crowd-Control'], globalPool)
    expect(ccResults[0]?.guaranteeTier).toBe('4_star')
    expect(ccResults[0]?.minRarity).toBe(4)

    // Crowd-Control + Vanguard is guaranteed 5★ (Texas)
    const texasResults = calculateRecruit(['Crowd-Control', 'Vanguard'], globalPool)
    const ccVanguard = texasResults.find(
      (r) => r.tags.includes('Crowd-Control') && r.tags.includes('Vanguard'),
    )
    expect(ccVanguard).toBeDefined()
    expect(ccVanguard!.guaranteeTier).toBe('5_star')
    expect(ccVanguard!.minRarity).toBe(5)
    expect(ccVanguard!.operators[0]?.id).toBe('char_102_texas')

    // Fast-Redeploy in real recruit pool is guaranteed 4★+
    const frResults = calculateRecruit(['Fast-Redeploy'], globalPool)
    expect(frResults[0]?.guaranteeTier).toBe('4_star')
    expect(frResults[0]?.minRarity).toBe(4)

    // Robot in real recruit pool is robot tier
    const robotResults = calculateRecruit(['Robot'], globalPool)
    expect(robotResults[0]?.guaranteeTier).toBe('robot')
    expect(robotResults[0]?.hasRobot).toBe(true)
  })
})
