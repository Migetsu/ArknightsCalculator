import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { GameItem } from '../../../shared/schemas/item'
import type { PenguinMatrixSnapshot, PenguinStageMatrix } from '../../../shared/schemas/farming'
import type { Stage } from '../../../shared/schemas/stage'
import type {
  FarmingDataResponse,
  FarmingItemMeta,
} from '../../../shared/utils/farming/farmingData'
import { GUARANTEED_SUPPLY_STAGES } from '../../../shared/utils/farming/optimize'

const OPERATOR_API_PATTERN = /^\/api\/(operators|handbook)\/([a-zA-Z0-9_]+)$/
const ITEM_API_PATTERN = /^\/api\/items\/([a-zA-Z0-9_-]+)$/
const FARMING_API_PATTERN = /^\/api\/farming\/data(\?.*)?$/

let cachedItems: Map<string, GameItem> | null = null
let cachedFarmingGlobal: FarmingDataResponse | null = null
let cachedFarmingCn: FarmingDataResponse | null = null

async function loadItems(): Promise<Map<string, GameItem>> {
  if (cachedItems) return cachedItems
  const filePath = resolve(process.cwd(), 'data', 'items.json')
  const raw = await readFile(filePath, 'utf-8')
  const list = JSON.parse(raw) as GameItem[]
  cachedItems = new Map(list.map((it) => [it.id, it]))
  return cachedItems
}

async function loadFarmingData(server: 'global' | 'cn'): Promise<FarmingDataResponse> {
  if (server === 'cn' && cachedFarmingCn) return cachedFarmingCn
  if (server !== 'cn' && cachedFarmingGlobal) return cachedFarmingGlobal

  const itemsMap = await loadItems()
  const stagesRaw = JSON.parse(
    await readFile(resolve(process.cwd(), 'data', 'stages.json'), 'utf-8'),
  ) as Record<string, Stage>

  const snapshotFile = server === 'cn' ? 'cn.json' : 'us.json'
  const snapshotRaw = JSON.parse(
    await readFile(resolve(process.cwd(), 'data', 'penguin', snapshotFile), 'utf-8'),
  ) as PenguinMatrixSnapshot

  const compactStages: Record<string, PenguinStageMatrix> = {}
  for (const [id, s] of Object.entries(snapshotRaw.stages)) {
    compactStages[id] = {
      stageId: s.stageId,
      code: s.code,
      apCost: s.apCost,
      exist: s.exist,
      openTime: s.openTime,
      closeTime: s.closeTime,
      drops: s.drops.map((d) => ({
        itemId: d.itemId,
        quantity: d.quantity,
        times: d.times,
        dropRate: d.dropRate,
      })),
    }
  }

  const stagesMeta: Record<string, Stage> = {}
  for (const id of Object.keys(compactStages)) {
    if (stagesRaw[id]) {
      stagesMeta[id] = stagesRaw[id]!
    }
  }
  for (const stage of GUARANTEED_SUPPLY_STAGES) {
    if (stagesRaw[stage.stageId]) {
      stagesMeta[stage.stageId] = stagesRaw[stage.stageId]!
    }
  }

  const itemsMeta: Record<string, FarmingItemMeta> = {}
  for (const [id, it] of itemsMap.entries()) {
    itemsMeta[id] = {
      id: it.id,
      name: it.name.en || it.name.zh || it.id,
      rarity: Math.max(1, Math.min(5, it.rarity)) as 1 | 2 | 3 | 4 | 5,
      iconId: it.iconId,
    }
  }

  const response: FarmingDataResponse = {
    server: snapshotRaw.server,
    fetchedAt: snapshotRaw.fetchedAt,
    minSampleSize: snapshotRaw.minSampleSize,
    snapshot: {
      server: snapshotRaw.server,
      fetchedAt: snapshotRaw.fetchedAt,
      minSampleSize: snapshotRaw.minSampleSize,
      stages: compactStages,
    },
    stagesMap: stagesMeta,
    itemsMap: itemsMeta,
  }

  if (server === 'cn') {
    cachedFarmingCn = response
  } else {
    cachedFarmingGlobal = response
  }

  return response
}

/**
 * Test double for the Nitro data endpoints. Reads the same JSON files the
 * server generator consumes, so component/composable tests keep exercising real
 * game data after the switch from dynamic imports to the HTTP API.
 */
export async function readOperatorDataFixture(url: string): Promise<unknown> {
  const farmingMatch = FARMING_API_PATTERN.exec(url)
  if (farmingMatch) {
    const isCn = url.includes('server=cn')
    return loadFarmingData(isCn ? 'cn' : 'global')
  }

  const itemMatch = ITEM_API_PATTERN.exec(url)
  if (itemMatch) {
    const id = itemMatch[1]
    if (!id) throw new Error(`Missing item id in ${url}`)
    const items = await loadItems()
    const item = items.get(id)
    if (!item) {
      throw new Error(`Item not found in fixture: ${id}`)
    }
    return item
  }

  const match = OPERATOR_API_PATTERN.exec(url)
  const dataset = match?.[1]
  const id = match?.[2]
  if (!dataset || !id) {
    throw new Error(`Unexpected operator data request: ${url}`)
  }

  const filePath = resolve(process.cwd(), 'data', dataset, `${id}.json`)
  const raw = await readFile(filePath, 'utf-8')
  return JSON.parse(raw) as unknown
}
