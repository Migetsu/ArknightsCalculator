import { promises as fs } from 'node:fs'
import path from 'node:path'
import { z } from 'zod'
import type { UntranslatedItem, UntranslatedType } from '../translate-missing'

/**
 * File-system access for the machine-translation working directories.
 *
 * Everything here lives under `.cache/`, which is gitignored: batches are
 * working state. Only `data/i18n/machine/*.json` is committed.
 */

export const CACHE_DIR = '.cache/translate'
export const BATCH_IN_DIR = `${CACHE_DIR}/in`
export const BATCH_OUT_DIR = `${CACHE_DIR}/out`
export const PROMPT_DIR = `${CACHE_DIR}/prompts`
export const FAILED_FILE = `${CACHE_DIR}/failed.jsonl`

export const UNTRANSLATED_TYPES = [
  'operator_name',
  'skill_name',
  'talent_name',
  'module_name',
  'skill_desc',
  'talent_desc',
  'module_desc',
] as const satisfies readonly UntranslatedType[]

/**
 * Schema for one line of an exported batch. Mirrors `UntranslatedItem` from
 * `translate-missing.ts`; parsed rather than cast so a malformed cache fails
 * loudly instead of producing a silently wrong prompt.
 */
export const BatchItemSchema = z.object({
  id: z.string().min(1),
  type: z.enum(UNTRANSLATED_TYPES),
  charId: z.string(),
  charNameZh: z.string(),
  zh: z.string(),
  tags: z.array(z.string()),
  placeholders: z.array(z.string()),
  keys: z.array(z.string()),
  relevantGlossary: z.record(z.string(), z.string()),
})

export type BatchItem = z.infer<typeof BatchItemSchema>

function resolveFromCwd(target: string): string {
  return path.resolve(process.cwd(), target)
}

/** Lists `batch_NNN.jsonl` files in a directory, sorted by name. */
export async function listBatchFiles(dir: string = BATCH_IN_DIR): Promise<string[]> {
  try {
    const entries = await fs.readdir(resolveFromCwd(dir))
    return entries
      .filter((entry) => /^batch_\d+\.jsonl$/.test(entry))
      .sort()
      .map((entry) => path.join(resolveFromCwd(dir), entry))
  } catch {
    return []
  }
}

/** Reads and validates every item across the given batch files. */
export async function readBatchItems(files: string[]): Promise<BatchItem[]> {
  const items: BatchItem[] = []

  for (const file of files) {
    const raw = await fs.readFile(file, 'utf-8')
    const lines = raw.split(/\r?\n/).filter((line) => line.trim().length > 0)

    for (let index = 0; index < lines.length; index++) {
      const line = lines[index]!
      let parsed: unknown
      try {
        parsed = JSON.parse(line)
      } catch {
        throw new Error(`${path.basename(file)}:${index + 1} is not valid JSON`)
      }

      const result = BatchItemSchema.safeParse(parsed)
      if (!result.success) {
        throw new Error(
          `${path.basename(file)}:${index + 1} has an unexpected shape: ` +
            result.error.issues.map((issue) => issue.path.join('.') + ' ' + issue.message).join('; '),
        )
      }
      items.push(result.data)
    }
  }

  return items
}

/** Convenience wrapper: every item currently sitting in `.cache/translate/in/`. */
export async function readExportedItems(dir: string = BATCH_IN_DIR): Promise<BatchItem[]> {
  return readBatchItems(await listBatchFiles(dir))
}

/** Writes a built prompt next to the batches, for inspection during `--dry-run`. */
export async function writePromptFile(name: string, payload: unknown): Promise<string> {
  const dir = resolveFromCwd(PROMPT_DIR)
  await fs.mkdir(dir, { recursive: true })
  const file = path.join(dir, name)
  await fs.writeFile(file, JSON.stringify(payload, null, 2) + '\n', 'utf-8')
  return file
}

/** Converts a validated batch item into the prompt-facing shape. */
export function toUntranslatedItem(item: BatchItem): UntranslatedItem {
  return {
    id: item.id,
    type: item.type,
    charId: item.charId,
    charNameZh: item.charNameZh,
    zh: item.zh,
    tags: item.tags,
    placeholders: item.placeholders,
    keys: item.keys,
    relevantGlossary: item.relevantGlossary,
  }
}
