/**
 * Wraps digits inside words (like "Mon3tr") in a span with Golos Text font family
 * to prevent Unbounded font from distorting digits 3 and 2.
 */
export function formatWordDigits(text: string): string {
  if (!text) return ''
  return text.replace(
    /([a-zA-Z\u0400-\u04FF]+)(\d+)([a-zA-Z\u0400-\u04FF]*)/g,
    '$1<span class="u-font-alt-num">$2</span>$3',
  )
}
