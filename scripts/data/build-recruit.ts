import { promises as fs } from 'node:fs'
import path from 'node:path'
import {
  type RecruitData,
  type RecruitOperator,
  type RecruitTag,
  RecruitDataSchema,
} from '../../shared/schemas/recruit'
import type { OperatorSummary } from '../../shared/schemas/operator'

const RAW_EN_GACHA_PATH = path.resolve(process.cwd(), '.cache/raw/en/gacha_table.json')
const RAW_CN_GACHA_PATH = path.resolve(process.cwd(), '.cache/raw/zh_CN/gacha_table.json')
const OPERATORS_INDEX_PATH = path.resolve(process.cwd(), 'data/operators-index.json')
const OUTPUT_RECRUIT_PATH = path.resolve(process.cwd(), 'data/recruit.json')

const PROFESSION_TO_CLASS_TAG: Record<string, string> = {
  WARRIOR: 'Guard',
  SNIPER: 'Sniper',
  TANK: 'Defender',
  MEDIC: 'Medic',
  SUPPORT: 'Supporter',
  CASTER: 'Caster',
  SPECIAL: 'Specialist',
  PIONEER: 'Vanguard',
}

const POSITION_TO_TAG: Record<string, string> = {
  MELEE: 'Melee',
  RANGED: 'Ranged',
}

interface ParsedRecruitItem {
  name: string
  rarity: number
}

function parseRecruitDetail(detail: string): ParsedRecruitItem[] {
  const normalized = detail.replace(/\\n/g, '\n').replace(/<[^>]+>/g, '')
  const starRegex = /(★+)\s*([\s\S]*?)(?=(?:--------------------|\n\s*★+|$))/g
  let match: RegExpExecArray | null
  const items: ParsedRecruitItem[] = []

  while ((match = starRegex.exec(normalized)) !== null) {
    const stars = match[1].length
    const chunk = match[2]
    const rawNames = chunk
      .split('/')
      .map((s) => s.trim().replace(/^'|'$/g, '').trim())
      .filter(Boolean)

    for (const name of rawNames) {
      items.push({ name, rarity: stars })
    }
  }

  return items
}

function buildOperatorTags(op: OperatorSummary, rarity: number): string[] {
  const tags = new Set<string>()

  // Qualification tags
  if (rarity === 6) {
    tags.add('Top Operator')
  } else if (rarity === 5) {
    tags.add('Senior Operator')
  } else if (rarity === 2) {
    tags.add('Starter')
  }

  // Class tag
  const classTag = PROFESSION_TO_CLASS_TAG[op.class]
  if (classTag) {
    tags.add(classTag)
  }

  // Position tag
  const posTag = POSITION_TO_TAG[op.position]
  if (posTag) {
    tags.add(posTag)
  }

  // Affix tags from tagList
  if (op.tagList) {
    for (const tag of op.tagList) {
      tags.add(tag)
    }
  }

  return Array.from(tags).sort()
}

export async function buildRecruitData(): Promise<RecruitData> {
  console.log('=== Building Recruitment Data ===')

  const [enGachaRaw, cnGachaRaw, indexRaw] = await Promise.all([
    fs.readFile(RAW_EN_GACHA_PATH, 'utf-8'),
    fs.readFile(RAW_CN_GACHA_PATH, 'utf-8'),
    fs.readFile(OPERATORS_INDEX_PATH, 'utf-8'),
  ])

  const enGacha = JSON.parse(enGachaRaw) as { recruitDetail: string; gachaTags: Array<{ tagId: number; tagName: string; tagGroup: number }> }
  const cnGacha = JSON.parse(cnGachaRaw) as { recruitDetail: string }
  const operatorsIndex = JSON.parse(indexRaw) as OperatorSummary[]

  // Build lookups for operators
  const enNameToOp = new Map<string, OperatorSummary>()
  const zhNameToOp = new Map<string, OperatorSummary>()

  for (const op of operatorsIndex) {
    const cleanEn = op.name.en.replace(/^'|'$/g, '').trim()
    enNameToOp.set(cleanEn.toLowerCase(), op)
    zhNameToOp.set(op.name.zh.trim(), op)
  }

  // Parse pools
  const parsedEn = parseRecruitDetail(enGacha.recruitDetail)
  const parsedCn = parseRecruitDetail(cnGacha.recruitDetail)

  console.log(`Parsed ${parsedEn.length} Global recruit entries, ${parsedCn.length} CN recruit entries`)

  const globalPool: RecruitOperator[] = []
  for (const item of parsedEn) {
    const op = enNameToOp.get(item.name.toLowerCase())
    if (!op) {
      throw new Error(`Global recruit operator '${item.name}' not found in operators-index.json`)
    }
    globalPool.push({
      id: op.id,
      name: {
        en: op.name.en.replace(/^'|'$/g, '').trim(),
        zh: op.name.zh.trim(),
      },
      rarity: item.rarity,
      class: op.class,
      position: op.position,
      tags: buildOperatorTags(op, item.rarity),
      hasIcon: op.hasIcon,
    })
  }

  const cnPool: RecruitOperator[] = []
  for (const item of parsedCn) {
    const op = zhNameToOp.get(item.name)
    if (!op) {
      throw new Error(`CN recruit operator '${item.name}' not found in operators-index.json`)
    }
    cnPool.push({
      id: op.id,
      name: {
        en: op.name.en.replace(/^'|'$/g, '').trim(),
        zh: op.name.zh.trim(),
      },
      rarity: item.rarity,
      class: op.class,
      position: op.position,
      tags: buildOperatorTags(op, item.rarity),
      hasIcon: op.hasIcon,
    })
  }

  // 29 Canonical Tags with groups
  const tags: RecruitTag[] = [
    // Qualification (3)
    { id: 11, name: 'Top Operator', group: 'qualification' },
    { id: 14, name: 'Senior Operator', group: 'qualification' },
    { id: 17, name: 'Starter', group: 'qualification' },

    // Position (2)
    { id: 9, name: 'Melee', group: 'position' },
    { id: 10, name: 'Ranged', group: 'position' },

    // Class (8)
    { id: 1, name: 'Guard', group: 'class' },
    { id: 2, name: 'Sniper', group: 'class' },
    { id: 3, name: 'Defender', group: 'class' },
    { id: 4, name: 'Medic', group: 'class' },
    { id: 5, name: 'Supporter', group: 'class' },
    { id: 6, name: 'Caster', group: 'class' },
    { id: 7, name: 'Specialist', group: 'class' },
    { id: 8, name: 'Vanguard', group: 'class' },

    // Affix (16)
    { id: 15, name: 'Healing', group: 'affix' },
    { id: 16, name: 'Support', group: 'affix' },
    { id: 19, name: 'DPS', group: 'affix' },
    { id: 21, name: 'AoE', group: 'affix' },
    { id: 23, name: 'Slow', group: 'affix' },
    { id: 20, name: 'Survival', group: 'affix' },
    { id: 22, name: 'Defense', group: 'affix' },
    { id: 24, name: 'Debuff', group: 'affix' },
    { id: 26, name: 'Shift', group: 'affix' },
    { id: 12, name: 'Crowd-Control', group: 'affix' },
    { id: 13, name: 'Nuker', group: 'affix' },
    { id: 27, name: 'Summon', group: 'affix' },
    { id: 25, name: 'Fast-Redeploy', group: 'affix' },
    { id: 18, name: 'DP-Recovery', group: 'affix' },
    { id: 28, name: 'Robot', group: 'affix' },
    { id: 29, name: 'Elemental', group: 'affix' },
  ]

  const recruitData: RecruitData = {
    tags,
    pools: {
      global: globalPool,
      cn: cnPool,
    },
  }

  // Validate schema
  RecruitDataSchema.parse(recruitData)

  await fs.writeFile(OUTPUT_RECRUIT_PATH, JSON.stringify(recruitData, null, 2), 'utf-8')
  console.log(`Successfully generated data/recruit.json: Global pool ${globalPool.length}, CN pool ${cnPool.length}, 29 tags`)

  return recruitData
}

if (process.argv[1]?.includes('build-recruit')) {
  buildRecruitData().catch((err) => {
    console.error('Failed to build recruit data:', err)
    process.exit(1)
  })
}
