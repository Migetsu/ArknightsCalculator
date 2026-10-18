import { validateTranslation } from '../validate-translation'
import type { UntranslatedItem } from '../translate-missing'
import type { GeminiClient } from './gemini-client'
import {
  buildRepairPrompt,
  buildTranslationPrompt,
  chunkItems,
  type MtRepairFailure,
} from './mt-prompt'

/**
 * The translation loop: request, validate, correct once, quarantine.
 *
 * Kept free of file-system and network construction so it can be driven by a
 * fake client in tests. The CLI owns the IO.
 */

/** Matches any CJK character; an English translation must not contain one. */
const CJK_REGEX = /[\u3000-\u303f\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff00-\uffef]/

export interface TranslatedEntry {
  item: UntranslatedItem
  en: string
  /** True when the string only passed after a corrective retry. */
  repaired: boolean
}

export interface TranslationRunResult {
  entries: TranslatedEntry[]
  failures: MtRepairFailure[]
  /** Total API requests made, including corrective retries. */
  requests: number
  batches: number
  /** Items skipped because a previous run already translated them. */
  skipped: number
}

export interface TranslationRunOptions {
  client: GeminiClient
  items: UntranslatedItem[]
  batchSize: number
  /** Ids already present in the output directory; skipped entirely. */
  alreadyTranslated?: ReadonlySet<string>
  /** Send the corrective retry for validation failures. Defaults to true. */
  repair?: boolean
  onProgress?: (message: string) => void
}

type TranslationResponse = Array<{ id?: string; en?: string }>

function toResponseMap(response: TranslationResponse): Map<string, string> {
  const map = new Map<string, string>()
  if (!Array.isArray(response)) return map

  for (const entry of response) {
    if (!entry || typeof entry.id !== 'string') continue
    if (typeof entry.en !== 'string') continue
    map.set(entry.id, entry.en.trim())
  }
  return map
}

/**
 * Contract checks beyond tag/placeholder/newline parity. `validateTranslation`
 * treats an empty or source-identical string as valid (it is used on already
 * imported data), which is not good enough here.
 */
export function checkTranslation(zh: string, en: string): string[] {
  const issues: string[] = []

  if (!en.trim()) {
    issues.push('the model returned no translation for this item')
    return issues
  }
  if (en === zh) {
    issues.push('the translation is identical to the Chinese source')
  }
  if (en === '[Pending Translation]') {
    issues.push('the model returned the pending placeholder')
  }
  if (CJK_REGEX.test(en)) {
    issues.push('the translation still contains Chinese characters')
  }

  const result = validateTranslation(zh, en, { checkNewlines: true })
  for (const issue of result.issues) {
    issues.push(issue.message)
  }

  return issues
}

/**
 * Runs the translation loop over `items`.
 *
 * Each batch is requested once; whatever fails validation is re-sent in a
 * single corrective request that carries the specific diff. Strings that still
 * fail are returned in `failures` and never reach the output directory.
 */
export async function runTranslation(
  options: TranslationRunOptions,
): Promise<TranslationRunResult> {
  const { client, items, batchSize } = options
  const alreadyTranslated = options.alreadyTranslated ?? new Set<string>()
  const repairEnabled = options.repair ?? true
  const report = options.onProgress ?? ((): void => {})

  const pending = items.filter((item) => !alreadyTranslated.has(item.id))
  const chunks = chunkItems(pending, batchSize)

  const entries: TranslatedEntry[] = []
  const failures: MtRepairFailure[] = []
  let requests = 0

  for (let index = 0; index < chunks.length; index++) {
    const chunk = chunks[index]!
    const label = `batch ${index + 1}/${chunks.length} (${chunk.length} items)`

    const prompt = buildTranslationPrompt(chunk)
    const response = await client.generateJson<TranslationResponse>({
      systemInstruction: prompt.systemInstruction,
      userPrompt: prompt.userPrompt,
      responseSchema: prompt.responseSchema,
    })
    requests += 1

    const byId = toResponseMap(response)
    const roundFailures: MtRepairFailure[] = []

    for (const item of chunk) {
      const en = byId.get(item.id) ?? ''
      const issues = checkTranslation(item.zh, en)

      if (issues.length === 0) {
        entries.push({ item, en, repaired: false })
      } else {
        roundFailures.push({ item, en, issues })
      }
    }

    report(`${label}: ${chunk.length - roundFailures.length} ok, ${roundFailures.length} to repair`)

    if (roundFailures.length > 0 && repairEnabled) {
      const repairPrompt = buildRepairPrompt(roundFailures)
      const repairResponse = await client.generateJson<TranslationResponse>({
        systemInstruction: repairPrompt.systemInstruction,
        userPrompt: repairPrompt.userPrompt,
        responseSchema: repairPrompt.responseSchema,
      })
      requests += 1

      const repairedById = toResponseMap(repairResponse)
      const stillFailing: MtRepairFailure[] = []
      let repairedCount = 0

      for (const failure of roundFailures) {
        const en = repairedById.get(failure.item.id) ?? ''
        const issues = checkTranslation(failure.item.zh, en)

        if (issues.length === 0) {
          entries.push({ item: failure.item, en, repaired: true })
          repairedCount += 1
        } else {
          stillFailing.push({ item: failure.item, en, issues })
        }
      }

      report(`${label}: repair recovered ${repairedCount}, ${stillFailing.length} quarantined`)
      failures.push(...stillFailing)
    } else if (roundFailures.length > 0) {
      report(`${label}: ${roundFailures.length} quarantined (repair disabled)`)
      failures.push(...roundFailures)
    }
  }

  return {
    entries,
    failures,
    requests,
    batches: chunks.length,
    skipped: items.length - pending.length,
  }
}
