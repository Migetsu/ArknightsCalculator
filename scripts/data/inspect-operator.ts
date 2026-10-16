import { promises as fs } from 'node:fs'
import path from 'node:path'
import type { OperatorDetail, OperatorIndexItem } from '../../shared/schemas/operator'

interface TableRow {
  category: string
  keyId: string
  index: string
  enText: string
  source: string
}

async function inspectOperator(query: string): Promise<void> {
  const dataDir = path.resolve(process.cwd(), 'data')
  const indexRaw = await fs.readFile(path.join(dataDir, 'operators-index.json'), 'utf-8')
  const index: OperatorIndexItem[] = JSON.parse(indexRaw)

  // Find operator by exact ID or name (case-insensitive)
  const normalizedQuery = query.trim().toLowerCase()
  let target = index.find((op) => op.id.toLowerCase() === normalizedQuery)
  if (!target) {
    target = index.find(
      (op) =>
        op.name.en.toLowerCase() === normalizedQuery ||
        op.name.zh.toLowerCase() === normalizedQuery
    )
  }

  if (!target) {
    console.error(`Operator not found for query: "${query}"`)
    process.exit(1)
  }

  const opFilePath = path.join(dataDir, 'operators', `${target.id}.json`)
  const opRaw = await fs.readFile(opFilePath, 'utf-8')
  const operator: OperatorDetail = JSON.parse(opRaw)

  const rows: TableRow[] = []

  // Operator Name
  rows.push({
    category: 'Name',
    keyId: operator.id,
    index: '-',
    enText: operator.name.en,
    source: operator.name.source,
  })

  // Skills
  operator.skills.forEach((skill, idx) => {
    const level0Name = skill.levels[0]?.name
    rows.push({
      category: 'Skill',
      keyId: skill.skillId,
      index: String(idx + 1),
      enText: level0Name?.en ?? '—',
      source: level0Name?.source ?? 'unknown',
    })
  })

  // Talents
  operator.talents.forEach((talent, idx) => {
    const candidateName = talent.candidates[0]?.name
    rows.push({
      category: 'Talent',
      keyId: `talent_${idx + 1}`,
      index: String(idx + 1),
      enText: candidateName?.en ?? '—',
      source: candidateName?.source ?? 'unknown',
    })
  })

  // Modules
  operator.modules.forEach((mod, idx) => {
    const costSummary = mod.stages
      ? mod.stages
          .map(
            (s) =>
              `Stage ${s.stage}: ` +
              (s.cost && s.cost.length > 0
                ? s.cost.map((c) => `${c.count}× ${c.id}`).join(', ')
                : 'Free'),
          )
          .join(' | ')
      : 'No stages'
    const typeLabel = mod.typeName2 ? `${mod.type} (${mod.typeName2})` : mod.type
    rows.push({
      category: `Module [${typeLabel}]`,
      keyId: mod.id,
      index: String(idx + 1),
      enText: `${mod.name.en} — ${costSummary}`,
      source: mod.name.source,
    })
  })

  // Render markdown table
  console.log(`\n### Operator Data Inspection: ${operator.name.en} (${operator.id})\n`)
  console.log('| Category | Key / ID | Index | EN Text | Source |')
  console.log('| :--- | :--- | :---: | :--- | :--- |')
  for (const r of rows) {
    console.log(`| ${r.category} | \`${r.keyId}\` | ${r.index} | ${r.enText} | \`${r.source}\` |`)
  }
  console.log('')
}

const arg = process.argv[2]
if (!arg) {
  console.error('Usage: npm run data:inspect -- <operatorId | operatorName>')
  process.exit(1)
}

inspectOperator(arg).catch((err) => {
  console.error('Error inspecting operator:', err)
  process.exit(1)
})
