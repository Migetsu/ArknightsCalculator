/**
 * Shared state for the term tooltips inside rich text.
 *
 * `AkRichText` renders one description each, and every instance used to keep its
 * own `activeTermId`. Combined with `@click.stop` on a term (which stops the
 * document listener of the *other* instances from firing), that let several
 * tooltips stay open at once across different blocks.
 *
 * Tracking the active term here instead — keyed by a globally unique term id —
 * means opening one tooltip closes every other, which is what a popover should do.
 */

const activeTermId = ref<string | null>(null)

export function useActiveTermPopover(): {
  activeTermId: Ref<string | null>
  toggle: (termId: string) => void
  close: () => void
} {
  function toggle(termId: string): void {
    activeTermId.value = activeTermId.value === termId ? null : termId
  }

  function close(): void {
    activeTermId.value = null
  }

  return { activeTermId, toggle, close }
}

/**
 * Term ids inside a single description are positional (`"3-1"`), so they collide
 * between instances. Each `AkRichText` takes a unique prefix from here.
 */
let richTextInstanceCounter = 0

export function nextRichTextInstanceId(): number {
  richTextInstanceCounter += 1
  return richTextInstanceCounter
}
