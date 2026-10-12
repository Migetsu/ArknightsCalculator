import { promises as fs } from 'node:fs'
import path from 'node:path'

interface ScanReport {
  totalTexts: number
  totalPlaceholders: number
  resolvedPlaceholders: number
  unresolvedPlaceholders: Array<{
    operatorId: string
    context: string
    key: string
    availableBlackboard: string[]
  }>
  tagFrequency: Record<string, number>
  termFrequency: Record<string, number>
  formatFrequency: Record<string, number>
  plainAngleBrackets: Record<string, number>
}

export async function scanRichTextData(): Promise<ScanReport> {
  const dir = path.resolve(process.cwd(), 'data/operators')
  const files = (await fs.readdir(dir)).filter((f) => f.endsWith('.json'))

  const report: ScanReport = {
    totalTexts: 0,
    totalPlaceholders: 0,
    resolvedPlaceholders: 0,
    unresolvedPlaceholders: [],
    tagFrequency: {},
    termFrequency: {},
    formatFrequency: {},
    plainAngleBrackets: {},
  }

  for (const file of files) {
    const raw = await fs.readFile(path.join(dir, file), 'utf-8')
    const op = JSON.parse(raw) as {
      id: string
      skills?: Array<{
        skillId: string
        levels?: Array<{
          description?: { en?: string; zh?: string }
          blackboard?: Record<string, number>
        }>
      }>
      talents?: Array<{
        candidates?: Array<{
          description?: { en?: string; zh?: string }
          blackboard?: Record<string, number>
        }>
      }>
      modules?: Array<{
        id: string
        stages?: Array<{
          parts?: Array<{
            candidates?: Array<{
              additionalDescription?: { en?: string; zh?: string }
              upgradeDescription?: { en?: string; zh?: string }
              overrideDescription?: { en?: string; zh?: string }
              blackboard?: Record<string, number>
            }>
          }>
        }>
      }>
    }

    const inspect = (
      text: string | undefined,
      blackboard: Record<string, number> | undefined,
      context: string,
    ) => {
      if (!text) return
      report.totalTexts++

      // 1. Tags scan
      const tagRegex = /<([^>]+)>/g
      let tagMatch: RegExpExecArray | null
      while ((tagMatch = tagRegex.exec(text)) !== null) {
        const fullTag = tagMatch[1]
        if (!fullTag || fullTag === '/') continue
        if (fullTag.startsWith('@')) {
          report.tagFrequency[fullTag] = (report.tagFrequency[fullTag] ?? 0) + 1
        } else if (fullTag.startsWith('$')) {
          report.termFrequency[fullTag] = (report.termFrequency[fullTag] ?? 0) + 1
        } else {
          report.plainAngleBrackets[fullTag] = (report.plainAngleBrackets[fullTag] ?? 0) + 1
        }
      }

      // 2. Placeholders scan
      const phRegex = /\{([^}]+)\}/g
      let phMatch: RegExpExecArray | null
      while ((phMatch = phRegex.exec(text)) !== null) {
        report.totalPlaceholders++
        const content = phMatch[1]
        if (!content) continue
        const [keyWithMod, fmt] = content.split(':')
        const formatKey = fmt ?? '(no format)'
        report.formatFrequency[formatKey] = (report.formatFrequency[formatKey] ?? 0) + 1

        if (!keyWithMod) continue
        const isNeg = keyWithMod.startsWith('-')
        const rawKey = isNeg ? keyWithMod.slice(1) : keyWithMod
        const keyVariants = [rawKey, rawKey.toLowerCase()]
        if (rawKey.includes('@')) {
          const afterAt = rawKey.split('@')[1]
          if (afterAt) {
            keyVariants.push(afterAt, afterAt.toLowerCase())
          }
        }

        let foundVal: number | undefined
        if (blackboard) {
          for (const k of keyVariants) {
            if (blackboard[k] !== undefined) {
              foundVal = blackboard[k]
              break
            }
            const foundKey = Object.keys(blackboard).find(
              (bk) => bk.toLowerCase() === k.toLowerCase(),
            )
            if (foundKey && blackboard[foundKey] !== undefined) {
              foundVal = blackboard[foundKey]
              break
            }
          }
        }

        if (foundVal !== undefined) {
          report.resolvedPlaceholders++
        } else {
          report.unresolvedPlaceholders.push({
            operatorId: op.id,
            context,
            key: content,
            availableBlackboard: blackboard ? Object.keys(blackboard) : [],
          })
        }
      }
    }

    for (const skill of op.skills ?? []) {
      for (const lvl of skill.levels ?? []) {
        inspect(lvl.description?.en, lvl.blackboard, `skill en ${skill.skillId}`)
        inspect(lvl.description?.zh, lvl.blackboard, `skill zh ${skill.skillId}`)
      }
    }

    for (const talent of op.talents ?? []) {
      for (const cand of talent.candidates ?? []) {
        inspect(cand.description?.en, cand.blackboard, 'talent cand en')
        inspect(cand.description?.zh, cand.blackboard, 'talent cand zh')
      }
    }

    for (const mod of op.modules ?? []) {
      for (const st of mod.stages ?? []) {
        for (const p of st.parts ?? []) {
          for (const c of p.candidates ?? []) {
            inspect(c.additionalDescription?.en, c.blackboard, `mod ${mod.id} add en`)
            inspect(c.additionalDescription?.zh, c.blackboard, `mod ${mod.id} add zh`)
            inspect(c.upgradeDescription?.en, c.blackboard, `mod ${mod.id} up en`)
            inspect(c.upgradeDescription?.zh, c.blackboard, `mod ${mod.id} up zh`)
            inspect(c.overrideDescription?.en, c.blackboard, `mod ${mod.id} over en`)
            inspect(c.overrideDescription?.zh, c.blackboard, `mod ${mod.id} over zh`)
          }
        }
      }
    }
  }

  return report
}

async function main(): Promise<void> {
  const report = await scanRichTextData()
  console.log('=== Rich Text Scanner Report ===')
  console.log(`Total text descriptions:     ${report.totalTexts}`)
  console.log(`Total placeholders found:    ${report.totalPlaceholders}`)
  console.log(`Resolved from blackboard:    ${report.resolvedPlaceholders}`)
  console.log(`Unresolved placeholders:     ${report.unresolvedPlaceholders.length}`)
  console.log('\n--- Highlight Tags (@) ---')
  console.table(report.tagFrequency)
  console.log('\n--- Terms ($) ---')
  console.log(`Unique terms count: ${Object.keys(report.termFrequency).length}`)
  console.log('\n--- Formats ---')
  console.table(report.formatFrequency)
  console.log('\n--- Plain Angle Brackets ---')
  console.table(report.plainAngleBrackets)
}

if (process.argv[1]?.includes('scan-rich-text')) {
  main().catch((err: unknown) => {
    console.error('Fatal scan error:', err)
    process.exit(1)
  })
}
