import { promises as fs } from 'node:fs'
import path from 'node:path'

/**
 * Upstream game data repository whose `main` HEAD the raw table pin follows.
 * Both `sources.cn` and `sources.en` read from this repository.
 */
export const UPSTREAM_REPO = 'SanityGoneAK/arknights-gamedata'
export const UPSTREAM_BRANCH = 'main'

/** Repository-relative path of the config that stores the pinned commit. */
export const CONFIG_PATH = 'scripts/data/sources.config.ts'

export const COMMIT_SHA_PATTERN = /^[0-9a-f]{40}$/

/** Matches a `commit: '<40 hex chars>'` entry inside the sources block. */
const PINNED_COMMIT_PATTERN = /commit: '[0-9a-f]{40}'/g

const SOURCES_BLOCK_KEY = 'sources: {'

export interface PinUpdateResult {
  /** Config file contents with every source pin set to the new commit. */
  contents: string
  /** Commits that were pinned before the update, in file order (cn, en). */
  previousCommits: string[]
  /** False when the file already pinned the requested commit. */
  changed: boolean
}

export function isValidCommitSha(value: string): boolean {
  return COMMIT_SHA_PATTERN.test(value)
}

/**
 * Returns the `[start, end)` range of the object literal that opens at
 * `openBraceIndex`, skipping braces inside string literals.
 */
function findObjectBlock(contents: string, openBraceIndex: number): { start: number; end: number } {
  let depth = 0
  let quote: string | null = null

  for (let index = openBraceIndex; index < contents.length; index++) {
    const char = contents[index]

    if (quote !== null) {
      if (char === '\\') {
        index++
      } else if (char === quote) {
        quote = null
      }
      continue
    }

    if (char === "'" || char === '"' || char === '`') {
      quote = char
    } else if (char === '{') {
      depth++
    } else if (char === '}') {
      depth--
      if (depth === 0) {
        return { start: openBraceIndex, end: index + 1 }
      }
    }
  }

  throw new Error(`Unbalanced braces after index ${String(openBraceIndex)} in ${CONFIG_PATH}.`)
}

/**
 * Finds the object literal that both declares `sources` and pins exactly two
 * commits. The config file also declares `sources` inside its TypeScript
 * interface, so the first textual match is not necessarily the runtime object.
 */
function findPinnedSourcesBlock(contents: string): { start: number; end: number } {
  let searchIndex = 0

  while (searchIndex < contents.length) {
    const keyIndex = contents.indexOf(SOURCES_BLOCK_KEY, searchIndex)
    if (keyIndex === -1) {
      break
    }

    const block = findObjectBlock(contents, keyIndex + SOURCES_BLOCK_KEY.length - 1)
    const pinnedCommits = contents.slice(block.start, block.end).match(PINNED_COMMIT_PATTERN) ?? []

    if (pinnedCommits.length === 2) {
      return block
    }

    searchIndex = block.end
  }

  throw new Error(
    `Could not find a "${SOURCES_BLOCK_KEY}" block with exactly 2 pinned commits in ${CONFIG_PATH}.`,
  )
}

/**
 * Rewrites `sources.cn.commit` and `sources.en.commit` to `commit`.
 * Asset repositories are pinned independently and must keep their commits.
 */
export function updateSourcePins(contents: string, commit: string): PinUpdateResult {
  if (!isValidCommitSha(commit)) {
    throw new Error(`Invalid commit sha "${commit}": expected 40 lowercase hex characters.`)
  }

  const block = findPinnedSourcesBlock(contents)
  const blockContents = contents.slice(block.start, block.end)
  const matches = blockContents.match(PINNED_COMMIT_PATTERN) ?? []
  const previousCommits = matches.map((match) => match.slice("commit: '".length, -1))
  const changed = previousCommits.some((previous) => previous !== commit)

  if (!changed) {
    return { contents, previousCommits, changed: false }
  }

  const updatedBlock = blockContents.replace(PINNED_COMMIT_PATTERN, `commit: '${commit}'`)
  const updatedContents =
    contents.slice(0, block.start) + updatedBlock + contents.slice(block.end)

  return { contents: updatedContents, previousCommits, changed: true }
}

function readCommitSha(payload: unknown): string | null {
  if (typeof payload !== 'object' || payload === null) {
    return null
  }
  const sha = (payload as { sha?: unknown }).sha
  return typeof sha === 'string' ? sha : null
}

async function fetchLatestCommitSha(token: string | undefined): Promise<string> {
  const url = `https://api.github.com/repos/${UPSTREAM_REPO}/commits/${UPSTREAM_BRANCH}`
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'ArknightsCalculator-DataFetcher/1.0',
    'X-GitHub-Api-Version': '2022-11-28',
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(url, { headers, signal: AbortSignal.timeout(30_000) })

  if (!response.ok) {
    throw new Error(
      `GitHub API request failed with ${String(response.status)} ${response.statusText}: ${url}`,
    )
  }

  const payload: unknown = await response.json()
  const sha = readCommitSha(payload)

  if (sha === null) {
    throw new Error(`GitHub API response for ${url} does not contain a commit sha.`)
  }

  return sha
}

function parseCliArgs(): { dryRun: boolean } {
  const args = process.argv.slice(2)
  const unknownArgs = args.filter((arg) => arg !== '--dry-run')

  if (unknownArgs.length > 0) {
    throw new Error(`Unknown argument(s): ${unknownArgs.join(', ')}. Usage: data:pins [--dry-run]`)
  }

  return { dryRun: args.includes('--dry-run') }
}

async function main(): Promise<void> {
  const { dryRun } = parseCliArgs()
  const configPath = path.resolve(process.cwd(), CONFIG_PATH)
  const token = (process.env.GITHUB_TOKEN ?? '').trim()

  console.log('=== Upstream game data pin updater ===')
  console.log(`Upstream: ${UPSTREAM_REPO}@${UPSTREAM_BRANCH}`)

  if (!token) {
    console.warn(
      'GITHUB_TOKEN is not set; calling the public GitHub API unauthenticated (lower rate limit).',
    )
  }

  const contents = await fs.readFile(configPath, 'utf-8')
  const sha = await fetchLatestCommitSha(token || undefined)

  if (!isValidCommitSha(sha)) {
    throw new Error(`GitHub API returned an invalid commit sha "${sha}".`)
  }

  const result = updateSourcePins(contents, sha)

  console.log(`Old pin (cn): ${result.previousCommits[0] ?? 'unknown'}`)
  console.log(`Old pin (en): ${result.previousCommits[1] ?? 'unknown'}`)
  console.log(`New pin: ${sha}`)

  if (dryRun) {
    console.log(`Dry run: ${CONFIG_PATH} left unchanged.`)
    return
  }

  if (!result.changed) {
    console.log(`Already up to date: ${CONFIG_PATH} left unchanged.`)
    return
  }

  await fs.writeFile(configPath, result.contents, 'utf-8')
  console.log(`Updated ${CONFIG_PATH}.`)
}

// CLI runner
if (process.argv[1]?.includes('update-sources')) {
  main().catch((error: unknown) => {
    console.error('Fatal pin update error:', error)
    process.exit(1)
  })
}
