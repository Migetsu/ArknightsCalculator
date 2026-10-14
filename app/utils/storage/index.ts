import type { StorageAdapter } from './types'
import { IndexedDbAdapter } from './indexedDbAdapter'

export * from './types'
export * from './memoryAdapter'
export * from './indexedDbAdapter'

export function createDefaultStorageAdapter(): StorageAdapter {
  return new IndexedDbAdapter()
}
