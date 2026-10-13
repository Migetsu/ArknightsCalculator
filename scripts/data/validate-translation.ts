import { promises as fs } from 'node:fs'
import path from 'node:path'

export interface TranslationIssue {
  type: 'tag_mismatch' | 'tag_unclosed' | 'placeholder_mismatch' | 'newline_mismatch' | 'number_mismatch'
  message: string
  expected?: unknown
  actual?: unknown
}

export interface ValidationResult {
  valid: boolean
  issues: TranslationIssue[]
}

// Matches tags like <@ba.kw>, <$ba.protect>, <@ba.vup.b>, and closing </>.
const OPEN_TAG_REGEX = /<([@$][a-zA-Z0-9_.-]+)>/g
const CLOSE_TAG_REGEX = /<\/>/g
// Matches placeholders like {atk:0%}, {duration}, {heal_scale:0.0%}
const PLACEHOLDER_REGEX = /\{([a-zA-Z0-9_.-]+)(?::[^}]+)?\}/g

export function extractOpenTags(text: string): string[] {
  const matches: string[] = []
  let m: RegExpExecArray | null
  const re = new RegExp(OPEN_TAG_REGEX)
  while ((m = re.exec(text)) !== null) {
    if (m[1]) matches.push(m[1])
  }
  return matches
}

export function extractPlaceholders(text: string): string[] {
  const matches: string[] = []
  let m: RegExpExecArray | null
  const re = new RegExp(PLACEHOLDER_REGEX)
  while ((m = re.exec(text)) !== null) {
    if (m[1]) matches.push(m[1].toLowerCase())
  }
  return matches
}

export function validateTranslation(
  originalZh: string,
  translatedEn: string,
  options: {
    checkNewlines?: boolean
    checkNumbers?: boolean
  } = {},
): ValidationResult {
  const issues: TranslationIssue[] = []

  const zh = originalZh ?? ''
  const en = translatedEn ?? ''

  // If translation is identical to original or empty, only check basic structure
  if (!en.trim() || en === zh) {
    return { valid: true, issues: [] }
  }

  // 1. Tags check
  const zhOpenTags = extractOpenTags(zh).sort()
  const enOpenTags = extractOpenTags(en).sort()

  const _zhCloseCount = (zh.match(CLOSE_TAG_REGEX) || []).length
  const enCloseCount = (en.match(CLOSE_TAG_REGEX) || []).length

  if (JSON.stringify(zhOpenTags) !== JSON.stringify(enOpenTags)) {
    issues.push({
      type: 'tag_mismatch',
      message: `Open tags mismatch. Expected: [${zhOpenTags.join(', ')}], found: [${enOpenTags.join(', ')}]`,
      expected: zhOpenTags,
      actual: enOpenTags,
    })
  }

  if (enOpenTags.length !== enCloseCount) {
    issues.push({
      type: 'tag_unclosed',
      message: `Unclosed or mismatched tags in translation: ${enOpenTags.length} open vs ${enCloseCount} close tags`,
      expected: enOpenTags.length,
      actual: enCloseCount,
    })
  }

  // 2. Placeholders check ({atk:0%}, {damage}, etc.)
  const zhPlaceholders = extractPlaceholders(zh).sort()
  const enPlaceholders = extractPlaceholders(en).sort()

  if (JSON.stringify(zhPlaceholders) !== JSON.stringify(enPlaceholders)) {
    issues.push({
      type: 'placeholder_mismatch',
      message: `Placeholders mismatch. Expected: [${zhPlaceholders.join(', ')}], found: [${enPlaceholders.join(', ')}]`,
      expected: zhPlaceholders,
      actual: enPlaceholders,
    })
  }

  // 3. Newline check
  if (options.checkNewlines) {
    const zhNewlines = (zh.match(/\n/g) || []).length
    const enNewlines = (en.match(/\n/g) || []).length
    if (zhNewlines > 0 && enNewlines === 0) {
      issues.push({
        type: 'newline_mismatch',
        message: `Translation is missing newlines. Expected ${zhNewlines}, found ${enNewlines}`,
        expected: zhNewlines,
        actual: enNewlines,
      })
    }
  }

  return {
    valid: issues.length === 0,
    issues,
  }
}

async function runCliValidation(): Promise<void> {
  const operatorsDir = path.resolve(process.cwd(), 'data/operators')
  if (!path.resolve(operatorsDir)) return

  const files = await fs.readdir(operatorsDir)
  let totalChecked = 0
  let failedCount = 0
  const failureReports: string[] = []

  for (const file of files) {
    if (!file.endsWith('.json')) continue
    const raw = await fs.readFile(path.join(operatorsDir, file), 'utf-8')
    const op = JSON.parse(raw)
    const opId = op.id || file.replace('.json', '')

    // Check skills
    for (const skill of op.skills ?? []) {
      for (let l = 0; l < (skill.levels ?? []).length; l++) {
        const lvl = skill.levels[l]
        if (lvl.description?.en && lvl.description?.zh) {
          totalChecked++
          const res = validateTranslation(lvl.description.zh, lvl.description.en)
          if (!res.valid) {
            failedCount++
            failureReports.push(`[${opId}] Skill ${skill.skillId} lvl ${l}: ${res.issues.map((i) => i.message).join('; ')}`)
          }
        }
      }
    }

    // Check talents
    for (let t = 0; t < (op.talents ?? []).length; t++) {
      const talent = op.talents[t]
      for (let c = 0; c < (talent.candidates ?? []).length; c++) {
        const cand = talent.candidates[c]
        if (cand.description?.en && cand.description?.zh) {
          totalChecked++
          const res = validateTranslation(cand.description.zh, cand.description.en)
          if (!res.valid) {
            failedCount++
            failureReports.push(`[${opId}] Talent ${t} cand ${c}: ${res.issues.map((i) => i.message).join('; ')}`)
          }
        }
      }
    }
  }

  console.log(`=== Translation Validator ===`)
  console.log(`Total translated strings checked: ${totalChecked}`)
  if (failedCount > 0) {
    console.error(`[FAIL] Found ${failedCount} formatting/tag issues:`)
    for (const report of failureReports.slice(0, 20)) {
      console.error(' - ' + report)
    }
    if (failureReports.length > 20) {
      console.error(` ... and ${failureReports.length - 20} more`)
    }
    process.exit(1)
  }

  console.log(`[PASS] All ${totalChecked} translated descriptions passed tag and placeholder validation cleanly!`)
}

if (process.argv[1] && path.resolve(process.argv[1]).includes('validate-translation')) {
  runCliValidation().catch((err) => {
    console.error('Validation error:', err)
    process.exit(1)
  })
}
