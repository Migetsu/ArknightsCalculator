import type { StorageAdapter } from './types'
import { MemoryStorageAdapter } from './memoryAdapter'

/**
 * Native Promise-based IndexedDB storage adapter.
 * Uses zero third-party dependencies to keep bundle overhead strictly 0 KB.
 * Gracefully degrades to MemoryStorageAdapter if IndexedDB is unavailable or running on SSR.
 */
export class IndexedDbAdapter implements StorageAdapter {
  private dbName: string
  private storeName: string
  private fallback: MemoryStorageAdapter | null = null
  private dbPromise: Promise<IDBDatabase> | null = null

  constructor(dbName = 'arkcalc', storeName = 'depot') {
    this.dbName = dbName
    this.storeName = storeName
    if (typeof window === 'undefined' || !window.indexedDB) {
      this.fallback = new MemoryStorageAdapter()
    }
  }

  private getDb(): Promise<IDBDatabase> {
    if (this.fallback) {
      return Promise.reject(new Error('IndexedDB not supported in current environment'))
    }
    if (this.dbPromise) {
      return this.dbPromise
    }

    this.dbPromise = new Promise((resolve, reject) => {
      const request = window.indexedDB.open(this.dbName, 1)

      request.onupgradeneeded = () => {
        const db = request.result
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName)
        }
      }

      request.onsuccess = () => {
        resolve(request.result)
      }

      request.onerror = () => {
        this.fallback = new MemoryStorageAdapter()
        reject(request.error ?? new Error('Failed to open IndexedDB'))
      }

      request.onblocked = () => {
        // Handle blocked database upgrades gracefully
      }
    })

    return this.dbPromise
  }

  async get<T>(key: string): Promise<T | null> {
    if (this.fallback) {
      return this.fallback.get<T>(key)
    }

    try {
      const db = await this.getDb()
      return new Promise<T | null>((resolve, reject) => {
        const tx = db.transaction(this.storeName, 'readonly')
        const store = tx.objectStore(this.storeName)
        const request = store.get(key)

        request.onsuccess = () => {
          resolve((request.result as T) ?? null)
        }
        request.onerror = () => {
          reject(request.error ?? new Error(`Failed to get key: ${key}`))
        }
      })
    } catch {
      if (!this.fallback) {
        this.fallback = new MemoryStorageAdapter()
      }
      return this.fallback.get<T>(key)
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    if (this.fallback) {
      return this.fallback.set<T>(key, value)
    }

    try {
      const db = await this.getDb()
      return new Promise<void>((resolve, reject) => {
        const tx = db.transaction(this.storeName, 'readwrite')
        const store = tx.objectStore(this.storeName)
        const request = store.put(value, key)

        request.onsuccess = () => {
          resolve()
        }
        request.onerror = () => {
          reject(request.error ?? new Error(`Failed to set key: ${key}`))
        }
      })
    } catch {
      if (!this.fallback) {
        this.fallback = new MemoryStorageAdapter()
      }
      return this.fallback.set<T>(key, value)
    }
  }

  async remove(key: string): Promise<void> {
    if (this.fallback) {
      return this.fallback.remove(key)
    }

    try {
      const db = await this.getDb()
      return new Promise<void>((resolve, reject) => {
        const tx = db.transaction(this.storeName, 'readwrite')
        const store = tx.objectStore(this.storeName)
        const request = store.delete(key)

        request.onsuccess = () => {
          resolve()
        }
        request.onerror = () => {
          reject(request.error ?? new Error(`Failed to delete key: ${key}`))
        }
      })
    } catch {
      if (!this.fallback) {
        this.fallback = new MemoryStorageAdapter()
      }
      return this.fallback.remove(key)
    }
  }

  async clear(): Promise<void> {
    if (this.fallback) {
      return this.fallback.clear()
    }

    try {
      const db = await this.getDb()
      return new Promise<void>((resolve, reject) => {
        const tx = db.transaction(this.storeName, 'readwrite')
        const store = tx.objectStore(this.storeName)
        const request = store.clear()

        request.onsuccess = () => {
          resolve()
        }
        request.onerror = () => {
          reject(request.error ?? new Error('Failed to clear store'))
        }
      })
    } catch {
      if (!this.fallback) {
        this.fallback = new MemoryStorageAdapter()
      }
      return this.fallback.clear()
    }
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
