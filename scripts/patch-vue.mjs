import fs from 'node:fs'
import path from 'node:path'

/**
 * Patch Vue 3.5 runtime to prevent TypeError: can't access property "flags", instance.job is null
 * In Vue 3.5 scheduler / HMR / BaseTransition, checks like `!(instance.job.flags & 8)` were introduced
 * without null guards on `instance.job`. When a component is async (e.g. Nuxt Suspense pages), unmounted,
 * or leaving a transition, `instance.job` can be null, causing runtime crashes in Firefox and Chromium.
 */

const targetDirs = ['node_modules/@vue', 'node_modules/vue']

let patchedCount = 0

function patchFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8')
    let modified = false

    // Pattern 1: if (!(instance.job.flags & 8))
    const p1 = /(?<!instance\.job\s*&&\s*)!\(instance\.job\.flags\s*&\s*8\)/g
    if (p1.test(content)) {
      content = content.replaceAll(p1, '(instance.job && !(instance.job.flags & 8))')
      modified = true
    }

    // Pattern 2: if (!(n.job.flags & 8))
    const p2 = /(?<!n\.job\s*&&\s*)!\(n\.job\.flags\s*&\s*8\)/g
    if (p2.test(content)) {
      content = content.replaceAll(p2, '(n.job && !(n.job.flags & 8))')
      modified = true
    }

    // Pattern 3: minified 8&n.job.flags||n.update()
    const p3 = /(?<!n\.job\s*&&\s*)8&n\.job\.flags\|\|n\.update\(\)/g
    if (p3.test(content)) {
      content = content.replaceAll(p3, 'n.job&&8&n.job.flags||n.update()')
      modified = true
    }

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8')
      patchedCount++
      console.log(`[patch-vue] Patched: ${filePath}`)
    }
  } catch (err) {
    console.warn(`[patch-vue] Could not patch ${filePath}:`, err.message)
  }
}

function walkDir(dir) {
  if (!fs.existsSync(dir)) return
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name !== '.cache' && entry.name !== '.git') {
        walkDir(full)
      }
    } else if (entry.name.endsWith('.js') || entry.name.endsWith('.mjs')) {
      patchFile(full)
    }
  }
}

for (const dir of targetDirs) {
  walkDir(dir)
}

if (patchedCount > 0) {
  console.log(`[patch-vue] Complete. Patched ${patchedCount} files.`)
} else {
  console.log('[patch-vue] All files already up to date.')
}
