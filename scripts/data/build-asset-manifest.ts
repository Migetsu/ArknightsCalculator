import { promises as fs } from 'node:fs'
import path from 'node:path'
import { ASSET_REPO_COMMIT, resolveAsset } from '../../shared/utils/resolveAsset'
import type { OperatorSummary } from '../../shared/schemas/operator'

export interface AssetCoverageSummary {
  total: number
  existingPrimary: number
  missingPrimary: number
  missingPrimaryRatio: number
  existingTotal: number
  missingTotal: number
  missingTotalRatio: number
  first30Missing: Array<{ id: string; name: string; extra?: string }>
}

export interface ModuleCoverageSummary extends AssetCoverageSummary {
  postAceshipCommitCount: number
  preAceshipMissingCount: number
}

export interface AssetAvailability {
  avatar: boolean
  portrait: boolean
}

export interface AssetManifest {
  version: string
  source: 'http' | 'tree'
  updatedAt: string
  totalOperators: number
  operatorsWithAvatar: number
  operatorsWithoutAvatar: number
  missingAvatarIds: string[]
  coverage: {
    items: AssetCoverageSummary
    skills: AssetCoverageSummary
    modules: ModuleCoverageSummary
  }
  assets: Record<string, AssetAvailability>
}

async function fetchGitTree(
  cacheName: string,
  repo: string,
  treeSha: string,
): Promise<Set<string>> {
  const cacheFile = path.resolve(process.cwd(), `.cache/trees/${cacheName}.json`)
  try {
    const raw = await fs.readFile(cacheFile, 'utf-8')
    const list = JSON.parse(raw) as Array<{ path: string }>
    return new Set(list.map((t) => t.path))
  } catch {
    // If cache not found, fetch from GitHub API and persist
    const url = `https://api.github.com/repos/${repo}/git/trees/${treeSha}?recursive=1`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'ArknightsCalculator-AssetManifest/1.0' },
    })
    if (!res.ok) {
      throw new Error(`Failed to fetch tree from ${repo}@${treeSha}: ${res.status}`)
    }
    const data = (await res.json()) as { tree: Array<{ path: string }> }
    await fs.mkdir(path.dirname(cacheFile), { recursive: true })
    await fs.writeFile(cacheFile, JSON.stringify(data.tree), 'utf-8')
    return new Set(data.tree.map((t) => t.path))
  }
}

async function main(): Promise<void> {
  console.log('=== Arknights Asset Tree & Coverage Manifest Builder ===\n')

  const indexPath = path.resolve(process.cwd(), 'data/operators-index.json')
  const itemsPath = path.resolve(process.cwd(), 'data/items.json')
  const operatorsDir = path.resolve(process.cwd(), 'data/operators')
  const manifestPath = path.resolve(process.cwd(), 'data/asset-manifest.json')

  const rawIndex = await fs.readFile(indexPath, 'utf-8')
  const operators = JSON.parse(rawIndex) as OperatorSummary[]

  const rawItems = await fs.readFile(itemsPath, 'utf-8')
  const items = JSON.parse(rawItems) as Array<{
    id: string
    name: { en?: string; zh?: string }
    iconId?: string
    servers?: string[]
  }>

  const opFiles = (await fs.readdir(operatorsDir)).filter((f) => f.endsWith('.json'))

  console.log(`Loaded ${operators.length} operators, ${items.length} items.`)
  console.log('Querying GitHub Git Trees for primary & fallback repositories...')

  // 1. Yuanyan3060 tree
  const yuanPaths = await fetchGitTree(
    'yuan_tree',
    'yuanyan3060/ArknightsGameResource',
    ASSET_REPO_COMMIT,
  )
  console.log(`- Yuanyan3060 tree: ${yuanPaths.size} paths`)

  // 2. Aceship tree (commit 0b28f9562fcadbd644c6225f8f8aefbb500b4d22 -> tree 2e8167a7085504a277d478af66430aa0ed98e65e)
  const acePaths = await fetchGitTree(
    'ace_tree',
    'Aceship/Arknight-Images',
    '2e8167a7085504a277d478af66430aa0ed98e65e',
  )
  console.log(`- Aceship tree: ${acePaths.size} paths`)

  // 3. Fexli tree (subfolder equip: tree 4c35d3792136d00fc1d0c0ac4b4e0c493a91de2a)
  const fexliEquipTree = await fetchGitTree(
    'fexli_equip_tree',
    'fexli/ArknightsResource',
    '4c35d3792136d00fc1d0c0ac4b4e0c493a91de2a',
  )
  const fexliPaths = new Set(Array.from(fexliEquipTree).map((p) => `equip/${p}`))
  console.log(`- Fexli equip tree: ${fexliPaths.size} paths`)

  // --- Audit Operators (Avatars & Portraits) ---
  const manifestAssets: Record<string, AssetAvailability> = {}
  const missingAvatarIds: string[] = []
  let withAvatarCount = 0

  for (const op of operators) {
    const avatarCandidates = resolveAsset('avatar', op.id)
    const portraitCandidates = resolveAsset('portrait', op.id)

    const avatarRelPath = avatarCandidates[0]?.split(ASSET_REPO_COMMIT + '/')[1] ?? ''
    const portraitRelPath = portraitCandidates[0]?.split(ASSET_REPO_COMMIT + '/')[1] ?? ''

    const hasAvatar = yuanPaths.has(avatarRelPath)
    const hasPortrait = yuanPaths.has(portraitRelPath)

    manifestAssets[op.id] = { avatar: hasAvatar, portrait: hasPortrait }
    if (hasAvatar) {
      withAvatarCount++
    } else {
      missingAvatarIds.push(op.id)
    }
  }

  // --- Audit Items ---
  const missingItemsPrimary: Array<{ id: string; name: string; extra?: string }> = []
  let existingItemsPrimary = 0

  for (const it of items) {
    const iconId = it.iconId || it.id
    const hasItem = yuanPaths.has(`item/${iconId}.png`) || yuanPaths.has(`item/${it.id}.png`)
    if (hasItem) {
      existingItemsPrimary++
    } else {
      missingItemsPrimary.push({
        id: it.id,
        name: it.name?.en || it.name?.zh || it.id,
        extra: `iconId: ${it.iconId}`,
      })
    }
  }

  const itemsSummary: AssetCoverageSummary = {
    total: items.length,
    existingPrimary: existingItemsPrimary,
    missingPrimary: missingItemsPrimary.length,
    missingPrimaryRatio: missingItemsPrimary.length / items.length,
    existingTotal: existingItemsPrimary,
    missingTotal: missingItemsPrimary.length,
    missingTotalRatio: missingItemsPrimary.length / items.length,
    first30Missing: missingItemsPrimary.slice(0, 30),
  }

  // --- Collect & Audit Skills ---
  interface SkillData {
    skillId: string
    name: string
    iconId: string | null
    operatorId: string
  }
  const skillsMap = new Map<string, SkillData>()

  interface ModuleData {
    id: string
    name: string
    type: string
    icon: string | null
    servers?: string[]
    operatorId: string
  }
  const modulesMap = new Map<string, ModuleData>()

  for (const f of opFiles) {
    const op = JSON.parse(await fs.readFile(path.join(operatorsDir, f), 'utf-8'))
    if (op.skills && Array.isArray(op.skills)) {
      for (const sk of op.skills) {
        if (sk.skillId && !skillsMap.has(sk.skillId)) {
          skillsMap.set(sk.skillId, {
            skillId: sk.skillId,
            name: sk.levels?.[0]?.name?.en || sk.levels?.[0]?.name?.zh || sk.skillId,
            iconId: sk.iconId ?? null,
            operatorId: op.id,
          })
        }
      }
    }

    if (op.modules && Array.isArray(op.modules)) {
      for (const mod of op.modules) {
        if (mod.id && !modulesMap.has(mod.id)) {
          modulesMap.set(mod.id, {
            id: mod.id,
            name: mod.name?.en || mod.name?.zh || mod.id,
            type: mod.type,
            icon: mod.icon ?? null,
            servers: mod.servers,
            operatorId: op.id,
          })
        }
      }
    }
  }

  const missingSkillsPrimary: Array<{ id: string; name: string; extra?: string }> = []
  let existingSkillsPrimary = 0

  for (const sk of skillsMap.values()) {
    const target = sk.iconId || sk.skillId
    const hasSkill =
      yuanPaths.has(`skill/skill_icon_${target}.png`) ||
      yuanPaths.has(`skill/${target}.png`) ||
      yuanPaths.has(`skill/skill_icon_${sk.skillId}.png`)

    if (hasSkill) {
      existingSkillsPrimary++
    } else {
      missingSkillsPrimary.push({
        id: sk.skillId,
        name: sk.name,
        extra: `operator: ${sk.operatorId}`,
      })
    }
  }

  const skillsSummary: AssetCoverageSummary = {
    total: skillsMap.size,
    existingPrimary: existingSkillsPrimary,
    missingPrimary: missingSkillsPrimary.length,
    missingPrimaryRatio: missingSkillsPrimary.length / skillsMap.size,
    existingTotal: existingSkillsPrimary,
    missingTotal: missingSkillsPrimary.length,
    missingTotalRatio: missingSkillsPrimary.length / skillsMap.size,
    first30Missing: missingSkillsPrimary.slice(0, 30),
  }

  // --- Audit Modules ---
  const missingModulesAceship: Array<{ id: string; name: string; extra?: string }> = []
  let existingModulesAceship = 0
  let existingModulesCombined = 0
  const missingModulesCombined: Array<{ id: string; name: string; extra?: string }> = []
  let postAceshipCommitCount = 0

  for (const mod of modulesMap.values()) {
    const isInitial = mod.id.includes('_001_') || mod.type === 'INITIAL'
    const filename = `${mod.icon || mod.id}.png`

    const hasAce = isInitial
      ? acePaths.has('equip/icon/original.png') || acePaths.has('equip/icon/default.png')
      : acePaths.has(`equip/icon/${filename}`) || acePaths.has(`equip/${filename}`)

    const hasFexli = isInitial
      ? fexliPaths.has('equip/default.png')
      : fexliPaths.has(`equip/${filename}`)

    if (hasAce) {
      existingModulesAceship++
    } else {
      missingModulesAceship.push({
        id: mod.id,
        name: mod.name,
        extra: `operator: ${mod.operatorId}, servers: ${mod.servers?.join('/')}`,
      })
      postAceshipCommitCount++
    }

    if (hasAce || hasFexli) {
      existingModulesCombined++
    } else {
      missingModulesCombined.push({
        id: mod.id,
        name: mod.name,
        extra: `operator: ${mod.operatorId}`,
      })
    }
  }

  const modulesSummary: ModuleCoverageSummary = {
    total: modulesMap.size,
    existingPrimary: existingModulesAceship,
    missingPrimary: missingModulesAceship.length,
    missingPrimaryRatio: missingModulesAceship.length / modulesMap.size,
    existingTotal: existingModulesCombined,
    missingTotal: missingModulesCombined.length,
    missingTotalRatio: missingModulesCombined.length / modulesMap.size,
    postAceshipCommitCount,
    preAceshipMissingCount: 0,
    first30Missing: missingModulesAceship.slice(0, 30),
  }

  console.log('\n--- COVERAGE AUDIT RESULTS ---')
  console.log(
    `Items:   ${existingItemsPrimary}/${items.length} (missing: ${missingItemsPrimary.length}, ${(itemsSummary.missingPrimaryRatio * 100).toFixed(2)}%)`,
  )
  console.log(
    `Skills:  ${existingSkillsPrimary}/${skillsMap.size} (missing: ${missingSkillsPrimary.length}, ${(skillsSummary.missingPrimaryRatio * 100).toFixed(2)}%)`,
  )
  console.log(
    `Modules (Aceship primary): ${existingModulesAceship}/${modulesMap.size} (missing: ${missingModulesAceship.length}, ${(modulesSummary.missingPrimaryRatio * 100).toFixed(2)}%)`,
  )
  console.log(`Modules post-Aceship commit (May 2024): ${postAceshipCommitCount}`)
  console.log(
    `Modules (Aceship + Fexli combined): ${existingModulesCombined}/${modulesMap.size} (missing: ${missingModulesCombined.length}, ${(modulesSummary.missingTotalRatio * 100).toFixed(2)}%)`,
  )

  const manifest: AssetManifest = {
    version: ASSET_REPO_COMMIT,
    source: 'tree',
    updatedAt: new Date().toISOString(),
    totalOperators: operators.length,
    operatorsWithAvatar: withAvatarCount,
    operatorsWithoutAvatar: missingAvatarIds.length,
    missingAvatarIds,
    coverage: {
      items: itemsSummary,
      skills: skillsSummary,
      modules: modulesSummary,
    },
    assets: manifestAssets,
  }

  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8')
  console.log(`\nManifest saved to ${manifestPath}.`)
}

main().catch((err) => {
  console.error('Fatal error building asset manifest:', err)
  process.exit(1)
})
