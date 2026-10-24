import { createError } from 'h3'
import type { PenguinMatrixSnapshot, PenguinStageMatrix } from '../../shared/schemas/farming'
import type { Stage } from '../../shared/schemas/stage'
import type { GameItem } from '../../shared/schemas/item'
import type { FarmingDataResponse, FarmingItemMeta } from '../../shared/utils/farming/farmingData'
import { GUARANTEED_SUPPLY_STAGES } from '../../shared/utils/farming/optimize'

let cachedGlobal: FarmingDataResponse | null = null
let cachedCn: FarmingDataResponse | null = null

async function loadRawData(): Promise<{
  usRaw: PenguinMatrixSnapshot | null
  cnRaw: PenguinMatrixSnapshot | null
  stagesRaw: Record<string, Stage> | null
  itemsRaw: GameItem[] | null
}> {
  const [usRaw, cnRaw, stagesRaw, itemsRaw] = await Promise.all([
    useStorage('assets:penguin').getItem('us.json') as Promise<PenguinMatrixSnapshot | null>,
    useStorage('assets:penguin').getItem('cn.json') as Promise<PenguinMatrixSnapshot | null>,
    useStorage('assets:stages').getItem('stages.json') as Promise<Record<string, Stage> | null>,
    useStorage('assets:items').getItem('items.json') as Promise<GameItem[] | null>,
  ])

  return { usRaw, cnRaw, stagesRaw, itemsRaw }
}

function buildCompactSnapshot(source: PenguinMatrixSnapshot): PenguinMatrixSnapshot {
  const compactStages: Record<string, PenguinStageMatrix> = {}

  for (const [stageId, stage] of Object.entries(source.stages)) {
    compactStages[stageId] = {
      stageId: stage.stageId,
      code: stage.code,
      apCost: stage.apCost,
      exist: stage.exist,
      openTime: stage.openTime,
      closeTime: stage.closeTime,
      drops: stage.drops.map((drop) => ({
        itemId: drop.itemId,
        quantity: drop.quantity,
        times: drop.times,
        dropRate: drop.dropRate,
      })),
    }
  }

  return {
    server: source.server,
    fetchedAt: source.fetchedAt,
    minSampleSize: source.minSampleSize,
    stages: compactStages,
  }
}

function buildCompactStagesMap(
  snapshotStages: Record<string, PenguinStageMatrix>,
  fullStagesMap: Record<string, Stage>,
): Record<string, Stage> {
  const filteredMap: Record<string, Stage> = {}
  for (const stageId of Object.keys(snapshotStages)) {
    const meta = fullStagesMap[stageId]
    if (meta) {
      filteredMap[stageId] = meta
    }
  }
  for (const stage of GUARANTEED_SUPPLY_STAGES) {
    const meta = fullStagesMap[stage.stageId]
    if (meta) {
      filteredMap[stage.stageId] = meta
    }
  }
  return filteredMap
}

function buildItemsMap(items: GameItem[]): Record<string, FarmingItemMeta> {
  const map: Record<string, FarmingItemMeta> = {}
  for (const item of items) {
    map[item.id] = {
      id: item.id,
      name: item.name.en || item.name.zh || item.id,
      rarity: Math.max(1, Math.min(5, item.rarity)) as 1 | 2 | 3 | 4 | 5,
      iconId: item.iconId,
    }
  }
  return map
}

export async function readFarmingData(
  server: 'global' | 'cn' = 'global',
): Promise<FarmingDataResponse> {
  if (server === 'cn' && cachedCn) return cachedCn
  if (server !== 'cn' && cachedGlobal) return cachedGlobal

  const { usRaw, cnRaw, stagesRaw, itemsRaw } = await loadRawData()

  if (!stagesRaw || !itemsRaw) {
    throw createError({ statusCode: 500, statusMessage: 'Farming data sources unavailable' })
  }

  const itemsMap = buildItemsMap(itemsRaw)

  if (usRaw && !cachedGlobal) {
    const compactUs = buildCompactSnapshot(usRaw)
    const stagesMap = buildCompactStagesMap(compactUs.stages, stagesRaw)
    cachedGlobal = {
      server: 'US',
      fetchedAt: usRaw.fetchedAt,
      minSampleSize: usRaw.minSampleSize,
      snapshot: compactUs,
      stagesMap,
      itemsMap,
    }
  }

  if (cnRaw && !cachedCn) {
    const compactCn = buildCompactSnapshot(cnRaw)
    const stagesMap = buildCompactStagesMap(compactCn.stages, stagesRaw)
    cachedCn = {
      server: 'CN',
      fetchedAt: cnRaw.fetchedAt,
      minSampleSize: cnRaw.minSampleSize,
      snapshot: compactCn,
      stagesMap,
      itemsMap,
    }
  }

  const result = server === 'cn' ? cachedCn : cachedGlobal
  if (!result) {
    throw createError({ statusCode: 500, statusMessage: `Farming data for ${server} unavailable` })
  }

  return result
}
