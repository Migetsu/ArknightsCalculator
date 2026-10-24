import type { PenguinMatrixSnapshot } from '../../schemas/farming'
import type { Stage } from '../../schemas/stage'

export interface FarmingItemMeta {
  id: string
  name: string
  rarity: 1 | 2 | 3 | 4 | 5
  iconId?: string
}

export interface FarmingDataResponse {
  server: 'CN' | 'US'
  fetchedAt: string
  minSampleSize: number
  snapshot: PenguinMatrixSnapshot
  stagesMap: Record<string, Stage>
  itemsMap: Record<string, FarmingItemMeta>
}
