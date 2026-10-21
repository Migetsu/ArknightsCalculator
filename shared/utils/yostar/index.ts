import { z } from 'zod'
import type {
  YostarCurrencies,
  YostarDoctor,
  YostarOperator,
  YostarSyncPayload,
} from '../../schemas/yostar'

/**
 * Pure mappers from the Arknights `syncData` payload to the app's own units.
 *
 * Everything here is defensive: the payload comes from a remote game server, so
 * a single malformed character or inventory entry must never break the whole
 * import. Unknown ids are reported, never guessed.
 */

/** LMD / Originite Prime / Orundum are currencies, not depot materials. */
export const YOSTAR_CURRENCY_ITEM_IDS: ReadonlySet<string> = new Set(['4001', '4002', '4003'])

const MAX_ELITE = 2
const MAX_LEVEL = 90
const MAX_SKILL_LEVEL = 7
const MAX_MASTERY = 3
const MAX_MODULE_STAGE = 3
const MAX_POTENTIAL = 5
const MAX_FAVOR = 1_000_000
const MAX_REGISTERED_LEVEL = 999

const RawSkillSchema = z.object({
  skillId: z.string(),
  unlock: z.number().catch(0),
  specializeLevel: z.number().catch(0),
})

const RawModuleSchema = z.object({
  level: z.number().catch(0),
  locked: z.number().catch(0),
})

const RawCharacterSchema = z.object({
  charId: z.string(),
  level: z.number().catch(0),
  evolvePhase: z.number().catch(0),
  mainSkillLvl: z.number().catch(1),
  potentialRank: z.number().catch(0),
  favorPoint: z.number().catch(0),
  skills: z.array(z.unknown()).catch([]),
  equip: z.record(z.string(), z.unknown()).catch({}),
})

const RawTroopSchema = z.object({
  chars: z.record(z.string(), z.unknown()).catch({}),
})

const RawStatusSchema = z.object({
  nickName: z.string().catch(''),
  level: z.number().catch(1),
  gold: z.number().catch(0),
  diamondShard: z.number().catch(0),
  payDiamond: z.number().catch(0),
  freeDiamond: z.number().catch(0),
})

const RawInventorySchema = z.record(z.string(), z.number().catch(0))

export interface YostarMapContext {
  /** Operator ids present in the local catalog (`data/operators-index.json`). */
  knownOperatorIds: ReadonlySet<string>
  /** Item ids present in the local catalog (`data/items.json`). */
  knownItemIds: ReadonlySet<string>
}

function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, Math.round(value)))
}

function toCount(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0
  return Math.floor(value)
}

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return {}
  return value as Record<string, unknown>
}

function mapCharacter(
  raw: unknown,
  ctx: YostarMapContext,
): { operator: YostarOperator | null; unknownId: string | null } {
  const parsed = RawCharacterSchema.safeParse(raw)
  if (!parsed.success) return { operator: null, unknownId: null }

  const charId = parsed.data.charId.trim()
  if (!charId) return { operator: null, unknownId: null }
  if (!ctx.knownOperatorIds.has(charId)) return { operator: null, unknownId: charId }

  const skills: Record<string, number> = {}
  for (const rawSkill of parsed.data.skills) {
    const skill = RawSkillSchema.safeParse(rawSkill)
    // `unlock` is 1 for skills the account actually unlocked.
    if (!skill.success || skill.data.unlock !== 1) continue
    const skillId = skill.data.skillId.trim()
    if (!skillId) continue
    skills[skillId] = clampInt(skill.data.specializeLevel, 0, MAX_MASTERY)
  }

  const modules: Record<string, number> = {}
  for (const [rawModuleId, rawModule] of Object.entries(parsed.data.equip)) {
    const moduleId = rawModuleId.trim()
    if (!moduleId) continue
    const module = RawModuleSchema.safeParse(rawModule)
    // `locked` marks modules the account does not own yet.
    if (!module.success || module.data.locked !== 0) continue
    const stage = clampInt(module.data.level, 0, MAX_MODULE_STAGE)
    if (stage <= 0) continue
    modules[moduleId] = stage
  }

  return {
    operator: {
      charId,
      elite: clampInt(parsed.data.evolvePhase, 0, MAX_ELITE),
      level: clampInt(parsed.data.level, 1, MAX_LEVEL),
      skillLevel: clampInt(parsed.data.mainSkillLvl, 1, MAX_SKILL_LEVEL),
      potential: clampInt(parsed.data.potentialRank, 0, MAX_POTENTIAL),
      favor: clampInt(parsed.data.favorPoint, 0, MAX_FAVOR),
      skills,
      modules,
    },
    unknownId: null,
  }
}

function mapDoctor(rawStatus: unknown): YostarDoctor {
  const parsed = RawStatusSchema.safeParse(rawStatus)
  if (!parsed.success) {
    return { name: '', level: 1, server: 'en' }
  }
  return {
    name: parsed.data.nickName.trim().slice(0, 64),
    level: clampInt(parsed.data.level, 1, MAX_REGISTERED_LEVEL),
    server: 'en',
  }
}

function mapCurrencies(rawStatus: unknown): YostarCurrencies {
  const parsed = RawStatusSchema.safeParse(rawStatus)
  if (!parsed.success) {
    return { lmd: 0, orundum: 0, originitePrime: 0 }
  }
  return {
    lmd: toCount(parsed.data.gold),
    orundum: toCount(parsed.data.diamondShard),
    // Paid and free Originite Prime are shown to the player as one balance.
    originitePrime: toCount(parsed.data.payDiamond + parsed.data.freeDiamond),
  }
}

/**
 * Converts the `user` object of a `syncData` response into the sanitized import
 * payload. Never throws: malformed input degrades to empty collections.
 */
export function mapYostarSync(rawUser: unknown, ctx: YostarMapContext): YostarSyncPayload {
  const root = asRecord(rawUser)
  let skippedEntries = 0
  const unknownOperatorIds = new Set<string>()
  const operators: YostarOperator[] = []

  const troop = RawTroopSchema.safeParse(root.troop)
  if (troop.success) {
    for (const rawCharacter of Object.values(troop.data.chars)) {
      const result = mapCharacter(rawCharacter, ctx)
      if (result.unknownId) {
        unknownOperatorIds.add(result.unknownId)
        continue
      }
      if (!result.operator) {
        skippedEntries += 1
        continue
      }
      operators.push(result.operator)
    }
  }

  const items: Record<string, number> = {}
  let unknownItemCount = 0
  const inventory = RawInventorySchema.safeParse(root.inventory)
  if (inventory.success) {
    for (const [rawItemId, rawCount] of Object.entries(inventory.data)) {
      const itemId = rawItemId.trim()
      const count = toCount(rawCount)
      if (!itemId || count === 0) continue
      if (YOSTAR_CURRENCY_ITEM_IDS.has(itemId)) continue
      if (!ctx.knownItemIds.has(itemId)) {
        unknownItemCount += 1
        continue
      }
      items[itemId] = count
    }
  }

  return {
    doctor: mapDoctor(root.status),
    operators,
    depot: {
      currencies: mapCurrencies(root.status),
      items,
    },
    unknownOperatorIds: [...unknownOperatorIds],
    unknownItemCount,
    skippedEntries,
    syncedAt: new Date().toISOString(),
  }
}
