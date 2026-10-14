import type { StorageAdapter } from './types'

/**
 * In-memory storage adapter for unit tests, SSR safety, and fallback operation.
 */
export class MemoryStorageAdapter implements StorageAdapter {
  private store = new Map<string, unknown>()

  async get<T>(key: string): Promise<T | null> {
    if (!this.store.has(key)) {
      return null
    }
    const val = this.store.get(key)
    // Deep clone to mirror serialization behavior of persistent stores
    return JSON.parse(JSON.stringify(val)) as T
  }

  async set<T>(key: string, value: T): Promise<void> {
    this.store.set(key, JSON.parse(JSON.stringify(value)))
  }

  async remove(key: string): Promise<void> {
    this.store.delete(key)
  }

  async clear(): Promise<void> {
    this.store.clear()
  }

  getItem<T>(key: string): Promise<T | null> {
    return this.get<T>(key)
  }

  setItem<T>(key: string, value: T): Promise<void> {
    return this.set<T>(key, value)
  }

  removeItem(key: string): Promise<void> {
    return this.remove(key)
  }
}
