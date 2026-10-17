import { promises as fs } from 'node:fs'
import path from 'node:path'
import {
  DATA_SOURCES_CONFIG,
} from './sources.config'
import {
  type OperatorClass,
  type OperatorDetail,
  type OperatorModule,
  type OperatorModuleStage,
  type OperatorModulePart,
  type OperatorModulePartCandidate,
  type OperatorPhaseStat,
  type OperatorPosition,
  type OperatorSkill,
  type OperatorSkillLevel,
  type OperatorSummary,
  type OperatorTalent,
  type ServerRegion,
  OperatorDetailSchema,
  OperatorSummarySchema,
  DataMetaSchema,
} from '../../shared/schemas/operator'
import type {
  RawCharacter,
  RawCharacterTable,
  RawSkillTable,
  RawUniequipTable,
  RawBattleEquipTable,
  RawCharPatchTable,
  RawHandbookInfoTable,
} from './schemas'
import {
  type I18nLayersContext,
  type I18nLayersTracker,
  createI18nTracker,
  createEmptyI18nLayersContext,
  loadI18nLayersContext,
  resolveLayeredI18nString,
  isValidLatinAppellation,
  checkSkillLevelStale,
  checkTalentCandidateStale,
  checkModuleStale,
} from './i18n-layers'

const RAW_CACHE_DIR = path.resolve(process.cwd(), DATA_SOURCES_CONFIG.cacheDir)
const DATA_OUTPUT_DIR = path.resolve(process.cwd(), 'data')
const OPERATORS_OUTPUT_DIR = path.join(DATA_OUTPUT_DIR, 'operators')

const VALID_RAW_PROFESSIONS = new Set([
  'PIONEER',
  'WARRIOR',
  'SNIPER',
  'TANK',
  'MEDIC',
  'SUPPORT',
  'CASTER',
  'SPECIAL',
])

const TEST_DUMMY_IDS = new Set([
  'char_500_noone',
  'char_501_free',
  'char_503_nemer',
])

/**
 * Normalizes raw game profession code to application OperatorClass.
 * Maps raw 'SPECIAL' -> 'SPECIALIST'.
 */
function normalizeClass(raw: string): OperatorClass {
  if (raw === 'SPECIAL') return 'SPECIALIST'
  return raw as OperatorClass
}

/**
 * Converts raw rarity ('TIER_1' .. 'TIER_6' or number 0..5 / 1..6) to 1..6.
 */
function normalizeRarity(raw: string | number): number {
  if (typeof raw === 'number') {
    return raw >= 1 && raw <= 6 ? raw : raw + 1
  }
  const match = raw.match(/TIER_(\d+)/i)
  if (match && match[1]) {
    return parseInt(match[1], 10)
  }
  return 1
}

/**
 * Resolves raw subProfessionId to official localized archetype / subclass name.
 * Priority: EN subProfDict -> CN-only fallback ("Supportive Ranger") -> CN subProfDict -> raw subId.
 */
export function resolveSubclassName(
  subId: string | undefined | null,
  enEquips?: RawUniequipTable,
  cnEquips?: RawUniequipTable,
): string {
  if (!subId) return 'Unknown'
  if (subId === 'physician') return 'Single-target Medic'
  if (subId === 'supportiveranger') return 'Supportive Ranger'
  const enName = enEquips?.subProfDict?.[subId]?.subProfessionName?.trim()
  if (enName) return enName
  const cnName = cnEquips?.subProfDict?.[subId]?.subProfessionName?.trim()
  if (cnName) return cnName
  return subId
}

/**
 * Filter criteria for playable characters.
 * Excludes:
 * 1. Tokens (prefix token_, isToken === true, profession === TOKEN).
 * 2. Traps (prefix trap_).
 * 3. Dummy / test units (char_500_noone, subProfessionId === notchar*).
 * 4. Temporary IS story assist NPCs without catalog display numbers.
 */
export function isPlayableOperator(id: string, char: RawCharacter): boolean {
  if (!id.startsWith('char_')) return false
  if (char.isToken) return false
  if (!VALID_RAW_PROFESSIONS.has(char.profession)) return false
  if (char.subProfessionId?.startsWith('notchar')) return false
  if (TEST_DUMMY_IDS.has(id)) return false
  if (char.isNotObtainable && (!char.displayNumber || char.displayNumber === 'null')) {
    return false
  }
  return true
}

interface LoadedRawBundle {
  cnChars: RawCharacterTable
  enChars: RawCharacterTable
  cnSkills: RawSkillTable
  enSkills: RawSkillTable
  cnEquips: RawUniequipTable
  enEquips: RawUniequipTable
  cnBattleEquips: RawBattleEquipTable
  enBattleEquips: RawBattleEquipTable
  cnHandbook: RawHandbookInfoTable
  enHandbook: RawHandbookInfoTable
  cnPatch: RawCharPatchTable
  enPatch: RawCharPatchTable
}

async function readJsonFile<T>(filePath: string): Promise<T> {
  const content = await fs.readFile(filePath, 'utf-8')
  return JSON.parse(content) as T
}

async function loadRawBundles(): Promise<LoadedRawBundle> {
  const cnDir = path.join(RAW_CACHE_DIR, DATA_SOURCES_CONFIG.sources.cn.locale)
  const enDir = path.join(RAW_CACHE_DIR, DATA_SOURCES_CONFIG.sources.en.locale)

  const [
    cnChars,
    enChars,
    cnSkills,
    enSkills,
    cnEquips,
    enEquips,
    cnBattleEquips,
    enBattleEquips,
    cnHandbook,
    enHandbook,
    cnPatch,
    enPatch,
  ] = await Promise.all([
    readJsonFile<RawCharacterTable>(path.join(cnDir, 'character_table.json')),
    readJsonFile<RawCharacterTable>(path.join(enDir, 'character_table.json')),
    readJsonFile<RawSkillTable>(path.join(cnDir, 'skill_table.json')),
    readJsonFile<RawSkillTable>(path.join(enDir, 'skill_table.json')),
    readJsonFile<RawUniequipTable>(path.join(cnDir, 'uniequip_table.json')),
    readJsonFile<RawUniequipTable>(path.join(enDir, 'uniequip_table.json')),
    readJsonFile<RawBattleEquipTable>(path.join(cnDir, 'battle_equip_table.json')),
    readJsonFile<RawBattleEquipTable>(path.join(enDir, 'battle_equip_table.json')),
    readJsonFile<RawHandbookInfoTable>(path.join(cnDir, 'handbook_info_table.json')),
    readJsonFile<RawHandbookInfoTable>(path.join(enDir, 'handbook_info_table.json')),
    readJsonFile<RawCharPatchTable>(path.join(cnDir, 'char_patch_table.json')),
    readJsonFile<RawCharPatchTable>(path.join(enDir, 'char_patch_table.json')),
  ])

  return {
    cnChars,
    enChars,
    cnSkills,
    enSkills,
    cnEquips,
    enEquips,
    cnBattleEquips,
    enBattleEquips,
    cnHandbook,
    enHandbook,
    cnPatch,
    enPatch,
  }
}

export function buildOperatorData(
  bundle: LoadedRawBundle,
  context?: I18nLayersContext,
  tracker?: I18nLayersTracker,
): {
  summaries: OperatorSummary[]
  details: OperatorDetail[]
  stats: {
    total: number
    global: number
    cnOnly: number
    untranslated: number
    modules: {
      opsWithModules: number
      totalModules: number
      withBattleData: number
      withoutBattleData: number
    }
    i18nTracker: I18nLayersTracker
  }
} {
  const ctx = context ?? createEmptyI18nLayersContext()
  const trk = tracker ?? createI18nTracker()
  const operatorMap = new Map<
    string,
    {
      id: string
      cn: RawCharacter
      en?: RawCharacter
      isClassChange: boolean
    }
  >()

  // 1. Regular operators from character_table.json
  for (const [id, cnChar] of Object.entries(bundle.cnChars)) {
    if (isPlayableOperator(id, cnChar)) {
      operatorMap.set(id, {
        id,
        cn: cnChar,
        en: bundle.enChars[id],
        isClassChange: false,
      })
    }
  }

  // 2. Class-change variants from char_patch_table.json (e.g. Guard Amiya, Medic Amiya)
  for (const [id, cnPatchChar] of Object.entries(bundle.cnPatch.patchChars)) {
    operatorMap.set(id, {
      id,
      cn: cnPatchChar,
      en: bundle.enPatch.patchChars[id],
      isClassChange: true,
    })
  }

  const summaries: OperatorSummary[] = []
  const details: OperatorDetail[] = []

  let globalCount = 0
  let cnOnlyCount = 0
  let untranslatedCount = 0
  let opsWithModulesCount = 0
  let totalModulesCount = 0
  let modulesWithBattleCount = 0
  let modulesWithoutBattleCount = 0

  for (const [id, entry] of operatorMap.entries()) {
    const { cn, en, isClassChange } = entry
    const isGlobal = Boolean(en)
    const servers: ServerRegion[] = isGlobal ? ['cn', 'global'] : ['cn']

    if (isGlobal) {
      globalCount++
    } else {
      cnOnlyCount++
    }

    const hasEnglishName = Boolean(en?.name?.trim())
    if (!hasEnglishName) {
      untranslatedCount++
    }

    const validLatinAppellation = isValidLatinAppellation(cn.appellation)
      ? cn.appellation!.trim()
      : undefined

    const name = resolveLayeredI18nString(
      {
        key: `${id}.name`,
        charId: id,
        category: 'operators',
        officialEn: en?.name,
        zhText: cn.name,
        wikiEn: ctx.wiki[id]?.name,
        fallbackEn: validLatinAppellation,
      },
      ctx,
      trk,
    )
    const enApp = en?.appellation?.trim()
    const cnApp = cn.appellation?.trim()
    const appellation =
      enApp && isValidLatinAppellation(enApp)
        ? enApp
        : cnApp && isValidLatinAppellation(cnApp)
          ? cnApp
          : undefined
    const displayNumber = en?.displayNumber ?? cn.displayNumber ?? null
    const rarity = normalizeRarity(cn.rarity)
    const opClass = normalizeClass(cn.profession)
    const subclass = resolveSubclassName(cn.subProfessionId, bundle.enEquips, bundle.cnEquips)
    const faction = cn.nationId ?? cn.groupId ?? cn.teamId ?? null
    const position = (cn.position ?? 'MELEE') as OperatorPosition
    const tagList = en?.tagList ?? cn.tagList ?? []

    // 1. Build Summary
    const summary: OperatorSummary = {
      id,
      name,
      appellation,
      displayNumber,
      rarity,
      class: opClass,
      subclass,
      faction,
      position,
      tagList,
      servers,
      hasIcon: true,
      isClassChange,
    }

    // 2. Build Phases
    const phases: OperatorPhaseStat[] = cn.phases.map((rawPhase, index) => {
      const evolveCost = rawPhase.evolveCost
        ? rawPhase.evolveCost.map((cost) => ({
            id: cost.id,
            count: cost.count,
          }))
        : undefined

      const attributesKeyFrames = rawPhase.attributesKeyFrames?.map((kf) => ({
        level: kf.level,
        data: {
          maxHp: kf.data.maxHp,
          atk: kf.data.atk,
          def: kf.data.def,
          magicResistance: kf.data.magicResistance,
          cost: kf.data.cost,
          blockCnt: kf.data.blockCnt,
          moveSpeed: kf.data.moveSpeed,
          attackSpeed: kf.data.attackSpeed,
          baseAttackTime: kf.data.baseAttackTime,
          respawnTime: kf.data.respawnTime,
          hpRecoveryPerSec: kf.data.hpRecoveryPerSec,
          spRecoveryPerSec: kf.data.spRecoveryPerSec,
        },
      }))

      return {
        phase: index,
        maxLevel: rawPhase.maxLevel,
        rangeId: rawPhase.rangeId ?? undefined,
        evolveCost,
        attributesKeyFrames,
      }
    })

    // 3. Build Skills
    const skills: OperatorSkill[] = (cn.skills ?? [])
      .filter((s) => Boolean(s.skillId))
      .map((rawCharSkill) => {
        const skillId = rawCharSkill.skillId!
        const cnSkillData = bundle.cnSkills[skillId]
        const enSkillData = bundle.enSkills[skillId]

        const levels: OperatorSkillLevel[] = (cnSkillData?.levels ?? []).map(
          (cnLvl, lvlIdx) => {
            const enLvl = enSkillData?.levels?.[lvlIdx]
            const isStale = checkSkillLevelStale(cnLvl, enLvl)
            const lvlName = resolveLayeredI18nString(
              {
                key: `${skillId}.lvl.${lvlIdx}.name`,
                charId: id,
                category: 'skills',
                officialEn: enLvl?.name,
                zhText: cnLvl.name,
                wikiEn: ctx.wiki[id]?.skills?.[skillId],
                isStale,
              },
              ctx,
              trk,
            )
            const lvlDesc = resolveLayeredI18nString(
              {
                key: `${skillId}.lvl.${lvlIdx}.desc`,
                charId: id,
                category: 'skills',
                officialEn: enLvl?.description,
                zhText: cnLvl.description,
                isStale,
              },
              ctx,
              trk,
            )

            const blackboard: Record<string, number> = {}
            for (const item of cnLvl.blackboard ?? []) {
              if (typeof item.value === 'number') {
                blackboard[item.key] = item.value
              }
            }

            return {
              name: lvlName,
              description: lvlDesc,
              rangeId: cnLvl.rangeId ?? null,
              skillType: cnLvl.skillType ?? undefined,
              duration: cnLvl.duration ?? undefined,
              spType: cnLvl.spData?.spType ?? undefined,
              spCost: cnLvl.spData?.spCost ?? undefined,
              initSp: cnLvl.spData?.initSp ?? undefined,
              blackboard: Object.keys(blackboard).length > 0 ? blackboard : undefined,
            }
          },
        )

        const masteryCosts = rawCharSkill.levelUpCostCond
          ?.filter((cond) => cond.levelUpCost && cond.levelUpCost.length > 0)
          .map((cond) => ({
            unlockCond: {
              phase: typeof cond.unlockCond.phase === 'number' ? cond.unlockCond.phase : 2,
              level: cond.unlockCond.level,
            },
            levelUpCost: cond.levelUpCost!.map((c) => ({
              id: c.id,
              count: c.count,
            })),
          }))

        return {
          skillId,
          iconId: cnSkillData?.iconId ?? null,
          levels,
          masteryCosts: masteryCosts && masteryCosts.length > 0 ? masteryCosts : undefined,
        }
      })

    // 4. Build Talents
    const talents: OperatorTalent[] = (cn.talents ?? [])
      .map((rawTalent, tIdx) => {
        const enTalent = en?.talents?.[tIdx]
        const candidates = (rawTalent.candidates ?? [])
          .map((cnCand, cIdx) => {
            if (cnCand.isHideTalent) return null
            const hasRawName = Boolean(cnCand.name && cnCand.name.trim())
            const hasRawDesc = Boolean(
              cnCand.description &&
                cnCand.description.trim() &&
                cnCand.description.trim() !== '-',
            )
            if (!hasRawName || !hasRawDesc) return null

            const enCand = enTalent?.candidates?.[cIdx]
            const isStale = checkTalentCandidateStale(cnCand, enCand)
            const candName = resolveLayeredI18nString(
              {
                key: `${id}.talent.${tIdx}.${cIdx}.name`,
                charId: id,
                category: 'talents',
                officialEn: enCand?.name,
                zhText: cnCand.name,
                wikiEn: ctx.wiki[id]?.talents?.[tIdx],
                isStale,
              },
              ctx,
              trk,
            )
            const candDesc = resolveLayeredI18nString(
              {
                key: `${id}.talent.${tIdx}.${cIdx}.desc`,
                charId: id,
                category: 'talents',
                officialEn: enCand?.description,
                zhText: cnCand.description,
                isStale,
              },
              ctx,
              trk,
            )

            const blackboard: Record<string, number> = {}
            for (const item of cnCand.blackboard ?? []) {
              if (typeof item.value === 'number') {
                blackboard[item.key] = item.value
              }
            }

            const phaseNum =
              typeof cnCand.unlockCondition.phase === 'number'
                ? cnCand.unlockCondition.phase
                : parseInt(String(cnCand.unlockCondition.phase).replace(/\D/g, '') || '0', 10)

            return {
              name: candName,
              description: candDesc,
              unlockCond: {
                phase: phaseNum,
                level: cnCand.unlockCondition.level,
                potential: cnCand.requiredPotentialRank,
              },
              blackboard: Object.keys(blackboard).length > 0 ? blackboard : undefined,
            }
          })
          .filter((c): c is NonNullable<typeof c> => c !== null)

        return { candidates }
      })
      .filter((t) => t.candidates.length > 0)

    // 5. Build Modules from uniequip_table and battle_equip_table
    const equipIds = bundle.cnEquips.charEquip?.[id] ?? []
    const modules: OperatorModule[] = []

    if (equipIds.length > 0) {
      opsWithModulesCount++
    }

    for (const equipId of equipIds) {
      const cnEquip = bundle.cnEquips.equipDict[equipId]
      if (!cnEquip) continue
      const enEquip = bundle.enEquips.equipDict[equipId]
      totalModulesCount++

      // Check battle equip entry in battle_equip_table
      const cnBattle = bundle.cnBattleEquips?.[equipId]
      const enBattle = bundle.enBattleEquips?.[equipId]
      const isStale = checkModuleStale(cnEquip, enEquip, cnBattle, enBattle)

      const modName = resolveLayeredI18nString(
        {
          key: `${cnEquip.uniEquipId}.name`,
          charId: id,
          officialEn: enEquip?.uniEquipName,
          zhText: cnEquip.uniEquipName,
          wikiEn: ctx.wiki[id]?.modules?.[cnEquip.uniEquipId],
          isStale,
        },
        ctx,
        trk,
      )
      const modDesc = cnEquip.uniEquipDesc
        ? resolveLayeredI18nString(
            {
              key: `${cnEquip.uniEquipId}.desc`,
              charId: id,
              officialEn: enEquip?.uniEquipDesc,
              zhText: cnEquip.uniEquipDesc,
              isStale,
            },
            ctx,
            trk,
          )
        : undefined

      const itemCost: Record<string, { id: string; count: number }[]> = {}
      if (cnEquip.itemCost) {
        for (const [stage, costs] of Object.entries(cnEquip.itemCost)) {
          if (costs && costs.length > 0) {
            itemCost[stage] = costs.map((c) => ({ id: c.id, count: c.count }))
          }
        }
      }

      let stages: OperatorModuleStage[] | undefined

      if (cnBattle?.phases && cnBattle.phases.length > 0) {
        modulesWithBattleCount++
        stages = cnBattle.phases.map((rawPhase, pIdx) => {
          const enPhase = enBattle?.phases?.[pIdx]

          // 1. Stats from attributeBlackboard
          const stats: Record<string, number> = {}
          for (const item of rawPhase.attributeBlackboard ?? []) {
            if (typeof item.value === 'number') {
              stats[item.key] = item.value
            }
          }

          // 2. Parts (Trait/Talent changes)
          const parts: OperatorModulePart[] = (rawPhase.parts ?? []).map((rawPart, partIdx) => {
            const enPart = enPhase?.parts?.[partIdx]
            const target = rawPart.target

            const cnCandidates =
              rawPart.overrideTraitDataBundle?.candidates ??
              rawPart.addOrOverrideTalentDataBundle?.candidates ??
              []
            const enCandidates =
              enPart?.overrideTraitDataBundle?.candidates ??
              enPart?.addOrOverrideTalentDataBundle?.candidates ??
              []

            const candidates: OperatorModulePartCandidate[] = cnCandidates.map((cnCand, cIdx) => {
              const enCand = enCandidates[cIdx]

              const candAddDesc = cnCand.additionalDescription
                ? resolveLayeredI18nString(
                    {
                      key: `${cnEquip.uniEquipId}.stage.${rawPhase.equipLevel}.cand.${cIdx}.addDesc`,
                      charId: id,
                      officialEn: enCand?.additionalDescription,
                      zhText: cnCand.additionalDescription,
                      isStale,
                    },
                    ctx,
                    trk,
                  )
                : undefined
              const candUpDesc = cnCand.upgradeDescription
                ? resolveLayeredI18nString(
                    {
                      key: `${cnEquip.uniEquipId}.stage.${rawPhase.equipLevel}.cand.${cIdx}.upgDesc`,
                      charId: id,
                      officialEn: enCand?.upgradeDescription,
                      zhText: cnCand.upgradeDescription,
                      isStale,
                    },
                    ctx,
                    trk,
                  )
                : undefined
              const candOverDesc = cnCand.overrideDescripton
                ? resolveLayeredI18nString(
                    {
                      key: `${cnEquip.uniEquipId}.stage.${rawPhase.equipLevel}.cand.${cIdx}.ovrDesc`,
                      charId: id,
                      officialEn: enCand?.overrideDescripton,
                      zhText: cnCand.overrideDescripton,
                      isStale,
                    },
                    ctx,
                    trk,
                  )
                : undefined

              const candBb: Record<string, number> = {}
              for (const bb of cnCand.blackboard ?? []) {
                if (typeof bb.value === 'number') {
                  candBb[bb.key] = bb.value
                }
              }

              return {
                ...(candAddDesc ? { additionalDescription: candAddDesc } : {}),
                ...(candUpDesc ? { upgradeDescription: candUpDesc } : {}),
                ...(candOverDesc ? { overrideDescription: candOverDesc } : {}),
                ...(Object.keys(candBb).length > 0 ? { blackboard: candBb } : {}),
                ...(cnCand.requiredPotentialRank !== undefined
                  ? { requiredPotentialRank: cnCand.requiredPotentialRank }
                  : {}),
              }
            })

            return {
              target,
              ...(candidates.length > 0 ? { candidates } : {}),
            }
          })

          // 3. Stage unlock costs from uniequip_table itemCost
          const stageCost = itemCost[String(rawPhase.equipLevel)]

          return {
            stage: rawPhase.equipLevel,
            stats,
            ...(parts.length > 0 ? { parts } : {}),
            ...(stageCost && stageCost.length > 0 ? { cost: stageCost } : {}),
          }
        })
      } else {
        modulesWithoutBattleCount++
      }

      // Module server availability: available in Global if present in EN uniequip_table and
      // if it has stages, its stages exist in EN battle_equip_table
      const isInitial = (cnEquip.type ?? 'INITIAL') === 'INITIAL'
      const hasEnEquip = Boolean(enEquip)
      const hasEnBattle = Boolean(enBattle?.phases && enBattle.phases.length > 0)
      const isGlobalModule = hasEnEquip && (isInitial || hasEnBattle || !cnBattle?.phases)
      const modServers: ('cn' | 'global')[] = isGlobalModule ? ['cn', 'global'] : ['cn']

      modules.push({
        id: cnEquip.uniEquipId,
        name: modName,
        type: cnEquip.type ?? 'INITIAL',
        typeName2: cnEquip.typeName2 ?? '',
        icon: cnEquip.uniEquipIcon ?? cnEquip.uniEquipId,
        description: modDesc,
        servers: modServers,
        itemCost: Object.keys(itemCost).length > 0 ? itemCost : undefined,
        stages: stages && stages.length > 0 ? stages : undefined,
      })
    }

    // 6. Voice actor & artist from handbook_info_table
    const cnHandbookItem = bundle.cnHandbook.handbookDict[id]
    const enHandbookItem = bundle.enHandbook.handbookDict[id]
    const artist = enHandbookItem?.drawName ?? cnHandbookItem?.drawName ?? null
    const va = enHandbookItem?.voiceName ?? cnHandbookItem?.voiceName ?? null

    // 7. Potential ranks
    const potentialRanks = (cn.potentialRanks ?? []).map((cnPot, pIdx) => {
      const enPot = en?.potentialRanks?.[pIdx]
      const potDesc = resolveLayeredI18nString(
        {
          key: `${id}.potential.${pIdx}.desc`,
          charId: id,
          officialEn: enPot?.description,
          zhText: cnPot.description,
        },
        ctx,
        trk,
      )
      return {
        type: cnPot.type,
        description: potDesc,
      }
    })

    // 8. Favor key frames
    const favorKeyFrames = (cn.favorKeyFrames ?? []).map((kf) => {
      const data: Record<string, number> = {}
      for (const [k, v] of Object.entries(kf.data)) {
        if (typeof v === 'number' && v > 0) {
          data[k] = v
        }
      }
      return {
        level: kf.level,
        data,
      }
    })

    // 9. All skill level up costs (1-7)
    const allSkillLvlup = cn.allSkillLvlup
      ?.filter((lvl) => lvl.lvlUpCost && lvl.lvlUpCost.length > 0)
      .map((lvl) => {
        const phaseNum =
          typeof lvl.unlockCond.phase === 'number'
            ? lvl.unlockCond.phase
            : parseInt(String(lvl.unlockCond.phase).replace(/\D/g, '') || '0', 10)
        return {
          unlockCond: {
            phase: phaseNum,
            level: lvl.unlockCond.level,
          },
          lvlUpCost: lvl.lvlUpCost!.map((c) => ({
            id: c.id,
            count: c.count,
          })),
        }
      })

    const detail: OperatorDetail = {
      id,
      name,
      appellation,
      displayNumber,
      rarity,
      class: opClass,
      subclass,
      faction,
      position,
      tagList,
      servers,
      itemUsage: cn.itemUsage
        ? resolveLayeredI18nString(
            {
              key: `${id}.itemUsage`,
              charId: id,
              officialEn: en?.itemUsage,
              zhText: cn.itemUsage,
            },
            ctx,
            trk,
          )
        : undefined,
      itemDesc: cn.itemDesc
        ? resolveLayeredI18nString(
            {
              key: `${id}.itemDesc`,
              charId: id,
              officialEn: en?.itemDesc,
              zhText: cn.itemDesc,
            },
            ctx,
            trk,
          )
        : undefined,
      artist,
      va,
      phases,
      skills,
      allSkillLvlup: allSkillLvlup && allSkillLvlup.length > 0 ? allSkillLvlup : undefined,
      talents: talents.length > 0 ? talents : undefined,
      potentialRanks: potentialRanks.length > 0 ? potentialRanks : undefined,
      favorKeyFrames: favorKeyFrames.length > 0 ? favorKeyFrames : undefined,
      modules: modules.length > 0 ? modules : undefined,
    }

    summaries.push(summary)
    details.push(detail)
  }

  // Deterministic sorting: rarity DESC (6★ down to 1★), then id ASC
  const sortComparator = (
    a: { rarity: number; id: string },
    b: { rarity: number; id: string },
  ): number => {
    if (b.rarity !== a.rarity) {
      return b.rarity - a.rarity
    }
    return a.id.localeCompare(b.id)
  }

  summaries.sort(sortComparator)
  details.sort(sortComparator)

  return {
    summaries,
    details,
    stats: {
      total: summaries.length,
      global: globalCount,
      cnOnly: cnOnlyCount,
      untranslated: untranslatedCount,
      modules: {
        opsWithModules: opsWithModulesCount,
        totalModules: totalModulesCount,
        withBattleData: modulesWithBattleCount,
        withoutBattleData: modulesWithoutBattleCount,
      },
      i18nTracker: trk,
    },
  }
}

async function main(): Promise<void> {
  console.log('=== Arknights Operator Data Builder ===\n')
  console.log('1. Loading raw tables and i18n layers...')
  const [bundle, i18nContext] = await Promise.all([
    loadRawBundles(),
    loadI18nLayersContext(),
  ])

  console.log('2. Transforming and normalizing operators with i18n fallback chain...')
  const tracker = createI18nTracker()
  const { summaries, details, stats } = buildOperatorData(bundle, i18nContext, tracker)

  console.log('3. Validating output schemas...')
  // Validate index array
  for (const s of summaries) {
    OperatorSummarySchema.parse(s)
  }
  // Validate detail items
  for (const d of details) {
    OperatorDetailSchema.parse(d)
  }

  const meta = {
    cnCommit: DATA_SOURCES_CONFIG.sources.cn.commit,
    enCommit: DATA_SOURCES_CONFIG.sources.en.commit,
    buildDate: new Date().toISOString(),
    totalOperators: stats.total,
    globalOperators: stats.global,
    cnOnlyOperators: stats.cnOnly,
    untranslatedCount: stats.untranslated,
  }
  DataMetaSchema.parse(meta)

  console.log('4. Writing output JSON files...')
  await fs.mkdir(OPERATORS_OUTPUT_DIR, { recursive: true })

  // Write operators-index.json
  const indexPath = path.join(DATA_OUTPUT_DIR, 'operators-index.json')
  const indexJson = JSON.stringify(summaries, null, 2)
  await fs.writeFile(indexPath, indexJson, 'utf-8')
  const indexSizeKb = (Buffer.byteLength(indexJson, 'utf-8') / 1024).toFixed(1)

  // Write meta.json
  const metaPath = path.join(DATA_OUTPUT_DIR, 'meta.json')
  await fs.writeFile(metaPath, JSON.stringify(meta, null, 2), 'utf-8')

  // Write individual detail files: data/operators/{id}.json
  let totalDetailBytes = 0
  for (const detail of details) {
    const detailPath = path.join(OPERATORS_OUTPUT_DIR, `${detail.id}.json`)
    const detailJson = JSON.stringify(detail, null, 2)
    totalDetailBytes += Buffer.byteLength(detailJson, 'utf-8')
    await fs.writeFile(detailPath, detailJson, 'utf-8')
  }

  const totalDetailMb = (totalDetailBytes / (1024 * 1024)).toFixed(2)

  // Write data/i18n/report.json
  const reportDir = path.join(process.cwd(), 'data', 'i18n')
  await fs.mkdir(reportDir, { recursive: true })
  const reportPath = path.join(reportDir, 'report.json')
  const totalStrings =
    tracker.sources.official +
    tracker.sources.wiki +
    tracker.sources.community +
    tracker.sources.manual +
    tracker.sources.machine +
    tracker.sources.zh
  const i18nReport = {
    generatedAt: new Date().toISOString(),
    sources: tracker.sources,
    staleCount: tracker.staleCount,
    missingEnCount: tracker.missingEnCount,
    totalStrings,
    percentage: {
      official: ((tracker.sources.official / totalStrings) * 100).toFixed(2) + '%',
      wiki: ((tracker.sources.wiki / totalStrings) * 100).toFixed(2) + '%',
      community: ((tracker.sources.community / totalStrings) * 100).toFixed(2) + '%',
      manual: ((tracker.sources.manual / totalStrings) * 100).toFixed(2) + '%',
      machine: ((tracker.sources.machine / totalStrings) * 100).toFixed(2) + '%',
      zh: ((tracker.sources.zh / totalStrings) * 100).toFixed(2) + '%',
    },
  }
  await fs.writeFile(reportPath, JSON.stringify(i18nReport, null, 2), 'utf-8')

  console.log('\n=== Build Report ===')
  console.log(`Total Playable Operators: ${stats.total}`)
  console.log(`Global (EN + CN):         ${stats.global}`)
  console.log(`CN-Only Operators:        ${stats.cnOnly}`)
  console.log(`Untranslated (CN fallback): ${stats.untranslated}`)
  console.log(`\nI18n String Sources:`)
  console.log(`  Official:  ${tracker.sources.official} (${i18nReport.percentage.official})`)
  console.log(`  Wiki:      ${tracker.sources.wiki} (${i18nReport.percentage.wiki})`)
  console.log(`  Community: ${tracker.sources.community} (${i18nReport.percentage.community})`)
  console.log(`  Manual:    ${tracker.sources.manual} (${i18nReport.percentage.manual})`)
  console.log(`  Machine:   ${tracker.sources.machine} (${i18nReport.percentage.machine})`)
  console.log(`  ZH only:   ${tracker.sources.zh} (${i18nReport.percentage.zh})`)
  console.log(`  Stale:     ${tracker.staleCount}`)
  console.log(`\nModules Breakdown:`)
  console.log(`  Operators with modules:   ${stats.modules.opsWithModules}`)
  console.log(`  Total module entries:     ${stats.modules.totalModules}`)
  console.log(`  With combat data:         ${stats.modules.withBattleData}`)
  console.log(`  Without combat data:      ${stats.modules.withoutBattleData}`)
  console.log(`\nFile Sizes:`)
  console.log(`  data/operators-index.json: ${indexSizeKb} KB`)
  console.log(`  data/operators/{id}.json:  ${details.length} files (${totalDetailMb} MB total)`)
  console.log(`  data/meta.json:            0.3 KB`)
  console.log(`  data/i18n/report.json:     saved`)
  console.log('\nBuild finished successfully!')
}

if (process.argv[1]?.includes('build-operators')) {
  main().catch((err: unknown) => {
    console.error('Fatal builder error:', err)
    process.exit(1)
  })
}
