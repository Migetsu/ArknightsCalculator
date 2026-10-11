import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'

export interface MismatchResult {
  missingInTarget: string[]
  extraInTarget: string[]
}

/**
 * Recursively extracts all dot-separated leaf keys from a nested object.
 */
export function flattenKeys(record: Record<string, unknown>, prefix = ''): string[] {
  const keys: string[] = []

  for (const [key, value] of Object.entries(record)) {
    const fullKey = prefix ? `${prefix}.${key}` : key
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      keys.push(...flattenKeys(value as Record<string, unknown>, fullKey))
    } else {
      keys.push(fullKey)
    }
  }

  return keys.sort()
}

/**
 * Compares two locale objects and identifies missing or extra keys in target compared to base.
 */
export function compareLocaleRecords(
  base: Record<string, unknown>,
  target: Record<string, unknown>,
): MismatchResult {
  const baseKeys = new Set(flattenKeys(base))
  const targetKeys = new Set(flattenKeys(target))

  const missingInTarget: string[] = []
  const extraInTarget: string[] = []

  for (const key of baseKeys) {
    if (!targetKeys.has(key)) {
      missingInTarget.push(key)
    }
  }

  for (const key of targetKeys) {
    if (!baseKeys.has(key)) {
      extraInTarget.push(key)
    }
  }

  return {
    missingInTarget: missingInTarget.sort(),
    extraInTarget: extraInTarget.sort(),
  }
}

/**
 * CLI runner that reads en.json and ru.json files and checks their key symmetry.
 */
export function runI18nCheck(cwd = process.cwd()): void {
  const enPath = resolve(cwd, 'i18n/locales/en.json')
  const ruPath = resolve(cwd, 'i18n/locales/ru.json')

  const enRaw = readFileSync(enPath, 'utf-8')
  const ruRaw = readFileSync(ruPath, 'utf-8')

  const enData = JSON.parse(enRaw) as Record<string, unknown>
  const ruData = JSON.parse(ruRaw) as Record<string, unknown>

  const result = compareLocaleRecords(enData, ruData)

  let hasError = false

  if (result.missingInTarget.length > 0) {
    hasError = true
    console.error('Keys present in en.json but missing in ru.json:')
    for (const key of result.missingInTarget) {
      console.error(`  - ${key}`)
    }
  }

  if (result.extraInTarget.length > 0) {
    hasError = true
    console.error('Keys present in ru.json but missing in en.json:')
    for (const key of result.extraInTarget) {
      console.error(`  - ${key}`)
    }
  }

  if (hasError) {
    console.error('\nI18n key mismatch detected!')
    process.exit(1)
  }

  console.log('I18n check passed: en.json and ru.json keys are identical.')
}

const isDirectExecution =
  process.argv[1] !== undefined &&
  (process.argv[1].endsWith('check-i18n.ts') || process.argv[1].endsWith('check-i18n.js'))

if (isDirectExecution) {
  runI18nCheck()
}
