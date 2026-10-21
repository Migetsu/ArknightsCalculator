/**
 * Untyped JSON fetcher.
 *
 * Nitro types every H3 route literal, so matching a runtime-built URL string —
 * or passing `$fetch` around as a value — against the whole route union exceeds
 * TypeScript's instantiation depth (TS2321) as the route list grows. Callers
 * validate the response shape themselves, so this keeps `$fetch`'s runtime
 * behaviour without the type blow-up.
 */
export type JsonFetcher = (url: string) => Promise<unknown>

export const fetchJson: JsonFetcher = $fetch as unknown as JsonFetcher

/** Widens a `$fetch`-shaped function (e.g. `useRequestFetch()`) to `JsonFetcher`. */
export function asJsonFetcher(fetcher: unknown): JsonFetcher {
  return fetcher as JsonFetcher
}
