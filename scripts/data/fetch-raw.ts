import { promises as fs } from 'node:fs'
import path from 'node:path'
import { DATA_SOURCES_CONFIG, getRawTableUrls, type RawDataSourceConfig } from './sources.config'
import { RAW_TABLE_SCHEMAS } from './schemas'

interface FetchOptions {
  sourceFilter: 'all' | 'cn' | 'en'
  tableFilter?: string[]
  force: boolean
  skipValidation: boolean
}

function parseCliArgs(): FetchOptions {
  const args = process.argv.slice(2)
  let sourceFilter: 'all' | 'cn' | 'en' = 'all'
  let tableFilter: string[] | undefined
  let force = false
  let skipValidation = false

  for (const arg of args) {
    if (arg === '--force') {
      force = true
    } else if (arg === '--skip-validation') {
      skipValidation = true
    } else if (arg.startsWith('--source=')) {
      const val = arg.split('=')[1]?.toLowerCase()
      if (val === 'cn' || val === 'en' || val === 'all') {
        sourceFilter = val
      }
    } else if (arg.startsWith('--table=')) {
      const val = arg.split('=')[1]
      if (val) {
        tableFilter = val.split(',').map((t) => t.trim())
      }
    }
  }

  return { sourceFilter, tableFilter, force, skipValidation }
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchWithTimeout(url: string, timeoutMs = 30000): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'ArknightsCalculator-DataFetcher/1.0',
      },
    })
    return res
  } finally {
    clearTimeout(timer)
  }
}

async function downloadWithFallback(
  primaryUrl: string,
  fallbackUrl: string,
  retries = 3,
  retryDelayMs = 1500,
): Promise<string> {
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= retries; attempt++) {
    // 1. Try primary URL (GitHub Raw)
    try {
      const res = await fetchWithTimeout(primaryUrl)
      if (res.ok) {
        return await res.text()
      }
      if (res.status !== 404) {
        console.warn(
          `  [Attempt ${attempt}] Primary failed with status ${res.status}. Falling back to mirror...`,
        )
      }
    } catch (err) {
      console.warn(
        `  [Attempt ${attempt}] Primary failed: ${(err as Error).message}. Falling back to mirror...`,
      )
      lastError = err as Error
    }

    // 2. Try fallback mirror (jsDelivr)
    try {
      const res = await fetchWithTimeout(fallbackUrl)
      if (res.ok) {
        return await res.text()
      }
      console.warn(`  [Attempt ${attempt}] Mirror failed with status ${res.status}`)
    } catch (err) {
      console.warn(`  [Attempt ${attempt}] Mirror failed: ${(err as Error).message}`)
      lastError = err as Error
    }

    if (attempt < retries) {
      await sleep(retryDelayMs * attempt)
    }
  }

  throw new Error(
    `Failed after ${retries} attempts. Primary: ${primaryUrl}. Last error: ${lastError?.message ?? 'Unknown'}`,
  )
}

function validateWithSchema(
  tableName: string,
  data: unknown,
): { valid: boolean; errors: string[] } {
  const schema = RAW_TABLE_SCHEMAS[tableName]
  if (!schema) {
    return { valid: true, errors: [] }
  }

  const result = schema.safeParse(data)
  if (result.success) {
    return { valid: true, errors: [] }
  }

  const errorMessages = result.error.issues.slice(0, 5).map((issue) => {
    return `Path [${issue.path.join('.')}]: ${issue.message}`
  })

  return {
    valid: false,
    errors: errorMessages,
  }
}

async function fetchTable(
  source: RawDataSourceConfig,
  tableName: string,
  options: FetchOptions,
): Promise<{ success: boolean; cached: boolean; size: number; error?: string }> {
  const targetDir = path.resolve(process.cwd(), DATA_SOURCES_CONFIG.cacheDir, source.locale)
  const targetPath = path.join(targetDir, tableName)

  await fs.mkdir(targetDir, { recursive: true })

  let content: string | null = null
  let cached = false

  if (!options.force) {
    try {
      const stat = await fs.stat(targetPath)
      if (stat.size > 0) {
        content = await fs.readFile(targetPath, 'utf-8')
        cached = true
      }
    } catch {
      // File does not exist, proceed to fetch
    }
  }

  if (!content) {
    const { primaryUrl, fallbackUrl } = getRawTableUrls(source, tableName)
    try {
      content = await downloadWithFallback(
        primaryUrl,
        fallbackUrl,
        DATA_SOURCES_CONFIG.retries,
        DATA_SOURCES_CONFIG.retryDelayMs,
      )
      await fs.writeFile(targetPath, content, 'utf-8')
    } catch (err) {
      return {
        success: false,
        cached: false,
        size: 0,
        error: (err as Error).message,
      }
    }
  }

  // Parse JSON
  let parsed: unknown
  try {
    parsed = JSON.parse(content)
  } catch (err) {
    return {
      success: false,
      cached,
      size: Buffer.byteLength(content, 'utf-8'),
      error: `Invalid JSON: ${(err as Error).message}`,
    }
  }

  // Schema validation
  if (!options.skipValidation) {
    const validation = validateWithSchema(tableName, parsed)
    if (!validation.valid) {
      return {
        success: false,
        cached,
        size: Buffer.byteLength(content, 'utf-8'),
        error: `Schema validation failed (${validation.errors.length} issues):\n    ${validation.errors.join('\n    ')}`,
      }
    }
  }

  return {
    success: true,
    cached,
    size: Buffer.byteLength(content, 'utf-8'),
  }
}

async function main(): Promise<void> {
  const options = parseCliArgs()
  console.log('=== Arknights Raw Data Fetcher ===')
  console.log(`Source filter: ${options.sourceFilter}`)
  console.log(`Force download: ${options.force}`)
  console.log(`Skip validation: ${options.skipValidation}`)
  if (options.tableFilter) {
    console.log(`Table filter: ${options.tableFilter.join(', ')}`)
  }

  const sourcesToProcess: RawDataSourceConfig[] = []
  if (options.sourceFilter === 'all' || options.sourceFilter === 'cn') {
    sourcesToProcess.push(DATA_SOURCES_CONFIG.sources.cn)
  }
  if (options.sourceFilter === 'all' || options.sourceFilter === 'en') {
    sourcesToProcess.push(DATA_SOURCES_CONFIG.sources.en)
  }

  let totalSuccess = 0
  let totalFailed = 0
  const startTime = Date.now()

  for (const source of sourcesToProcess) {
    console.log(
      `\nProcessing locale [${source.locale}] (${source.repo}@${source.commit.slice(0, 7)})...`,
    )

    const tables = options.tableFilter
      ? source.tables.filter((t) => options.tableFilter?.includes(t))
      : source.tables

    for (const tableName of tables) {
      process.stdout.write(`  Fetching ${tableName}... `)
      const res = await fetchTable(source, tableName, options)

      if (res.success) {
        totalSuccess++
        const sizeMb = (res.size / (1024 * 1024)).toFixed(2)
        const status = res.cached ? 'CACHED' : 'DOWNLOADED'
        console.log(`OK [${status}, ${sizeMb} MB]`)
      } else {
        totalFailed++
        console.log(`FAILED`)
        console.error(`    Error: ${res.error}`)
      }

      if (!res.cached) {
        await sleep(DATA_SOURCES_CONFIG.politeDelayMs)
      }
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(1)
  console.log('\n=== Summary ===')
  console.log(`Successful: ${totalSuccess}`)
  console.log(`Failed: ${totalFailed}`)
  console.log(`Time elapsed: ${duration}s`)

  if (totalFailed > 0) {
    process.exit(1)
  }
}

main().catch((err: unknown) => {
  console.error('Fatal fetcher error:', err)
  process.exit(1)
})
