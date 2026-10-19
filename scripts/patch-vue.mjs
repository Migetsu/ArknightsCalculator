import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

/**
 * Patch Vue 3.5 runtime to prevent:
 * TypeError: can't access property "flags", instance.job is null
 *
 * In Vue 3.5 scheduler / HMR / BaseTransition, checks like `!(instance.job.flags & 8)` were introduced
 * without null guards on `instance.job`. When a component is async (e.g. Nuxt Suspense pages), unmounted,
 * or leaving a transition, `instance.job` can be null, causing runtime crashes in Firefox and Chromium.
 *
 * Outcomes:
 * 1. 'skipped': File does not contain instance.job / n.job indicator (normal for files without scheduler).
 * 2. 'already_patched': File contains the null-guard and no unpatched pattern (normal, already up to date).
 * 3. 'patched': File contained unpatched pattern and was successfully updated with null-guard (normal).
 * 4. 'error': File contains instance.job / n.job indicator, but neither unpatched pattern nor guard was found.
 *    This signifies upstream Vue code structure has changed, and exits with non-zero exit code!
 */

export const PATTERNS = [
  {
    name: 'instance.job.flags (unminified/esm)',
    unpatched: /(?<!instance\.job\s*&&\s*)!\(instance\.job\.flags\s*&\s*8\)/g,
    replacement: '(instance.job && !(instance.job.flags & 8))',
    hasGuard: (content) =>
      /instance\.job\s*&&\s*!\(instance\.job\.flags\s*&\s*8\)/.test(content) ||
      (content.includes('instance.job &&') && content.includes('instance.job.flags')),
  },
  {
    name: 'n.job.flags (partially minified)',
    unpatched: /(?<!n\.job\s*&&\s*)!\(n\.job\.flags\s*&\s*8\)/g,
    replacement: '(n.job && !(n.job.flags & 8))',
    hasGuard: (content) =>
      /n\.job\s*&&\s*!\(n\.job\.flags\s*&\s*8\)/.test(content) ||
      (content.includes('n.job &&') && content.includes('n.job.flags')),
  },
  {
    name: '8&n.job.flags (minified prod)',
    unpatched: /(?<!n\.job\s*&&\s*)8\s*&\s*n\.job\.flags\s*\|\|\s*n\.update\(\)/g,
    replacement: 'n.job&&8&n.job.flags||n.update()',
    hasGuard: (content) =>
      /n\.job\s*&&\s*8\s*&\s*n\.job\.flags/.test(content) ||
      content.includes('n.job&&8&n.job.flags'),
  },
]

/**
 * Checks whether content contains indicators of component job handling.
 */
export function hasJobIndicator(content) {
  return content.includes('instance.job') || /\bn\.job\b/.test(content)
}

/**
 * Checks whether any known guard is already present.
 */
export function hasGuard(content) {
  return PATTERNS.some((p) => p.hasGuard(content))
}

/**
 * Checks whether any known unpatched pattern exists.
 */
export function hasUnpatched(content) {
  return PATTERNS.some((p) => {
    p.unpatched.lastIndex = 0
    return p.unpatched.test(content)
  })
}

/**
 * Transforms and validates content for a specific file.
 * Returns { status: 'skipped' | 'already_patched' | 'patched' | 'error', content, error? }
 */
export function patchContent(content, filePath = 'unknown') {
  const hasInstanceJob = content.includes('instance.job')
  const hasNJob = /\bn\.job\b/.test(content)

  if (!hasInstanceJob && !hasNJob) {
    return { status: 'skipped', content }
  }

  let patched = content
  let modified = false

  for (const p of PATTERNS) {
    p.unpatched.lastIndex = 0
    if (p.unpatched.test(patched)) {
      p.unpatched.lastIndex = 0
      patched = patched.replaceAll(p.unpatched, p.replacement)
      modified = true
    }
  }

  const guardPresent = hasGuard(patched)

  if (modified && guardPresent) {
    return { status: 'patched', content: patched }
  }

  if (!modified && guardPresent) {
    return { status: 'already_patched', content }
  }

  const missingWhat = hasInstanceJob
    ? "pattern '!(instance.job.flags & 8)' or guard '(instance.job && !(instance.job.flags & 8))'"
    : "pattern '8&n.job.flags||n.update()' or guard 'n.job&&8&n.job.flags'"

  return {
    status: 'error',
    content,
    error: `File ${filePath} contains job indicator (${hasInstanceJob ? 'instance.job' : 'n.job'}), but neither an unpatched pattern nor the null guard was found. Missing ${missingWhat}. Upstream Vue structure may have changed.`,
  }
}

/**
 * Patches a single file on disk.
 */
export function patchFile(filePath, options = {}) {
  try {
    const rawContent = fs.readFileSync(filePath, 'utf8')
    const result = patchContent(rawContent, filePath)

    if (result.status === 'patched' && !options.checkOnly) {
      fs.writeFileSync(filePath, result.content, 'utf8')
    }

    if (options.checkOnly && result.status === 'patched') {
      return {
        filePath,
        status: 'error',
        error: `File ${filePath} is unpatched and requires null-guard.`,
        content: result.content,
      }
    }

    return { filePath, ...result }
  } catch (err) {
    return {
      filePath,
      status: 'error',
      error: `Could not read/write ${filePath}: ${err.message}`,
    }
  }
}

/**
 * Traverses targets (files or directories) and processes files.
 */
export function runPatch(targets = ['node_modules/@vue', 'node_modules/vue'], options = {}) {
  const results = {
    patched: [],
    alreadyPatched: [],
    skipped: [],
    errors: [],
  }

  function processPath(targetPath) {
    if (!fs.existsSync(targetPath)) return
    const stat = fs.statSync(targetPath)
    if (stat.isDirectory()) {
      for (const entry of fs.readdirSync(targetPath, { withFileTypes: true })) {
        const full = path.join(targetPath, entry.name)
        if (entry.isDirectory()) {
          if (entry.name !== '.cache' && entry.name !== '.git') {
            processPath(full)
          }
        } else if (entry.name.endsWith('.js') || entry.name.endsWith('.mjs')) {
          const res = patchFile(full, options)
          if (res.status === 'patched') results.patched.push(full)
          else if (res.status === 'already_patched') results.alreadyPatched.push(full)
          else if (res.status === 'skipped') results.skipped.push(full)
          else if (res.status === 'error') results.errors.push(res)
        }
      }
    } else if (targetPath.endsWith('.js') || targetPath.endsWith('.mjs')) {
      const res = patchFile(targetPath, options)
      if (res.status === 'patched') results.patched.push(targetPath)
      else if (res.status === 'already_patched') results.alreadyPatched.push(targetPath)
      else if (res.status === 'skipped') results.skipped.push(targetPath)
      else if (res.status === 'error') results.errors.push(res)
    }
  }

  for (const t of targets) {
    processPath(t)
  }

  return results
}

// Execute when invoked directly from CLI
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])

if (isMain) {
  const checkOnly = process.argv.includes('--check')
  const customTargets = process.argv.slice(2).filter((arg) => !arg.startsWith('--'))
  const targets =
    customTargets.length > 0 ? customTargets : ['node_modules/@vue', 'node_modules/vue']

  const results = runPatch(targets, { checkOnly })

  if (results.patched.length > 0) {
    console.log(`[patch-vue] Complete. Patched ${results.patched.length} files:`)
    for (const f of results.patched) {
      console.log(`  - ${f}`)
    }
  }

  if (
    results.alreadyPatched.length > 0 &&
    results.patched.length === 0 &&
    results.errors.length === 0
  ) {
    console.log(
      `[patch-vue] Verified ${results.alreadyPatched.length} Vue runtime files: all files already have null-guard applied.`,
    )
  }

  if (results.errors.length > 0) {
    console.error(`[patch-vue] FAILED with ${results.errors.length} error(s):`)
    for (const err of results.errors) {
      console.error(`  - ${err.error}`)
    }
    process.exit(1)
  }
}
