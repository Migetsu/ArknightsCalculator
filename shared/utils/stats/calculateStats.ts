import type { OperatorDetail } from '../../schemas/operator'
import {
  CalculateStatsOptionsSchema,
  type CalculateStatsOptions,
  type CalculatedStatsResult,
  type StatBreakdown,
} from './types'

/**
 * Parses potential rank text description into numeric attribute additions.
 * Handles both EN and ZH text glossaries.
 */
export function parsePotentialModifier(descEn?: string, descZh?: string): Partial<StatBreakdown> {
  const result: Partial<StatBreakdown> = {}
  const text = `${descEn ?? ''} ${descZh ?? ''}`

  // 1. Deployment Cost (DP)
  const costMatch = text.match(/DP Cost ([+-]?\d+)/i) || text.match(/部署费用([+-]?\d+)/)
  if (costMatch?.[1]) result.cost = parseInt(costMatch[1], 10)

  // 2. Redeployment Time (sec)
  const respawnMatch =
    text.match(/Redeployment Time ([+-]?\d+)/i) || text.match(/再部署时间([+-]?\d+)/)
  if (respawnMatch?.[1]) result.respawnTime = parseInt(respawnMatch[1], 10)

  // 3. Attack Power (ATK)
  const atkMatch = text.match(/ATK ([+-]?\d+)/i) || text.match(/攻击力([+-]?\d+)/)
  if (atkMatch?.[1]) result.atk = parseInt(atkMatch[1], 10)

  // 4. Physical Defense (DEF)
  const defMatch = text.match(/DEF ([+-]?\d+)/i) || text.match(/防御力([+-]?\d+)/)
  if (defMatch?.[1]) result.def = parseInt(defMatch[1], 10)

  // 5. Max HP
  const hpMatch =
    text.match(/Max HP ([+-]?\d+)/i) ||
    text.match(/生命上限([+-]?\d+)/) ||
    text.match(/最大生命值([+-]?\d+)/)
  if (hpMatch?.[1]) result.hp = parseInt(hpMatch[1], 10)

  // 6. Magic Resistance (RES)
  const resMatch = text.match(/RES ([+-]?\d+)/i) || text.match(/法术抗性([+-]?\d+)/)
  if (resMatch?.[1]) result.res = parseInt(resMatch[1], 10)

  return result
}

/**
 * Standard Arknights level cap lookup by rarity and elite stage.
 */
export const MAX_LEVEL_BY_RARITY: Record<number, number[]> = {
  1: [30],
  2: [30],
  3: [40, 55],
  4: [45, 60, 70],
  5: [50, 70, 80],
  6: [50, 80, 90],
}

/**
 * Calculates complete operator battle attributes for a given progression configuration.
 *
 * Calculation Rules:
 * 1. Base Attributes: Linear interpolation between level 1 and maxLevel keyframes for the specified phase.
 *    Rounded using Math.round.
 * 2. Trust scaling: Linear scaling from 0 to 100% of maximum favor attribute bonuses.
 * 3. Potential bonuses: Cumulatively adds stat buffs unlocked up to the operator's current potential (1..6).
 * 4. Module stage stats: Adds flat stat bonuses granted by the chosen module up to the specified stage (1..3).
 *
 * @param operator Full OperatorDetail data
 * @param options Calculation options: elite phase, level, trust, potential, and module stage
 * @throws Error when elite phase, level, or module parameters exceed operator limits.
 */
export function calculateOperatorStats(
  operator: OperatorDetail,
  rawOptions: CalculateStatsOptions,
): CalculatedStatsResult {
  const options = CalculateStatsOptionsSchema.parse(rawOptions)

  // 1. Validate elite phase availability
  const phaseIndex = options.elite
  const phaseData = operator.phases[phaseIndex]
  if (!phaseData) {
    throw new Error(
      `Invalid elite phase ${options.elite} for operator ${operator.id} (max phase: ${operator.phases.length - 1})`,
    )
  }

  // 2. Validate level limits using constants / operator phase data
  const allowedMaxLevels = MAX_LEVEL_BY_RARITY[operator.rarity]
  const expectedMaxLevel = allowedMaxLevels?.[phaseIndex] ?? phaseData.maxLevel
  if (options.level < 1 || options.level > expectedMaxLevel) {
    throw new Error(
      `Invalid level ${options.level} for operator ${operator.id} at elite ${options.elite} (must be between 1 and ${expectedMaxLevel})`,
    )
  }

  // 3. Calculate Base Attributes via linear interpolation between keyframes
  const keyFrames = phaseData.attributesKeyFrames
  if (!keyFrames || keyFrames.length === 0) {
    throw new Error(
      `Missing attributesKeyFrames for operator ${operator.id} at elite ${options.elite}`,
    )
  }

  const kfMin = keyFrames[0]!
  const kfMax = keyFrames[keyFrames.length - 1]!

  let t = 0
  if (kfMax.level > kfMin.level) {
    t = (options.level - kfMin.level) / (kfMax.level - kfMin.level)
  }

  const interpolate = (minVal: number, maxVal: number): number => {
    return Math.round(minVal + (maxVal - minVal) * t)
  }

  const baseHp = interpolate(kfMin.data.maxHp, kfMax.data.maxHp)
  const baseAtk = interpolate(kfMin.data.atk, kfMax.data.atk)
  const baseDef = interpolate(kfMin.data.def, kfMax.data.def)
  // Non-interpolated stats (constant per phase)
  const baseRes = kfMin.data.magicResistance ?? 0
  const baseCost = kfMin.data.cost ?? 0
  const baseBlock = kfMin.data.blockCnt ?? 0
  const baseAttackTime = kfMin.data.baseAttackTime ?? 1.0
  const baseRespawnTime = kfMin.data.respawnTime ?? 70

  const baseBreakdown: StatBreakdown = {
    hp: baseHp,
    atk: baseAtk,
    def: baseDef,
    res: baseRes,
    cost: baseCost,
    block: baseBlock,
    baseAttackTime,
    respawnTime: baseRespawnTime,
  }

  // 4. Calculate Trust Bonus (0 .. 100%)
  const trustBreakdown: StatBreakdown = {
    hp: 0,
    atk: 0,
    def: 0,
    res: 0,
    cost: 0,
    block: 0,
    baseAttackTime: 0,
    respawnTime: 0,
  }

  if (options.trust > 0 && operator.favorKeyFrames && operator.favorKeyFrames.length > 0) {
    const maxFavorFrame = operator.favorKeyFrames[operator.favorKeyFrames.length - 1]
    const favorData = maxFavorFrame?.data ?? {}
    const trustRatio = Math.min(100, Math.max(0, options.trust)) / 100

    if (favorData.maxHp) trustBreakdown.hp = Math.round(favorData.maxHp * trustRatio)
    if (favorData.atk) trustBreakdown.atk = Math.round(favorData.atk * trustRatio)
    if (favorData.def) trustBreakdown.def = Math.round(favorData.def * trustRatio)
    if (favorData.magicResistance) {
      trustBreakdown.res = Math.round(favorData.magicResistance * trustRatio)
    }
  }

  // 5. Calculate Potential Bonus (Potential ranks 1..6)
  // Potential 1 = 0 buffs applied, Potential 2 = buff 0 applied, ..., Potential 6 = buffs 0..4 applied
  const potentialBreakdown: StatBreakdown = {
    hp: 0,
    atk: 0,
    def: 0,
    res: 0,
    cost: 0,
    block: 0,
    baseAttackTime: 0,
    respawnTime: 0,
  }

  const potLevel = Math.max(1, Math.min(6, options.potential))
  const unlockedPotsCount = potLevel - 1

  if (unlockedPotsCount > 0 && operator.potentialRanks) {
    for (let i = 0; i < unlockedPotsCount && i < operator.potentialRanks.length; i++) {
      const pot = operator.potentialRanks[i]
      if (!pot) continue
      const mod = parsePotentialModifier(pot.description.en, pot.description.zh)

      if (mod.hp) potentialBreakdown.hp += mod.hp
      if (mod.atk) potentialBreakdown.atk += mod.atk
      if (mod.def) potentialBreakdown.def += mod.def
      if (mod.res) potentialBreakdown.res += mod.res
      if (mod.cost) potentialBreakdown.cost += mod.cost
      if (mod.block) potentialBreakdown.block += mod.block
      if (mod.respawnTime) potentialBreakdown.respawnTime += mod.respawnTime
    }
  }

  // 6. Calculate Module Stage Stats
  const moduleBreakdown: StatBreakdown = {
    hp: 0,
    atk: 0,
    def: 0,
    res: 0,
    cost: 0,
    block: 0,
    baseAttackTime: 0,
    respawnTime: 0,
  }

  if (options.module && options.module.stage > 0) {
    const mod = (operator.modules ?? []).find((m) => m.id === options.module!.id)
    if (!mod) {
      throw new Error(`Module '${options.module.id}' not found on operator ${operator.id}`)
    }

    // In Arknights, module stages are cumulative or provide the exact stage's absolute stats
    // In battle_equip_table, each phase.attributeBlackboard contains the total stats for that stage!
    const stageEntry = (mod.stages ?? []).find((s) => s.stage === options.module!.stage)
    if (!stageEntry) {
      throw new Error(
        `Stage ${options.module.stage} not found in module '${options.module.id}' on operator ${operator.id}`,
      )
    }

    const stStats = stageEntry.stats ?? {}
    if (stStats.max_hp) moduleBreakdown.hp += Math.round(stStats.max_hp)
    if (stStats.atk) moduleBreakdown.atk += Math.round(stStats.atk)
    if (stStats.def) moduleBreakdown.def += Math.round(stStats.def)
    if (stStats.magic_resistance) moduleBreakdown.res += Math.round(stStats.magic_resistance)
    if (stStats.cost) moduleBreakdown.cost += Math.round(stStats.cost)
    if (stStats.block_cnt) moduleBreakdown.block += Math.round(stStats.block_cnt)
    if (stStats.respawn_time) moduleBreakdown.respawnTime += Math.round(stStats.respawn_time)
  }

  // 7. Aggregate Total Attributes
  const totalHp = Math.max(
    1,
    baseBreakdown.hp + trustBreakdown.hp + potentialBreakdown.hp + moduleBreakdown.hp,
  )
  const totalAtk = Math.max(
    0,
    baseBreakdown.atk + trustBreakdown.atk + potentialBreakdown.atk + moduleBreakdown.atk,
  )
  const totalDef = Math.max(
    0,
    baseBreakdown.def + trustBreakdown.def + potentialBreakdown.def + moduleBreakdown.def,
  )
  const totalRes = Math.max(
    0,
    baseBreakdown.res + trustBreakdown.res + potentialBreakdown.res + moduleBreakdown.res,
  )
  const totalCost = Math.max(
    0,
    baseBreakdown.cost + trustBreakdown.cost + potentialBreakdown.cost + moduleBreakdown.cost,
  )
  const totalBlock = Math.max(
    0,
    baseBreakdown.block + trustBreakdown.block + potentialBreakdown.block + moduleBreakdown.block,
  )
  const totalBaseAttackTime = Number(
    (
      baseBreakdown.baseAttackTime +
      trustBreakdown.baseAttackTime +
      potentialBreakdown.baseAttackTime +
      moduleBreakdown.baseAttackTime
    ).toFixed(3),
  )
  const totalRespawnTime = Math.max(
    0,
    baseBreakdown.respawnTime +
      trustBreakdown.respawnTime +
      potentialBreakdown.respawnTime +
      moduleBreakdown.respawnTime,
  )

  return {
    hp: totalHp,
    atk: totalAtk,
    def: totalDef,
    res: totalRes,
    cost: totalCost,
    block: totalBlock,
    baseAttackTime: totalBaseAttackTime,
    respawnTime: totalRespawnTime,
    breakdown: {
      base: baseBreakdown,
      trust: trustBreakdown,
      potential: potentialBreakdown,
      module: moduleBreakdown,
    },
  }
}
