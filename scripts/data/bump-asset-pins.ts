import { promises as fs } from 'node:fs'
import path from 'node:path'

/** Rewrites a pinned upstream commit constant in `shared/utils/resolveAsset.ts`. */
export function rewriteCommitPin(source: string, constantName: string, sha: string): string {
  const pattern = new RegExp(`(export const ${constantName} = ')[0-9a-f]{7,40}(')`)
  if (!pattern.test(source)) {
    throw new Error(`Could not find the ${constantName} pin in resolveAsset.ts`)
  }
  return source.replace(pattern, `$1${sha}$2`)
}

async function latestCommit(repo: string, token?: string): Promise<string> {
  const headers: Record<string, string> = { accept: 'application/vnd.github+json' }
  if (token) headers.authorization = `Bearer ${token}`

  const res = await fetch(`https://api.github.com/repos/${repo}/commits?per_page=1`, { headers })
  if (!res.ok) throw new Error(`GitHub API ${res.status} while reading ${repo}`)

  const commits = (await res.json()) as Array<{ sha?: string }>
  const sha = commits[0]?.sha
  if (!sha) throw new Error(`No commits returned for ${repo}`)
  return sha
}

/**
 * Refreshes the pinned operator/item and banner mirrors before asset generation.
 * New operators appear in the upstream mirrors before our pinned snapshot, so
 * without this bump their avatars/art are always one release behind.
 */
async function main(): Promise<void> {
  const file = path.resolve(process.cwd(), 'shared/utils/resolveAsset.ts')
  let source = await fs.readFile(file, 'utf-8')
  const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN

  const gameCommit = await latestCommit('yuanyan3060/ArknightsGameResource', token)
  const fexliCommit = await latestCommit('fexli/ArknightsResource', token)

  const before = source
  source = rewriteCommitPin(source, 'ASSET_REPO_COMMIT', gameCommit)
  source = rewriteCommitPin(source, 'FEXLI_REPO_COMMIT', fexliCommit)

  if (source === before) {
    console.log('Pinned upstream commits are already current.')
    return
  }

  await fs.writeFile(file, source)
  console.log(`Pinned operator assets to ${gameCommit.slice(0, 7)}`)
  console.log(`Pinned banner assets to ${fexliCommit.slice(0, 7)}`)
}

if (process.argv[1]?.includes('bump-asset-pins')) {
  main().catch((err) => {
    console.error('Fatal error in bump-asset-pins:', err)
    process.exit(1)
  })
}
