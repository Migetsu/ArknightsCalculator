import { describe, it, expect } from 'vitest'
import {
  validateTranslation,
  extractOpenTags,
  extractPlaceholders,
} from '../../../scripts/data/validate-translation'

describe('validate-translation', () => {
  it('extracts open tags correctly', () => {
    const text = 'Deals <@ba.magic>magic damage</> to all enemies with <@ba.rem>Slow</>.'
    expect(extractOpenTags(text)).toEqual(['@ba.magic', '@ba.rem'])
  })

  it('extracts placeholders correctly', () => {
    const text = 'Increases ATK by {atk:0%} and DEF by {def}.'
    expect(extractPlaceholders(text)).toEqual(['atk', 'def'])
  })

  it('passes validation when tags and placeholders match', () => {
    const zh = '造成<@ba.magic>{damage:0%}</>点法术伤害'
    const en = 'Deals <@ba.magic>{damage:0%}</> Arts damage'
    const res = validateTranslation(zh, en)
    expect(res.valid).toBe(true)
    expect(res.issues).toHaveLength(0)
  })

  it('detects mismatched tags', () => {
    const zh = '造成<@ba.magic>法术</>伤害'
    const en = 'Deals magic damage'
    const res = validateTranslation(zh, en)
    expect(res.valid).toBe(false)
    expect(res.issues.some((i) => i.type === 'tag_mismatch')).toBe(true)
  })

  it('detects unclosed tags', () => {
    const zh = '造成<@ba.magic>法术</>伤害'
    const en = 'Deals <@ba.magic>Arts damage'
    const res = validateTranslation(zh, en)
    expect(res.valid).toBe(false)
    expect(res.issues.some((i) => i.type === 'tag_unclosed')).toBe(true)
  })

  it('detects missing placeholders', () => {
    const zh = '攻击力提高{atk:0%}'
    const en = 'ATK increased'
    const res = validateTranslation(zh, en)
    expect(res.valid).toBe(false)
    expect(res.issues.some((i) => i.type === 'placeholder_mismatch')).toBe(true)
  })

  it('handles empty or identical strings gracefully', () => {
    const res = validateTranslation('普通攻击', '普通攻击')
    expect(res.valid).toBe(true)
    expect(res.issues).toHaveLength(0)
  })
})
