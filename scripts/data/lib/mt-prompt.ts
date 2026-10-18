import type { UntranslatedItem, UntranslatedType } from '../translate-missing'

/**
 * Pure prompt construction for the machine-translation pipeline.
 *
 * No file-system or network access here, so the prompt shape can be unit tested
 * directly. The batch/IO side lives in `mt-batch.ts`.
 */

/**
 * OpenAPI-subset schema passed as `generationConfig.responseSchema`.
 * A flat `{id, en}` array keeps results joinable by id.
 */
export const MT_RESPONSE_SCHEMA: Record<string, unknown> = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      en: { type: 'string' },
    },
    required: ['id', 'en'],
    propertyOrdering: ['id', 'en'],
  },
}

export const MT_SYSTEM_INSTRUCTION = [
  'You are a professional English localizer for the mobile game Arknights (Hypergryph / Yostar).',
  'Translate each Chinese string into the English used by the official Arknights Global client.',
  '',
  'Terminology',
  '- When an item lists a glossary, use those English terms verbatim for the Chinese terms shown.',
  '- Keep official capitalisation for game terms: ATK, DEF, RES, DP, Arts damage, Physical damage,',
  '  Redeploy, Block, Attack Interval, Skill, Talent, Module.',
  '',
  'Style by type',
  '- operator_name, skill_name, talent_name, module_name: short titles in Title Case, no trailing period.',
  '- skill_desc, talent_desc, module_desc: telegraphic gameplay prose in the present tense,',
  '  without pronouns for the unit. Keep the length close to the source; these render in tight UI panels.',
  '',
  'Markup',
  '- Inline tags such as <@ba.vup> and <$ba.levitate> (closed with </>) and {placeholder} tokens',
  '  are data, not text. Reproduce them byte for byte, in the same order and count, and keep every newline.',
  '  Never add a tag or placeholder that is not in the source.',
  '',
  'Output',
  'Return a JSON array with exactly one {"id","en"} object per input item, in the same order as the input.',
  'Do not add notes, comments or explanations.',
].join('\n')

export interface MtPromptItem {
  id: string
  type: UntranslatedType
  character?: string
  zh: string
  glossary?: Record<string, string>
}

export interface MtPrompt {
  systemInstruction: string
  userPrompt: string
  responseSchema: Record<string, unknown>
  itemIds: string[]
}

/**
 * Projects a collected item onto the compact shape sent to the model.
 * `character` and `glossary` are omitted when they would add no information,
 * which keeps the prompt small.
 */
export function toPromptItem(item: UntranslatedItem): MtPromptItem {
  const promptItem: MtPromptItem = {
    id: item.id,
    type: item.type,
    zh: item.zh,
  }

  const character = item.charNameZh.trim()
  if (character && character !== item.zh) {
    promptItem.character = character
  }

  if (Object.keys(item.relevantGlossary).length > 0) {
    promptItem.glossary = item.relevantGlossary
  }

  return promptItem
}

/** Builds the full request payload for a batch of items. */
export function buildTranslationPrompt(items: UntranslatedItem[]): MtPrompt {
  const promptItems = items.map(toPromptItem)

  return {
    systemInstruction: MT_SYSTEM_INSTRUCTION,
    // Compact JSON: indentation would add roughly a fifth to the prompt tokens
    // for no benefit the model can use.
    userPrompt: JSON.stringify(promptItems),
    responseSchema: MT_RESPONSE_SCHEMA,
    itemIds: promptItems.map((item) => item.id),
  }
}

/** Splits items into fixed-size batches. */
export function chunkItems<T>(items: T[], size: number): T[][] {
  if (!Number.isInteger(size) || size < 1) {
    throw new Error(`chunkItems: size must be a positive integer, received ${size}`)
  }

  const chunks: T[][] = []
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size))
  }
  return chunks
}

/**
 * Rough token estimate for a built prompt, for quota planning before spending
 * a request. Coefficients are fitted against the API's own `countTokens`
 * endpoint (CJK 0.827 tokens/char, Latin/JSON 0.330) and reproduce it within
 * ~1.5% across the current batches.
 */
export function estimatePromptTokens(prompt: MtPrompt): number {
  const text = prompt.systemInstruction + prompt.userPrompt
  const cjk = (text.match(/[\u3000-\u303f\u3400-\u9fff\uff00-\uffef]/g) ?? []).length
  const rest = text.length - cjk
  return Math.round(cjk * 0.827 + rest * 0.33)
}

export interface BatchFreshness {
  /** Items in the cached batch that no longer need translating. */
  staleIds: string[]
  /** Items that need translating now but are absent from the cached batch. */
  missingIds: string[]
  isFresh: boolean
}

/**
 * Compares a cached batch against a freshly collected set.
 *
 * Cached batches go stale the moment the upstream data changes — most often
 * when an official-translation import fills in strings that were previously
 * missing. A stale batch wastes API calls on already-translated text.
 */
export function compareBatchFreshness(
  batchIds: string[],
  liveIds: string[],
): BatchFreshness {
  const batch = new Set(batchIds)
  const live = new Set(liveIds)

  const staleIds = [...batch].filter((id) => !live.has(id))
  const missingIds = [...live].filter((id) => !batch.has(id))

  return {
    staleIds,
    missingIds,
    isFresh: staleIds.length === 0 && missingIds.length === 0,
  }
}
