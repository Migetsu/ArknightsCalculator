import { promises as fs } from 'node:fs'
import path from 'node:path'
import {
  RangesDictionarySchema,
  RangeTableEntrySchema,
  type RangesDictionary,
  type RangeTableEntry,
} from '../../shared/schemas/range'
import { normalizeRange, type RawRangeGridInput } from '../../shared/utils/range'

const CACHE_DIR = path.resolve(process.cwd(), '.cache/raw')
const OUTPUT_FILE = path.resolve(process.cwd(), 'data/ranges.json')

interface RawRangeTableItem {
  id: string
  direction: number
  grids: Array<{ row: number; col: number }>
}

type RawRangeTable = Record<string, RawRangeTableItem>

async function loadRawTable(locale: 'en' | 'cn'): Promise<RawRangeTable> {
  const filePath = path.join(CACHE_DIR, locale, 'range_table.json')
  try {
    const raw = await fs.readFile(filePath, 'utf-8')
    return JSON.parse(raw) as RawRangeTable
  } catch (err) {
    console.warn(`[WARN] Failed to load range_table.json for locale ${locale}:`, err)
    return {}
  }
}

export async function buildRanges(): Promise<{
  totalRanges: number
  ranges: RangesDictionary
}> {
  console.log('=== Building Operator Attack Ranges (data/ranges.json) ===\n')

  const [enTable, cnTable] = await Promise.all([loadRawTable('en'), loadRawTable('cn')])

  const allKeys = Array.from(new Set([...Object.keys(enTable), ...Object.keys(cnTable)])).sort(
    (a, b) => a.localeCompare(b, undefined, { numeric: true }),
  )

  const normalizedRanges: Record<string, RangeTableEntry> = {}

  for (const id of allKeys) {
    const rawEntry = enTable[id] ?? cnTable[id]
    if (!rawEntry) continue

    const rawInput: RawRangeGridInput = {
      id: rawEntry.id,
      direction: rawEntry.direction,
      grids: rawEntry.grids.map((g) => ({ row: g.row, col: g.col })),
    }

    const normalized = normalizeRange(rawInput)
    // Validate entry schema
    RangeTableEntrySchema.parse(normalized)

    normalizedRanges[id] = normalized
  }

  // Validate complete dictionary schema
  const validatedDict = RangesDictionarySchema.parse(normalizedRanges)

  await fs.mkdir(path.dirname(OUTPUT_FILE), { recursive: true })
  await fs.writeFile(OUTPUT_FILE, JSON.stringify(validatedDict, null, 2) + '\n', 'utf-8')

  console.log(`Successfully built ${Object.keys(validatedDict).length} attack ranges.`)
  console.log(`Saved output to: ${OUTPUT_FILE}`)

  return {
    totalRanges: Object.keys(validatedDict).length,
    ranges: validatedDict,
  }
}

if (process.argv[1]?.includes('build-ranges')) {
  buildRanges().catch((err) => {
    console.error('Fatal error building ranges:', err)
    process.exit(1)
  })
}
