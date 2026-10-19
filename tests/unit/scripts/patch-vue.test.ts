import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  hasGuard,
  hasJobIndicator,
  hasUnpatched,
  patchContent,
  PATTERNS,
  runPatch,
} from '../../../scripts/patch-vue.mjs'

describe('patch-vue patterns (isolated unit regex check)', () => {
  const p1 = PATTERNS[0]!.unpatched
  const p2 = PATTERNS[1]!.unpatched
  const p3 = PATTERNS[2]!.unpatched

  it('correctly matches and patches unpatched instance.job.flags', () => {
    const raw = 'if (!(instance.job.flags & 8)) { instance.update(); }'
    p1.lastIndex = 0
    expect(p1.test(raw)).toBe(true)

    p1.lastIndex = 0
    const patched = raw.replaceAll(p1, '(instance.job && !(instance.job.flags & 8))')
    expect(patched).toBe('if ((instance.job && !(instance.job.flags & 8))) { instance.update(); }')

    p1.lastIndex = 0
    expect(p1.test(patched)).toBe(false)
  })

  it('correctly matches and patches unpatched n.job.flags', () => {
    const raw = 'if (!(n.job.flags & 8)) { n.update(); }'
    p2.lastIndex = 0
    expect(p2.test(raw)).toBe(true)

    p2.lastIndex = 0
    const patched = raw.replaceAll(p2, '(n.job && !(n.job.flags & 8))')
    expect(patched).toBe('if ((n.job && !(n.job.flags & 8))) { n.update(); }')

    p2.lastIndex = 0
    expect(p2.test(patched)).toBe(false)
  })

  it('correctly matches and patches minified 8&n.job.flags||n.update()', () => {
    const raw = 'r.isLeaving=!1,8&n.job.flags||n.update(),delete hooks'
    p3.lastIndex = 0
    expect(p3.test(raw)).toBe(true)

    p3.lastIndex = 0
    const patched = raw.replaceAll(p3, 'n.job&&8&n.job.flags||n.update()')
    expect(patched).toBe('r.isLeaving=!1,n.job&&8&n.job.flags||n.update(),delete hooks')

    p3.lastIndex = 0
    expect(p3.test(patched)).toBe(false)
  })
})

describe('self-checking patchContent outcomes', () => {
  it('returns "skipped" when content does not touch instance.job or n.job', () => {
    const plain = 'export function add(a, b) { return a + b; } // no scheduler logic'
    const result = patchContent(plain, 'math.js')
    expect(result.status).toBe('skipped')
    expect(result.content).toBe(plain)
  })

  it('returns "patched" when unpatched pattern is encountered and replaced with null-guard', () => {
    const unpatched =
      'function tick(instance) { if (!(instance.job.flags & 8)) instance.update(); }'
    const result = patchContent(unpatched, 'scheduler.js')
    expect(result.status).toBe('patched')
    expect(result.content).toContain('if ((instance.job && !(instance.job.flags & 8)))')
    expect(hasGuard(result.content)).toBe(true)
    expect(hasUnpatched(result.content)).toBe(false)
  })

  it('returns "already_patched" when null-guard is already present', () => {
    const alreadyGuarded =
      'function tick(instance) { if ((instance.job && !(instance.job.flags & 8))) instance.update(); }'
    const result = patchContent(alreadyGuarded, 'scheduler.js')
    expect(result.status).toBe('already_patched')
    expect(result.content).toBe(alreadyGuarded)
  })

  it('returns "error" when instance.job is present but neither unpatched pattern nor guard matches', () => {
    // Simulates an upstream Vue rewrite where instance.job is used but the flags check syntax changed
    const mutated =
      'function tick(instance) { const job = instance.job; if (instance.job.flags === 8) instance.update(); }'
    const result = patchContent(mutated, 'mutated-vue.js')
    expect(result.status).toBe('error')
    expect(result.error).toContain('contains job indicator (instance.job)')
    expect(result.error).toContain('neither an unpatched pattern nor the null guard')
  })
})

describe('real Vue installation verification (node_modules/@vue/runtime-core/dist)', () => {
  /**
   * Note on node_modules dependency:
   * This test inspects the physical installed Vue 3.5 distribution files on disk
   * (runtime-core.esm-bundler.js, runtime-core.cjs.js, runtime-core.cjs.prod.js).
   * Unlike string literal tests, this directly validates that postinstall patch application
   * was successful and guards against regressions when Vue or dependencies are upgraded.
   */
  const distDir = path.resolve(process.cwd(), 'node_modules/@vue/runtime-core/dist')
  const targetFiles = [
    'runtime-core.esm-bundler.js',
    'runtime-core.cjs.js',
    'runtime-core.cjs.prod.js',
  ]

  it.each(targetFiles)(
    'ensures %s has null-guard present and no unpatched patterns',
    (fileName) => {
      const filePath = path.join(distDir, fileName)
      expect(fs.existsSync(filePath), `Expected ${filePath} to exist`).toBe(true)

      const content = fs.readFileSync(filePath, 'utf8')

      // 1. Must contain job handling indicator
      expect(hasJobIndicator(content)).toBe(true)

      // 2. Must have the null guard applied
      expect(hasGuard(content), `Expected ${fileName} to contain instance.job null guard`).toBe(
        true,
      )

      // 3. Must NOT contain any unpatched instances of !(instance.job.flags & 8)
      expect(hasUnpatched(content), `Expected ${fileName} to have zero unpatched occurrences`).toBe(
        false,
      )

      // 4. Running patchContent must confirm status is already_patched
      const patchResult = patchContent(content, filePath)
      expect(patchResult.status).toBe('already_patched')
    },
  )

  it('verifies that full runPatch across node_modules/@vue and node_modules/vue has zero errors', () => {
    const results = runPatch(['node_modules/@vue', 'node_modules/vue'], {
      checkOnly: true,
    })
    expect(results.errors).toHaveLength(0)
    expect(results.alreadyPatched.length).toBeGreaterThanOrEqual(3)
  })
})
