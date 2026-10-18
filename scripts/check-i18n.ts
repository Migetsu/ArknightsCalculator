import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'
import { baseCompile } from '@intlify/message-compiler'

export interface MismatchResult {
  missingInTarget: string[]
  extraInTarget: string[]
}

export interface MessageCompileError {
  file: string
  key: string
  message: string
  source: string
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
 * Validates message syntax by compiling every string with @intlify/message-compiler.
 */
export function validateMessageSyntax(
  record: Record<string, unknown>,
  fileLabel = '',
  prefix = '',
): MessageCompileError[] {
  const errors: MessageCompileError[] = []

  for (const [key, value] of Object.entries(record)) {
    const fullKey = prefix ? `${prefix}.${key}` : key

    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      errors.push(...validateMessageSyntax(value as Record<string, unknown>, fileLabel, fullKey))
    } else if (typeof value === 'string') {
      try {
        baseCompile(value, {
          onError: (err) => {
            errors.push({
              file: fileLabel,
              key: fullKey,
              message: err.message,
              source: value,
            })
          },
        })
      } catch (err: unknown) {
        errors.push({
          file: fileLabel,
          key: fullKey,
          message: err instanceof Error ? err.message : String(err),
          source: value,
        })
      }
    }
  }

  return errors
}

/**
 * CLI runner that reads en.json, validates its message syntax and key structure
 * to prevent runtime intlify errors.
 */
export function runI18nCheck(cwd = process.cwd()): void {
  const enPath = resolve(cwd, 'i18n/locales/en.json')
  const enRaw = readFileSync(enPath, 'utf-8')
  const enData = JSON.parse(enRaw) as Record<string, unknown>

  let hasError = false

  const enKeys = flattenKeys(enData)
  if (enKeys.length === 0) {
    console.error('en.json contains no keys!')
    process.exit(1)
  }

  const enSyntaxErrors = validateMessageSyntax(enData, 'en.json')

  if (enSyntaxErrors.length > 0) {
    hasError = true
    console.error('\nI18n message syntax compilation errors detected in en.json:')
    for (const err of enSyntaxErrors) {
      console.error(
        `  [${err.file}] key "${err.key}" failed compilation: ${err.message} (source: "${err.source}")`,
      )
    }
  }

  if (hasError) {
    console.error('\nI18n check failed!')
    process.exit(1)
  }

  console.log(
    `I18n check passed: en.json contains ${enKeys.length} valid keys and all messages compile cleanly.`,
  )
}

const isDirectExecution =
  process.argv[1] !== undefined &&
  (process.argv[1].endsWith('check-i18n.ts') || process.argv[1].endsWith('check-i18n.js'))

if (isDirectExecution) {
  runI18nCheck()
}
