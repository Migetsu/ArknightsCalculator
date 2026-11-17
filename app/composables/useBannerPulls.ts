import { ref } from 'vue'

/**
 * Per-banner pull counters captured from the Yostar sync payload.
 *
 * Spark coins only exist for limited banners with a 300-pull spark; LINKAGE
 * (collab) pools track pulls without a coin, so the raw pool counter is kept on
 * the device instead. Nothing is sent to the server or Supabase.
 */
export const BANNER_PULLS_STORAGE_KEY = 'arkcalc_banner_pulls'

const pulls = ref<Record<string, number>>({})
let loaded = false

function load(): void {
  if (loaded) return
  loaded = true
  if (!import.meta.client) return

  try {
    const raw = window.localStorage.getItem(BANNER_PULLS_STORAGE_KEY)
    if (!raw) return
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return

    const next: Record<string, number> = {}
    for (const [poolId, count] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof count === 'number' && Number.isFinite(count) && count > 0) {
        next[poolId] = Math.floor(count)
      }
    }
    pulls.value = next
  } catch {
    // Malformed storage must never break the dashboard.
  }
}

export function useBannerPulls(): {
  pulls: typeof pulls
  setPulls: (next: Record<string, number>) => void
} {
  load()

  function setPulls(next: Record<string, number>): void {
    const normalized: Record<string, number> = {}
    for (const [poolId, count] of Object.entries(next)) {
      if (Number.isFinite(count) && count > 0) normalized[poolId] = Math.floor(count)
    }
    pulls.value = normalized

    if (!import.meta.client) return
    try {
      window.localStorage.setItem(BANNER_PULLS_STORAGE_KEY, JSON.stringify(normalized))
    } catch {
      // Quota or privacy mode: the in-memory value still drives the dashboard.
    }
  }

  return { pulls, setPulls }
}
