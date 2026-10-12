import { z } from 'zod'

/**
 * Standard text node with plain string content.
 */
export const RichTextTextNodeSchema = z.object({
  type: z.literal('text'),
  text: z.string(),
})

export type RichTextTextNode = z.infer<typeof RichTextTextNodeSchema>

/**
 * Line break node representing \n.
 */
export const RichTextBreakNodeSchema = z.object({
  type: z.literal('break'),
})

export type RichTextBreakNode = z.infer<typeof RichTextBreakNodeSchema>

/**
 * Highlight category tags in Arknights data.
 * e.g. 'ba.vup', 'ba.vdown', 'ba.rem', 'ba.talpu', 'ba.kw'.
 */
export const RichTextHighlightNodeSchema: z.ZodType<{
  type: 'highlight'
  tag: string
  children: RichTextNode[]
}> = z.lazy(() =>
  z.object({
    type: z.literal('highlight'),
    tag: z.string(),
    children: z.array(RichTextNodeSchema),
  }),
)

export type RichTextHighlightNode = {
  type: 'highlight'
  tag: string
  children: RichTextNode[]
}

/**
 * Terminology tooltip node referencing official constants terms.
 */
export const RichTextTermNodeSchema: z.ZodType<{
  type: 'term'
  termId: string
  termName?: string
  description?: string
  children: RichTextNode[]
}> = z.lazy(() =>
  z.object({
    type: z.literal('term'),
    termId: z.string(),
    termName: z.string().optional(),
    description: z.string().optional(),
    children: z.array(RichTextNodeSchema),
  }),
)

export type RichTextTermNode = {
  type: 'term'
  termId: string
  termName?: string
  description?: string
  children: RichTextNode[]
}

/**
 * Union schema of rich text AST nodes.
 */
export const RichTextNodeSchema: z.ZodType<RichTextNode> = z.lazy(() =>
  z.union([
    RichTextTextNodeSchema,
    RichTextBreakNodeSchema,
    RichTextHighlightNodeSchema,
    RichTextTermNodeSchema,
  ]),
)

export type RichTextNode =
  RichTextTextNode | RichTextBreakNode | RichTextHighlightNode | RichTextTermNode

/**
 * Options passed to rich text parser.
 */
export interface ParseRichTextOptions {
  /** Blackboard parameters of skill level or module stage */
  blackboard?: Record<string, number>
  /** Dictionary of terms loaded from constants.json */
  terms?: Record<
    string,
    {
      id: string
      name: { en: string; zh: string; ru?: string }
      description: { en: string; zh: string; ru?: string }
    }
  >
  /** Content locale for term names and descriptions ('en' | 'zh' | 'ru') */
  locale?: 'en' | 'zh' | 'ru'
  /** Collect warnings regarding unresolved placeholders or unknown tags */
  onWarning?: (warning: string) => void
}
