/**
 * Generic asynchronous storage adapter interface.
 * Abstracts local browser storage (IndexedDB) and enables seamless swapping
 * with cloud storage implementations (e.g. Supabase) without modifying store logic.
 */
export interface StorageAdapter {
  get<T>(key: string): Promise<T | null>
  set<T>(key: string, value: T): Promise<void>
  remove(key: string): Promise<void>
  clear(): Promise<void>

  // Aliases for compatibility
  getItem<T>(key: string): Promise<T | null>
  setItem<T>(key: string, value: T): Promise<void>
  removeItem(key: string): Promise<void>
}
