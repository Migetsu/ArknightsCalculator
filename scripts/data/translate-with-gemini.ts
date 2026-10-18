import path from 'node:path'
import {
  createGeminiClient,
  DEFAULT_GEMINI_MODEL,
  GeminiApiError,
} from './lib/gemini-client'

/**
 * CLI entry point for the machine-translation pipeline.
 *
 * Only `--check` is implemented: it verifies that the API key and model work
 * end to end. Batch export/translation/import modes are added by later tasks.
 */

const USAGE = `Usage: jiti scripts/data/translate-with-gemini.ts --check

  --check   Verify GEMINI_API_KEY and GEMINI_MODEL with one minimal translation request.`

const CHECK_SCHEMA: Record<string, unknown> = {
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

/** Loads `.env` from the project root when present. Never throws. */
function loadDotEnv(): void {
  try {
    process.loadEnvFile(path.resolve(process.cwd(), '.env'))
  } catch {
    // .env is optional; real environments may inject variables directly.
  }
}

interface CheckResult {
  model: string
  elapsedMs: number
  translations: Array<{ id: string; en: string }>
}

async function runCheck(): Promise<CheckResult> {
  const apiKey = (process.env.GEMINI_API_KEY ?? '').trim()
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY is not set. Add it to .env (see .env.example) and try again.',
    )
  }

  const model = (process.env.GEMINI_MODEL ?? '').trim() || DEFAULT_GEMINI_MODEL
  const client = createGeminiClient({ apiKey, model })

  const startedAt = Date.now()
  const translations = await client.generateJson<Array<{ id: string; en: string }>>({
    systemInstruction: CHECK_SYSTEM_INSTRUCTION,
    userPrompt: JSON.stringify(CHECK_ITEM, null, 2),
    responseSchema: CHECK_SCHEMA,
  })

  if (!Array.isArray(translations) || translations.length === 0) {
    throw new Error('Model returned an empty translation array.')
  }

  return { model, elapsedMs: Date.now() - startedAt, translations }
}

async function main(): Promise<void> {
  const mode = process.argv[2]

  if (mode !== '--check') {
    console.error(USAGE)
    process.exit(1)
  }

  loadDotEnv()

  try {
    const result = await runCheck()
    console.log('[PASS] Gemini connectivity check')
    console.log(`  model      : ${result.model}`)
    console.log(`  round-trip : ${result.elapsedMs}ms`)
    console.log('  response   :')
    for (const item of result.translations) {
      console.log(`    ${item.id} -> ${item.en}`)
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
