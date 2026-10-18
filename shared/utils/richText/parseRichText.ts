import type { ParseRichTextOptions, RichTextNode } from './types'

/**
 * Known highlight tag identifiers found in Arknights game data.
 */
export const KNOWN_HIGHLIGHT_TAGS = new Set(['ba.vup', 'ba.vdown', 'ba.rem', 'ba.talpu', 'ba.kw'])

/**
 * Formats a raw numeric value according to Arknights placeholder format specifier.
 */
export function formatPlaceholderValue(value: number, formatSpecifier?: string): string {
  if (!formatSpecifier) {
    // No format: if integer, show integer; otherwise up to 2 decimals without trailing zeros
    if (Number.isInteger(value)) return String(value)
    return Number(value.toFixed(2)).toString()
  }

  const trimmedFmt = formatSpecifier.trim()

  switch (trimmedFmt) {
    case '0%': {
      const pct = Math.round(value * 100)
      return `${pct}%`
    }
    case '0.0%': {
      const pct = (value * 100).toFixed(1)
      return `${pct}%`
    }
    case '0': {
      return String(Math.round(value))
    }
    case '0.0': {
      return value.toFixed(1)
    }
    default: {
      if (Number.isInteger(value)) return String(value)
      return Number(value.toFixed(2)).toString()
    }
  }
}

/**
 * Resolves a placeholder key against the blackboard.
 * Handles negative signs, namespace prefixes ('attack@atk_scale'), and case sensitivity.
 */
export function resolveBlackboardValue(
  rawKeyExpression: string,
  blackboard?: Record<string, number>,
): { value: number; formatted: string } | null {
  if (!blackboard) return null

  const colonIdx = rawKeyExpression.indexOf(':')
  const keyWithMod = colonIdx !== -1 ? rawKeyExpression.slice(0, colonIdx) : rawKeyExpression
  const formatSpec = colonIdx !== -1 ? rawKeyExpression.slice(colonIdx + 1) : undefined

  const isNegative = keyWithMod.startsWith('-')
  const strippedKey = isNegative ? keyWithMod.slice(1) : keyWithMod

  const keyCandidates: string[] = [strippedKey, strippedKey.toLowerCase()]
  if (strippedKey.includes('@')) {
    const afterAt = strippedKey.split('@')[1]
    if (afterAt) {
      keyCandidates.push(afterAt, afterAt.toLowerCase())
    }
  }

  let foundVal: number | undefined

  for (const candidate of keyCandidates) {
    if (blackboard[candidate] !== undefined) {
      foundVal = blackboard[candidate]
      break
    }
    // Case-insensitive lookup against blackboard keys
    const matchedKey = Object.keys(blackboard).find(
      (bk) => bk.toLowerCase() === candidate.toLowerCase(),
    )
    if (matchedKey && blackboard[matchedKey] !== undefined) {
      foundVal = blackboard[matchedKey]
      break
    }
  }

  if (foundVal === undefined) {
    return null
  }

  const finalNum = isNegative ? -foundVal : foundVal
  return {
    value: finalNum,
    formatted: formatPlaceholderValue(finalNum, formatSpec),
  }
}

/**
 * Preprocesses text by interpolating all `{placeholder}` expressions from blackboard.
 * If a placeholder cannot be resolved, it is left as literal `{placeholder}` and a warning is triggered.
 */
function interpolatePlaceholders(
  text: string,
  blackboard?: Record<string, number>,
  onWarning?: (w: string) => void,
): string {
  return text.replace(/\{([^}]+)\}/g, (fullMatch, expr: string) => {
    const resolved = resolveBlackboardValue(expr, blackboard)
    if (resolved !== null) {
      return resolved.formatted
    }
    onWarning?.(`Unresolved blackboard placeholder '${fullMatch}'`)
    return fullMatch
  })
}

interface StackFrame {
  type: 'highlight' | 'term'
  tag: string
  termId?: string
  children: RichTextNode[]
}

/**
 * Pure parser transforming Arknights rich text descriptions into a structured AST of nodes.
 * Guarantees zero HTML string generation and safe handling of unknown or malformed tags.
 */
export function parseRichText(
  rawText: string | undefined | null,
  options: ParseRichTextOptions = {},
): RichTextNode[] {
  if (!rawText || rawText.length === 0) {
    return []
  }

  const { blackboard, terms, locale = 'en', onWarning } = options

  // 1. Interpolate placeholders first
  const processedText = interpolatePlaceholders(rawText, blackboard, onWarning)

  // 2. Tokenize and parse pseudo-XML tags and line breaks
  // Tag syntax:
  // - Opening highlight: <@ba.vup>
  // - Opening term: <$ba.stun>
  // - Closing tag: </>
  // - Line breaks: \n
  const rootNodes: RichTextNode[] = []
  const stack: StackFrame[] = []

  const currentChildren = (): RichTextNode[] => {
    if (stack.length > 0) {
      return stack[stack.length - 1]!.children
    }
    return rootNodes
  }

  const pushText = (str: string) => {
    if (!str) return
    const ch = currentChildren()
    const last = ch[ch.length - 1]
    if (last && last.type === 'text') {
      last.text += str
    } else {
      ch.push({ type: 'text', text: str })
    }
  }

  // Regex matching pseudo tags: <@...>, <$...>, </>, or \n
  const tokenRegex = /(<(\/?)([@$]?)([a-zA-Z0-9_.-]+)?>)|\n/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = tokenRegex.exec(processedText)) !== null) {
    // Process text prior to this token
    if (match.index > lastIndex) {
      pushText(processedText.slice(lastIndex, match.index))
    }
    lastIndex = tokenRegex.lastIndex

    const fullMatch = match[0]

    // Line break
    if (fullMatch === '\n') {
      currentChildren().push({ type: 'break' })
      continue
    }

    const isClosing = match[2] === '/'
    const prefix = match[3] // '@' or '$' or ''
    const identifier = match[4] // e.g. 'ba.vup', 'ba.stun', etc.

    if (isClosing) {
      // Closing tag </>
      if (stack.length > 0) {
        const frame = stack.pop()!
        if (frame.type === 'highlight') {
          currentChildren().push({
            type: 'highlight',
            tag: frame.tag,
            children: frame.children,
          })
        } else if (frame.type === 'term') {
          const termDef = terms?.[frame.termId!]
          const termName =
            (locale === 'zh' ? termDef?.name.zh : undefined) ?? termDef?.name.en ?? frame.termId!
          const termDesc =
            (locale === 'zh' ? termDef?.description.zh : undefined) ?? termDef?.description.en

          currentChildren().push({
            type: 'term',
            termId: frame.termId!,
            termName,
            description: termDesc,
            children: frame.children,
          })
        }
      } else {
        // Unexpected closing tag without matching opening tag
        onWarning?.(`Spurious closing tag '${fullMatch}' without matching open tag`)
        pushText(fullMatch)
      }
      continue
    }

    // Opening tag
    if (prefix === '@' && identifier) {
      if (!KNOWN_HIGHLIGHT_TAGS.has(identifier)) {
        onWarning?.(`Unknown highlight tag '<@${identifier}>'`)
      }
      stack.push({
        type: 'highlight',
        tag: identifier,
        children: [],
      })
    } else if (prefix === '$' && identifier) {
      if (!terms || !terms[identifier]) {
        onWarning?.(`Term '<$${identifier}>' not found in terms glossary`)
      }
      stack.push({
        type: 'term',
        tag: identifier,
        termId: identifier,
        children: [],
      })
    } else {
      // Plain angle bracket like <Substitute> or <替身>
      pushText(fullMatch)
    }
  }

  // Push remaining text
  if (lastIndex < processedText.length) {
    pushText(processedText.slice(lastIndex))
  }

  // Unclosed tags fallback
  while (stack.length > 0) {
    const frame = stack.pop()!
    onWarning?.(`Unclosed tag '<${frame.type === 'highlight' ? '@' : '$'}${frame.tag}>'`)
    if (frame.type === 'highlight') {
      currentChildren().push({
        type: 'highlight',
        tag: frame.tag,
        children: frame.children,
      })
    } else {
      const termDef = terms?.[frame.termId!]
      const termName =
        (locale === 'zh' ? termDef?.name.zh : undefined) ?? termDef?.name.en ?? frame.termId!
      const termDesc =
        (locale === 'zh' ? termDef?.description.zh : undefined) ?? termDef?.description.en

      currentChildren().push({
        type: 'term',
        termId: frame.termId!,
        termName,
        description: termDesc,
        children: frame.children,
      })
    }
  }

  return rootNodes
}
