import path from 'node:path'
import {
  createGeminiClient,
  DEFAULT_GEMINI_MODEL,
  GeminiApiError,
} from './lib/gemini-client'
import {
  BATCH_IN_DIR,
  BATCH_OUT_DIR,
  PROMPT_DIR,
  countOutBatches,
  listBatchFiles,
  readBatchItems,
  readOutIds,
  toBatchItem,
  toUntranslatedItem,
  writeFailures,
  writeOutBatch,
  writePromptFile,
} from './lib/mt-batch'
import {
  buildTranslationPrompt,
  chunkItems,
  compareBatchFreshness,
  estimatePromptTokens,
  MT_RESPONSE_SCHEMA,
} from './lib/mt-prompt'
import { collectUntranslatedItems } from './translate-missing'
import { runTranslation } from './lib/mt-run'
import type { UntranslatedItem } from './translate-missing'

/**
 * CLI entry point for the machine-translation pipeline.
 *
 * Implemented modes:
 *   --check     verify GEMINI_API_KEY / GEMINI_MODEL with one minimal request
 *   --dry-run   build prompts for the untranslated strings without calling the API
 *
 * The translation loop and the import are added by later tasks.
 */

const DEFAULT_BATCH_SIZE = 60
const PREVIEW_ITEMS = 2

const USAGE = `Usage: jiti scripts/data/translate-with-gemini.ts <mode> [options]

Modes:
  --check              Verify GEMINI_API_KEY and GEMINI_MODEL with one minimal translation request.
  --dry-run            Build prompts for the untranslated strings and report what would be sent.
                       Makes no API requests.
  --run                Translate the untranslated strings and write the results to
                       .cache/translate/out/. Every returned string is validated; failures are
                       re-sent once with the specific diff, and whatever still fails is written
                       to .cache/translate/failed.jsonl instead of the output.

Options:
  --limit <n>          Only process the first n items.
  --batch <n>          Items per request (default: ${DEFAULT_BATCH_SIZE}).
  --resume             Skip items already present in .cache/translate/out/.
  --no-repair          Do not send the corrective retry; quarantine failures immediately.`

const CHECK_SYSTEM_INSTRUCTION =
  'You are a professional EN localizer for the mobile game Arknights. ' +
  'Translate the Chinese string into natural, official-sounding Arknights Global English. ' +
  'Use the provided glossary terms verbatim. Return a JSON array of {id, en} objects.'

const CHECK_ITEM = [
  {
    id: 'check_1',
    type: 'skill_name',
    zh: '新月的苏醒',
    glossary: { 新月: 'Crescent Moon', 苏醒: 'Awaken' },
  },
]

interface CliOptions {
  mode: '--check' | '--dry-run' | '--run'
  limit: number | null
  batchSize: number
  resume: boolean
  repair: boolean
}

/** Loads `.env` from the project root when present. Never throws. */
function loadDotEnv(): void {
  try {
    process.loadEnvFile(path.resolve(process.cwd(), '.env'))
  } catch {
    // .env is optional; real environments may inject variables directly.
  }
}

function parseArgs(argv: string[]): CliOptions {
  const mode = argv[0]
  if (mode !== '--check' && mode !== '--dry-run' && mode !== '--run') {
    throw new Error(`Unknown mode: ${mode ?? '(none)'}`)
  }

  let limit: number | null = null
  let batchSize = DEFAULT_BATCH_SIZE
  let resume = false
  let repair = true

  for (let index = 1; index < argv.length; index++) {
    const flag = argv[index]

    if (flag === '--resume') {
      resume = true
      continue
    }
    if (flag === '--no-repair') {
      repair = false
      continue
    }

    const rawValue = argv[index + 1]
    if (rawValue === undefined) throw new Error(`Missing value for ${flag}`)

    const value = Number(rawValue)
    if (!Number.isInteger(value) || value < 1) {
      throw new Error(`${flag} expects a positive integer, received "${rawValue}"`)
    }

    if (flag === '--limit') limit = value
    else if (flag === '--batch') batchSize = value
    else throw new Error(`Unknown option: ${flag}`)

    index += 1
  }

  return { mode, limit, batchSize, resume, repair }
}

function requireApiKey(): string {
  const apiKey = (process.env.GEMINI_API_KEY ?? '').trim()
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY is not set. Add it to .env (see .env.example) and try again.',
    )
  }
  return apiKey
}

function resolveModel(): string {
  return (process.env.GEMINI_MODEL ?? '').trim() || DEFAULT_GEMINI_MODEL
}

async function runCheck(): Promise<void> {
  const client = createGeminiClient({ apiKey: requireApiKey(), model: resolveModel() })

  const startedAt = Date.now()
  const translations = await client.generateJson<Array<{ id: string; en: string }>>({
    systemInstruction: CHECK_SYSTEM_INSTRUCTION,
    userPrompt: JSON.stringify(CHECK_ITEM),
    responseSchema: MT_RESPONSE_SCHEMA,
  })

  if (!Array.isArray(translations) || translations.length === 0) {
    throw new Error('Model returned an empty translation array.')
  }

  console.log('[PASS] Gemini connectivity check')
  console.log(`  model      : ${client.model}`)
  console.log(`  round-trip : ${Date.now() - startedAt}ms`)
  console.log('  response   :')
  for (const item of translations) {
    console.log(`    ${item.id} -> ${item.en}`)
  }
}

interface DryRunSummary {
  cachedCount: number
  cachedFiles: number
  liveCount: number
  isFresh: boolean
  staleCount: number
  missingCount: number
  requestCount: number
  estimatedTokens: number
  writtenFiles: number
}

async function runDryRun(options: CliOptions): Promise<DryRunSummary> {
  const files = await listBatchFiles()
  const cached: UntranslatedItem[] = (await readBatchItems(files)).map(toUntranslatedItem)

  const { items: liveItems } = await collectUntranslatedItems()
  const freshness = compareBatchFreshness(
    cached.map((item) => item.id),
    liveItems.map((item) => item.id),
  )

  // Prompts are built from a freshly collected set, never from the cached batch:
  // a cached batch can still contain strings that are already translated upstream.
  const source = options.limit ? liveItems.slice(0, options.limit) : liveItems
  const chunks = chunkItems(source, options.batchSize)

  let estimatedTokens = 0
  let writtenFiles = 0
  let firstPrompt: ReturnType<typeof buildTranslationPrompt> | null = null

  for (let index = 0; index < chunks.length; index++) {
    const prompt = buildTranslationPrompt(chunks[index]!)
    estimatedTokens += estimatePromptTokens(prompt)
    const name = `batch_${String(index + 1).padStart(3, '0')}.json`
    await writePromptFile(name, prompt)
    writtenFiles += 1
    if (index === 0) firstPrompt = prompt
  }

  console.log('[DRY RUN] Machine translation prompt preview')
  console.log(
    `  cached batch items : ${cached.length} (${files.length} file(s) in ${BATCH_IN_DIR})`,
  )
  console.log(`  untranslated now   : ${liveItems.length}`)
  console.log(
    `  freshness          : ${freshness.isFresh ? 'fresh' : 'STALE'}` +
      ` (stale: ${freshness.staleIds.length}, missing: ${freshness.missingIds.length})`,
  )
  console.log(`  batch size         : ${options.batchSize} -> ${chunks.length} request(s)`)
  console.log(`  estimated tokens   : ~${estimatedTokens.toLocaleString('en-US')}`)
  console.log(`  prompts written to : ${PROMPT_DIR}/ (${writtenFiles} file(s))`)

  const first = chunks[0]
  if (first && firstPrompt) {
    console.log('')
    console.log('--- system instruction ---')
    console.log(firstPrompt.systemInstruction)
    console.log('')
    console.log(`--- request 1 preview (first ${PREVIEW_ITEMS} of ${first.length} items) ---`)
    for (const item of first.slice(0, PREVIEW_ITEMS)) {
      const { id, ...rest } = item
      console.log(`  ${id} ${JSON.stringify(rest)}`)
    }
  }

  return {
    cachedCount: cached.length,
    cachedFiles: files.length,
    liveCount: liveItems.length,
    isFresh: freshness.isFresh,
    staleCount: freshness.staleIds.length,
    missingCount: freshness.missingIds.length,
    requestCount: chunks.length,
    estimatedTokens,
    writtenFiles,
  }
}

interface RunSummary {
  translated: number
  repaired: number
  failed: number
  requests: number
  batches: number
  skipped: number
  outFiles: number
  failedFile: string
}

async function runRun(options: CliOptions): Promise<RunSummary> {
  const client = createGeminiClient({ apiKey: requireApiKey(), model: resolveModel() })
  const { items: liveItems } = await collectUntranslatedItems()

  const source = options.limit ? liveItems.slice(0, options.limit) : liveItems
  const alreadyTranslated = options.resume ? await readOutIds() : new Set<string>()

  console.log(
    `Translating ${source.length} item(s) with ${client.model} (batch ${options.batchSize})`,
  )
  if (alreadyTranslated.size > 0) {
    console.log(`  resume: ${alreadyTranslated.size} id(s) already present in ${BATCH_OUT_DIR}`)
  }

  const result = await runTranslation({
    client,
    items: source,
    batchSize: options.batchSize,
    alreadyTranslated,
    repair: options.repair,
    onProgress: (message) => console.log(`  ${message}`),
  })

  // Continue numbering after any existing output so a resumed run appends
  // instead of overwriting the previous run's translations.
  const startIndex = (await countOutBatches()) + 1
  let index = startIndex
  for (const chunk of chunkItems(result.entries, options.batchSize)) {
    await writeOutBatch(
      index,
      chunk.map((entry) => ({ ...toBatchItem(entry.item), en: entry.en })),
    )
    index += 1
  }
  const outFiles = index - startIndex

  const failedFile = await writeFailures(result.failures)

  const repaired = result.entries.filter((entry) => entry.repaired).length
  console.log('')
  console.log('[RUN] Machine translation complete')
  console.log(`  model        : ${client.model}`)
  console.log(`  translated   : ${result.entries.length} (${repaired} after a corrective retry)`)
  console.log(`  quarantined  : ${result.failures.length}`)
  console.log(`  skipped      : ${result.skipped} (already translated)`)
  console.log(`  requests     : ${result.requests} for ${result.batches} batch(es)`)
  console.log(`  output       : ${BATCH_OUT_DIR}/ (batches up to ${outFiles})`)
  if (result.failures.length > 0) {
    console.log(`  failures     : ${failedFile}`)
    for (const failure of result.failures.slice(0, 5)) {
      console.log(`    ${failure.item.id}: ${failure.issues.join('; ')}`)
    }
  }

  return {
    translated: result.entries.length,
    repaired,
    failed: result.failures.length,
    requests: result.requests,
    batches: result.batches,
    skipped: result.skipped,
    outFiles,
    failedFile,
  }
}

async function main(): Promise<void> {
  let options: CliOptions
  try {
    options = parseArgs(process.argv.slice(2))
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    console.error(USAGE)
    process.exit(1)
  }

  loadDotEnv()

  try {
    if (options.mode === '--check') {
      await runCheck()
    } else if (options.mode === '--dry-run') {
      await runDryRun(options)
    } else {
      await runRun(options)
    }
  } catch (error) {
    const message =
      error instanceof GeminiApiError
        ? error.message
        : error instanceof Error
          ? error.message
          : String(error)
    console.error(`[FAIL] ${message}`)
    process.exit(1)
  }
}

if (process.argv[1] && path.resolve(process.argv[1]).includes('translate-with-gemini')) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  })
}
