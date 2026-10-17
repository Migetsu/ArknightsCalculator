import { promises as fs } from 'node:fs'
import path from 'node:path'
import {
  StageSchema,
  type Stage,
} from '../../shared/schemas/stage'
import type { ServerRegion } from '../../shared/schemas/operator'

interface RawStageItem {
  stageId: string
  code: string
  name?: string
  stageType: string
  zoneId?: string
  apCost?: number
}

interface RawStageTable {
  stages: Record<string, RawStageItem>
}

interface PenguinStageItem {
  stageId: string
  zoneId: string
  stageType: string
  code: string
  code_i18n?: Record<string, string>
  apCost?: number
  existence?: {
    CN?: { exist?: boolean }
    US?: { exist?: boolean }
  }
}

export interface StagesBuildResult {
  totalPenguin: number
  matchedCount: number
  unmatchedCount: number
  unmatchedTop30: Array<{ stageId: string; code: string; type: string }>
  stages: Record<string, Stage>
}

async function fetchPenguinStages(server: 'US' | 'CN'): Promise<PenguinStageItem[]> {
  const cacheDir = path.resolve(process.cwd(), '.cache/penguin')
  const cacheFile = path.join(cacheDir, `stages_${server}.json`)

  try {
    const res = await fetch(`https://penguin-stats.io/PenguinStats/api/v2/stages?server=${server}`, {
      headers: { 'User-Agent': 'ArknightsCalculator-Build/1.0' },
    })
    if (res.ok) {
      const data = (await res.json()) as PenguinStageItem[]
      await fs.mkdir(cacheDir, { recursive: true })
      await fs.writeFile(cacheFile, JSON.stringify(data, null, 2), 'utf-8')
      return data
    }
  } catch {
    // Network unavailable, fallback to cache
  }

  try {
    const raw = await fs.readFile(cacheFile, 'utf-8')
    return JSON.parse(raw) as PenguinStageItem[]
  } catch {
    return []
  }
}

export async function buildStages(): Promise<StagesBuildResult> {
  const cnRawPath = path.resolve(process.cwd(), '.cache/raw/zh_CN/stage_table.json')
  const enRawPath = path.resolve(process.cwd(), '.cache/raw/en_US/stage_table.json')

  const cnTable = JSON.parse(await fs.readFile(cnRawPath, 'utf-8')) as RawStageTable
  let enTable: RawStageTable = { stages: {} }
  try {
    enTable = JSON.parse(await fs.readFile(enRawPath, 'utf-8')) as RawStageTable
  } catch {
    // EN raw table optional
  }

  const [penguinUS, penguinCN] = await Promise.all([
    fetchPenguinStages('US'),
    fetchPenguinStages('CN'),
  ])

  const allPenguin = new Map<
    string,
    { item: PenguinStageItem; inUS: boolean; inCN: boolean }
  >()

  for (const s of penguinCN) {
    allPenguin.set(s.stageId, { item: s, inCN: true, inUS: false })
  }
  for (const s of penguinUS) {
    if (allPenguin.has(s.stageId)) {
      allPenguin.get(s.stageId)!.inUS = true
    } else {
      allPenguin.set(s.stageId, { item: s, inCN: false, inUS: true })
    }
  }

  let matchedCount = 0
  const unmatchedTop30: Array<{ stageId: string; code: string; type: string }> = []
  const outputStages: Record<string, Stage> = {}

  for (const [stageId, { item: pStage }] of allPenguin.entries()) {
    const baseStageId = stageId.replace(/_(rep|perm)$/, '')
    const cnStage = cnTable.stages[stageId] ?? cnTable.stages[baseStageId]
    const enStage = enTable.stages[stageId] ?? enTable.stages[baseStageId]

    const servers: ServerRegion[] = []
    if (pStage.existence?.CN?.exist) servers.push('cn')
    if (pStage.existence?.US?.exist) servers.push('global')
    if (servers.length === 0) servers.push('cn')

    if (cnStage) {
      matchedCount++
      const officialEn = (enStage?.name ?? '').trim()
      const zh = (cnStage.name ?? pStage.code).trim()
      const hasEn = officialEn.length > 0

      const stageObj: Stage = {
        stageId,
        code: cnStage.code || pStage.code,
        name: {
          en: hasEn ? officialEn : zh,
          zh,
          source: hasEn ? 'official' : 'zh',
          isMachineTranslation: false,
        },
        stageType: cnStage.stageType || pStage.stageType || 'MAIN',
        zoneId: cnStage.zoneId || pStage.zoneId || undefined,
        apCost: cnStage.apCost ?? pStage.apCost,
        matchedGameData: true,
        servers,
      }

      StageSchema.parse(stageObj)
      outputStages[stageId] = stageObj
    } else {
      if (unmatchedTop30.length < 30) {
        unmatchedTop30.push({
          stageId,
          code: pStage.code,
          type: pStage.stageType,
        })
      }

      const stageObj: Stage = {
        stageId,
        code: pStage.code,
        name: {
          en: pStage.code,
          zh: pStage.code,
          source: 'zh',
          isMachineTranslation: false,
        },
        stageType: pStage.stageType || 'ACTIVITY',
        zoneId: pStage.zoneId || undefined,
        apCost: pStage.apCost,
        matchedGameData: false,
        servers,
      }

      StageSchema.parse(stageObj)
      outputStages[stageId] = stageObj
    }
  }

  const unmatchedCount = allPenguin.size - matchedCount

  const outPath = path.resolve(process.cwd(), 'data/stages.json')
  await fs.writeFile(outPath, JSON.stringify(outputStages, null, 2) + '\n', 'utf-8')

  return {
    totalPenguin: allPenguin.size,
    matchedCount,
    unmatchedCount,
    unmatchedTop30,
    stages: outputStages,
  }
}

async function main() {
  console.log('=== Building Stages from Penguin Stats and Game Data ===')
  const result = await buildStages()
  console.log(`Total Penguin Stats stages: ${result.totalPenguin}`)
  console.log(`Matched with CN stage_table: ${result.matchedCount}`)
  console.log(`Unmatched (unsupported in farming): ${result.unmatchedCount}`)
  console.log('\nFirst 30 unmatched stages (pseudo-stages / reruns):')
  result.unmatchedTop30.forEach((s, idx) => {
    console.log(`  ${idx + 1}. [${s.type}] ${s.stageId} ("${s.code}")`)
  })
  console.log(`\nWritten data/stages.json with ${Object.keys(result.stages).length} stages.`)
}

if (process.argv[1]?.includes('build-stages')) {
  main().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
