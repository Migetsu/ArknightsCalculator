import { describe, it, expect } from 'vitest'
import { hasCjkIdeograph } from '../../../scripts/data/translate-missing'

describe('hasCjkIdeograph', () => {
  it('accepts real Chinese text', () => {
    expect(hasCjkIdeograph('新月的苏醒')).toBe(true)
    expect(hasCjkIdeograph('ATK 提高')).toBe(true)
  })

  it('rejects operator codenames and module codes that need no translation', () => {
    expect(hasCjkIdeograph('12F')).toBe(false)
    expect(hasCjkIdeograph('Mon3tr')).toBe(false)
    expect(hasCjkIdeograph('DWDB-221E')).toBe(false)
    expect(hasCjkIdeograph('W')).toBe(false)
  })

  it('rejects masked values made of fullwidth punctuation only', () => {
    expect(hasCjkIdeograph('？？？')).toBe(false)
  })

  it('rejects empty input', () => {
    expect(hasCjkIdeograph('')).toBe(false)
  })
})
