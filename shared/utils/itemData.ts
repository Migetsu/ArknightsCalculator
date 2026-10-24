export const ITEM_ID_PATTERN = /^[a-zA-Z0-9_-]+$/

export function isValidItemId(id: string): boolean {
  if (!id || typeof id !== 'string') return false
  return id.length > 0 && id.length <= 64 && ITEM_ID_PATTERN.test(id)
}
