import { promises as fs } from 'node:fs'
import path from 'node:path'
import { DATA_SOURCES_CONFIG } from './sources.config'

interface WikiTranslationEntry {
  name?: string
  skills?: Record<string, string> // skillId -> English name
  talents?: string[] // index -> English name
  modules?: Record<string, string> // equipId -> English name
}

export type WikiTranslationsMap = Record<string, WikiTranslationEntry>

const DATA_I18N_DIR = path.resolve(process.cwd(), 'data/i18n')

export async function fetchOperatorWikiData(pageTitle: string): Promise<{
  name: string
  skills: string[]
  talents: string[]
  modules: string[]
} | null> {
  const encoded = encodeURIComponent(pageTitle.replace(/ /g, '_'))
  const url = `https://arknights.wiki.gg/api.php?action=parse&page=${encoded}&prop=wikitext&format=json`

  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'ArknightsCalculator-Build/1.0' } })
    const json = (await res.json()) as { parse?: { wikitext?: { '*'?: string } } }
    const wt: string | undefined = json?.parse?.wikitext?.['*']
    if (!wt) return null

    const skills = [...wt.matchAll(/\{\{Skill head\s*\|\s*name\s*=\s*([^|\n}]+)/gi)].map((m) => m[1]!.trim())
    const talents = [...wt.matchAll(/\{\{Talent\s*\|\s*name\s*=\s*([^|\n}]+)/gi)].map((m) => m[1]!.trim())
    const modules = [...wt.matchAll(/\|module\s*=\s*([^|\n}]+)/gi)].map((m) => m[1]!.trim())

    return {
      name: pageTitle,
      skills,
      talents,
      modules,
    }
  } catch (err) {
    console.warn(`Failed to fetch wiki for ${pageTitle}:`, err)
    return null
  }
}

async function main() {
  console.log('Fetching wiki translations from arknights.wiki.gg...')
  const indexRaw = await fs.readFile(path.resolve(process.cwd(), 'data/operators-index.json'), 'utf-8')
  const index = JSON.parse(indexRaw) as { id: string; name: { en: string; zh: string } }[]

  const rawEnChars = JSON.parse(
    await fs.readFile(
      path.resolve(
        process.cwd(),
        DATA_SOURCES_CONFIG.cacheDir,
        DATA_SOURCES_CONFIG.sources.en.locale,
        'character_table.json',
      ),
      'utf-8',
    ),
  )

  const rawCnChars = JSON.parse(
    await fs.readFile(
      path.resolve(
        process.cwd(),
        DATA_SOURCES_CONFIG.cacheDir,
        DATA_SOURCES_CONFIG.sources.cn.locale,
        'character_table.json',
      ),
      'utf-8',
    ),
  )

  const rawCnEquips = JSON.parse(
    await fs.readFile(
      path.resolve(
        process.cwd(),
        DATA_SOURCES_CONFIG.cacheDir,
        DATA_SOURCES_CONFIG.sources.cn.locale,
        'uniequip_table.json',
      ),
      'utf-8',
    ),
  )

  // Find operators not in EN raw table
  const missingOps = index.filter((o) => !rawEnChars[o.id])
  console.log(`Found ${missingOps.length} operators missing from EN repository.`)

  const translations: WikiTranslationsMap = {}

  // Existing file if present to preserve or avoid unnecessary requests
  const wikiDir = path.join(DATA_I18N_DIR, 'wiki')
  const outPath = path.join(wikiDir, 'operators.json')
  let existing: WikiTranslationsMap = {}
  try {
    const raw = JSON.parse(await fs.readFile(outPath, 'utf-8'))
    existing = (raw.operators || raw) as WikiTranslationsMap
  } catch (_e) {
    // Ignore
  }

  const WIKI_PAGE_ALIASES: Record<string, string> = {
    char_1052_kalts2: "Kal'tsit Esperanta",
    char_4226_veen: 'Viy',
  }

  for (const op of missingOps) {
    const charId = op.id
    const cnChar = rawCnChars[charId]
    const enName = op.name.en
    const wikiPageTitle = WIKI_PAGE_ALIASES[charId] || enName

    if (existing[charId]?.name && existing[charId]?.skills) {
      translations[charId] = existing[charId]!
      continue
    }

    console.log(`Querying wiki.gg for ${wikiPageTitle} (${charId})...`)
    const wikiData = await fetchOperatorWikiData(wikiPageTitle)
    if (!wikiData) {
      console.log(` -> Not found on wiki.gg, skipping.`)
      continue
    }

    const opSkills: Record<string, string> = {}
    const cnSkills = cnChar?.skills ?? []
    for (let i = 0; i < cnSkills.length; i++) {
      const sId = cnSkills[i]?.skillId
      if (sId && wikiData.skills[i]) {
        opSkills[sId] = wikiData.skills[i]!
      }
    }

    const opModules: Record<string, string> = {}
    const equipIds: string[] = rawCnEquips?.charEquip?.[charId] ?? []
    // First equip is usually the badge
    if (equipIds[0]) {
      opModules[equipIds[0]] = `${enName}'s Badge`
    }
    // Subsequent equips are X, Y, Delta, Alpha
    for (let i = 1; i < equipIds.length; i++) {
      const eqId = equipIds[i]
      if (eqId && wikiData.modules[i - 1]) {
        opModules[eqId] = wikiData.modules[i - 1]!
      }
    }

    translations[charId] = {
      name: enName,
      skills: opSkills,
      talents: wikiData.talents,
      modules: opModules,
    }

    // Polite delay
    await new Promise((r) => setTimeout(r, 200))
  }

  await fs.mkdir(wikiDir, { recursive: true })
  const payload = {
    _attribution: {
      source: 'arknights.wiki.gg',
      url: 'https://arknights.wiki.gg/',
      license: 'Creative Commons Attribution-ShareAlike 4.0 International (CC-BY-SA 4.0)',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
      retrievedAt: new Date().toISOString(),
      notice:
        'Data contains translations derived from arknights.wiki.gg and is licensed under CC-BY-SA 4.0. Reuse must provide appropriate attribution and maintain the CC-BY-SA license.',
    },
    operators: translations,
  }
  await fs.writeFile(outPath, JSON.stringify(payload, null, 2), 'utf-8')
  console.log(`[PASS] Wiki translations written to ${outPath} (${Object.keys(translations).length} operators)`)
}

if (process.argv[1] && path.resolve(process.argv[1]).includes('fetch-wiki-translations')) {
  main().catch((err) => {
    console.error('Fetch wiki error:', err)
    process.exit(1)
  })
}
