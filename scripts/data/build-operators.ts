import { promises as fs } from 'node:fs'
import path from 'node:path'
import {
  DATA_SOURCES_CONFIG,
} from './sources.config'
import {
  type I18nString,
  type OperatorClass,
  type OperatorDetail,
  type OperatorModule,
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
  RawCharPatchTable,
  RawHandbookInfoTable,
} from './schemas'

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
  const cnDir = path.join(RAW_CACHE_DIR, 'zh_CN')
  const enDir = path.join(RAW_CACHE_DIR, 'en_US')

  const [
    cnChars,
    enChars,
    cnSkills,
    enSkills,
    cnEquips,
    enEquips,
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
    cnHandbook,
    enHandbook,
    cnPatch,
    enPatch,
  }
}

/**
 * Builds localized text from CN and EN sources.
 * Marks isMachineTranslation if EN text is missing and falls back to CN appellation / transliteration.
 */
function makeI18nString(
  enText: string | null | undefined,
  zhText: string | null | undefined,
  defaultEnFallback: string | null | undefined = '',
): I18nString {
  const zh = (zhText ?? '').trim()
  const en = (enText ?? '').trim()
  const fallback = (defaultEnFallback ?? '').trim()

  if (en.length > 0) {
    return {
      en,
      zh: zh.length > 0 ? zh : en,
      isMachineTranslation: false,
    }
  }

  return {
    en: fallback.length > 0 ? fallback : zh,
    zh,
    isMachineTranslation: true,
  }
}

export function buildOperatorData(bundle: LoadedRawBundle): {
  summaries: OperatorSummary[]
  details: OperatorDetail[]
  stats: {
    total: number
    global: number
    cnOnly: number
    untranslated: number
  }
} {
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

    const name = makeI18nString(en?.name, cn.name, cn.appellation ?? cn.name)
    const appellation = en?.appellation ?? cn.appellation ?? undefined
    const displayNumber = en?.displayNumber ?? cn.displayNumber ?? null
    const rarity = normalizeRarity(cn.rarity)
    const opClass = normalizeClass(cn.profession)
    const subclass = cn.subProfessionId ?? 'unknown'
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
            const lvlName = makeI18nString(enLvl?.name, cnLvl.name, cnLvl.name)
            const lvlDesc = makeI18nString(
              enLvl?.description,
              cnLvl.description,
              cnLvl.description,
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
        const candidates = (rawTalent.candidates ?? []).map((cnCand, cIdx) => {
          const enCand = enTalent?.candidates?.[cIdx]
          const candName = makeI18nString(enCand?.name, cnCand.name, cnCand.name)
          const candDesc = makeI18nString(
            enCand?.description,
            cnCand.description,
            cnCand.description,
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

        return { candidates }
      })
      .filter((t) => t.candidates.length > 0)

    // 5. Build Modules from uniequip_table
    const equipIds = bundle.cnEquips.charEquip?.[id] ?? []
    const modules: OperatorModule[] = []

    for (const equipId of equipIds) {
      const cnEquip = bundle.cnEquips.equipDict[equipId]
      if (!cnEquip) continue
      const enEquip = bundle.enEquips.equipDict[equipId]

      const modName = makeI18nString(
        enEquip?.uniEquipName,
        cnEquip.uniEquipName,
        cnEquip.uniEquipName,
      )
      const modDesc = cnEquip.uniEquipDesc
        ? makeI18nString(enEquip?.uniEquipDesc, cnEquip.uniEquipDesc, cnEquip.uniEquipDesc)
        : undefined

      const itemCost: Record<string, { id: string; count: number }[]> = {}
      if (cnEquip.itemCost) {
        for (const [stage, costs] of Object.entries(cnEquip.itemCost)) {
          if (costs && costs.length > 0) {
            itemCost[stage] = costs.map((c) => ({ id: c.id, count: c.count }))
          }
        }
      }

      modules.push({
        id: cnEquip.uniEquipId,
        name: modName,
        type: cnEquip.type ?? 'INITIAL',
        typeName2: cnEquip.typeName2 ?? '',
        icon: cnEquip.uniEquipIcon ?? cnEquip.uniEquipId,
        description: modDesc,
        itemCost: Object.keys(itemCost).length > 0 ? itemCost : undefined,
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
      const potDesc = makeI18nString(
        enPot?.description,
        cnPot.description,
        cnPot.description,
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
      itemUsage: cn.itemUsage ? makeI18nString(en?.itemUsage, cn.itemUsage) : undefined,
      itemDesc: cn.itemDesc ? makeI18nString(en?.itemDesc, cn.itemDesc) : undefined,
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
    },
  }
}

async function main(): Promise<void> {
  console.log('=== Arknights Operator Data Builder ===\n')
  console.log('1. Loading raw tables from .cache/raw...')
  const bundle = await loadRawBundles()

  console.log('2. Transforming and normalizing operators...')
  const { summaries, details, stats } = buildOperatorData(bundle)

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

  console.log('\n=== Build Report ===')
  console.log(`Total Playable Operators: ${stats.total}`)
  console.log(`Global (EN + CN):         ${stats.global}`)
  console.log(`CN-Only Operators:        ${stats.cnOnly}`)
  console.log(`Untranslated (CN fallback): ${stats.untranslated}`)
  console.log(`\nFile Sizes:`)
  console.log(`  data/operators-index.json: ${indexSizeKb} KB`)
  console.log(`  data/operators/{id}.json:  ${details.length} files (${totalDetailMb} MB total)`)
  console.log(`  data/meta.json:            0.3 KB`)
  console.log('\nBuild finished successfully!')
}

if (process.argv[1]?.includes('build-operators')) {
  main().catch((err: unknown) => {
    console.error('Fatal builder error:', err)
    process.exit(1)
  })
}
