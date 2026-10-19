import { describe, it, expect } from 'vitest'

describe('patch-vue patterns', () => {
  const p1 = /(?<!instance\.job\s*&&\s*)!\(instance\.job\.flags\s*&\s*8\)/g
  const p2 = /(?<!n\.job\s*&&\s*)!\(n\.job\.flags\s*&\s*8\)/g
  const p3 = /(?<!n\.job\s*&&\s*)8&n\.job\.flags\|\|n\.update\(\)/g

  it('correctly matches and patches unpatched instance.job.flags', () => {
    const raw = 'if (!(instance.job.flags & 8)) { instance.update(); }'
    expect(p1.test(raw)).toBe(true)

    p1.lastIndex = 0
    const patched = raw.replaceAll(p1, '(instance.job && !(instance.job.flags & 8))')
    expect(patched).toBe('if ((instance.job && !(instance.job.flags & 8))) { instance.update(); }')

    p1.lastIndex = 0
    expect(p1.test(patched)).toBe(false)
  })

  it('correctly matches and patches unpatched n.job.flags', () => {
    const raw = 'if (!(n.job.flags & 8)) { n.update(); }'
    expect(p2.test(raw)).toBe(true)

    p2.lastIndex = 0
    const patched = raw.replaceAll(p2, '(n.job && !(n.job.flags & 8))')
    expect(patched).toBe('if ((n.job && !(n.job.flags & 8))) { n.update(); }')

    p2.lastIndex = 0
    expect(p2.test(patched)).toBe(false)
  })

  it('correctly matches and patches minified 8&n.job.flags||n.update()', () => {
    const raw = 'r.isLeaving=!1,8&n.job.flags||n.update(),delete hooks'
    expect(p3.test(raw)).toBe(true)

    p3.lastIndex = 0
    const patched = raw.replaceAll(p3, 'n.job&&8&n.job.flags||n.update()')
    expect(patched).toBe('r.isLeaving=!1,n.job&&8&n.job.flags||n.update(),delete hooks')

    p3.lastIndex = 0
    expect(p3.test(patched)).toBe(false)
  })
})
