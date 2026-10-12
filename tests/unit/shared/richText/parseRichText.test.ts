import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import {
  parseRichText,
  formatPlaceholderValue,
  resolveBlackboardValue,
} from '../../../../shared/utils/richText'
import constantsData from '../../../../data/constants.json'

describe('Rich Text Parser & Formatter Core (shared/utils/richText)', () => {
  describe('formatPlaceholderValue', () => {
    it('formats values as percentage when :0% is specified', () => {
      expect(formatPlaceholderValue(0.8, '0%')).toBe('80%')
      expect(formatPlaceholderValue(1.25, '0%')).toBe('125%')
      expect(formatPlaceholderValue(-0.3, '0%')).toBe('-30%')
    })

    it('formats values with 1 decimal place when :0.0 is specified', () => {
      expect(formatPlaceholderValue(1.5, '0.0')).toBe('1.5')
      expect(formatPlaceholderValue(2, '0.0')).toBe('2.0')
    })

    it('formats values with 1 decimal percentage when :0.0% is specified', () => {
      expect(formatPlaceholderValue(0.125, '0.0%')).toBe('12.5%')
    })

    it('formats integer values when :0 is specified', () => {
      expect(formatPlaceholderValue(3.4, '0')).toBe('3')
      expect(formatPlaceholderValue(3.6, '0')).toBe('4')
    })

    it('formats default without specifier cleanly', () => {
      expect(formatPlaceholderValue(12)).toBe('12')
      expect(formatPlaceholderValue(1.25)).toBe('1.25')
      expect(formatPlaceholderValue(1.333333)).toBe('1.33')
    })
  })

  describe('resolveBlackboardValue', () => {
    const bb = {
      atk_scale: 1.5,
      max_hp: 500,
      prob: 0.25,
      attack_speed: 30,
    }

    it('resolves standard keys', () => {
      expect(resolveBlackboardValue('atk_scale:0%', bb)).toEqual({
        value: 1.5,
        formatted: '150%',
      })
      expect(resolveBlackboardValue('max_hp', bb)).toEqual({
        value: 500,
        formatted: '500',
      })
    })

    it('resolves namespaced keys with @ prefix', () => {
      expect(resolveBlackboardValue('attack@atk_scale:0%', bb)).toEqual({
        value: 1.5,
        formatted: '150%',
      })
    })

    it('handles negative prefix {-key}', () => {
      expect(resolveBlackboardValue('-max_hp', bb)).toEqual({
        value: -500,
        formatted: '-500',
      })
    })

    it('returns null when key does not exist', () => {
      expect(resolveBlackboardValue('unknown_key', bb)).toBeNull()
    })
  })

  describe('parseRichText AST Structure', () => {
    it('returns empty array on empty input', () => {
      expect(parseRichText('')).toEqual([])
      expect(parseRichText(null)).toEqual([])
      expect(parseRichText(undefined)).toEqual([])
    })

    it('parses plain text without tags into a single text node', () => {
      const nodes = parseRichText('Standard tactical attack')
      expect(nodes).toEqual([{ type: 'text', text: 'Standard tactical attack' }])
    })

    it('parses line breaks into break nodes', () => {
      const nodes = parseRichText('Line 1\nLine 2\nLine 3')
      expect(nodes).toEqual([
        { type: 'text', text: 'Line 1' },
        { type: 'break' },
        { type: 'text', text: 'Line 2' },
        { type: 'break' },
        { type: 'text', text: 'Line 3' },
      ])
    })

    it('parses highlight tags with children and interpolates blackboard', () => {
      const input = 'Deals <@ba.vup>{atk_scale:0%}</> physical damage'
      const nodes = parseRichText(input, { blackboard: { atk_scale: 2.2 } })

      expect(nodes).toEqual([
        { type: 'text', text: 'Deals ' },
        {
          type: 'highlight',
          tag: 'ba.vup',
          children: [{ type: 'text', text: '220%' }],
        },
        { type: 'text', text: ' physical damage' },
      ])
    })

    it('parses terminology tags and looks up official definitions from constants', () => {
      const input = 'Applies <$ba.stun>Stun</> to enemies'
      const nodes = parseRichText(input, { terms: constantsData.terms, locale: 'en' })

      expect(nodes).toEqual([
        { type: 'text', text: 'Applies ' },
        {
          type: 'term',
          termId: 'ba.stun',
          termName: 'Stun',
          description: 'Unable to move, block, attack, or use skills',
          children: [{ type: 'text', text: 'Stun' }],
        },
        { type: 'text', text: ' to enemies' },
      ])
    })

    it('correctly handles nested tags (highlight containing a term)', () => {
      const input = '<@ba.rem>Amiya is <$ba.stun>Stunned</> for {stun}s</>'
      const nodes = parseRichText(input, {
        blackboard: { stun: 5 },
        terms: constantsData.terms,
        locale: 'en',
      })

      expect(nodes).toEqual([
        {
          type: 'highlight',
          tag: 'ba.rem',
          children: [
            { type: 'text', text: 'Amiya is ' },
            {
              type: 'term',
              termId: 'ba.stun',
              termName: 'Stun',
              description: 'Unable to move, block, attack, or use skills',
              children: [{ type: 'text', text: 'Stunned' }],
            },
            { type: 'text', text: ' for 5s' },
          ],
        },
      ])
    })

    it('preserves plain literal brackets like <Substitute> or <替身>', () => {
      const input = 'Switches to <Substitute> mode'
      const nodes = parseRichText(input)

      expect(nodes).toEqual([{ type: 'text', text: 'Switches to <Substitute> mode' }])
    })

    it('guarantees ZERO raw HTML tags in generated AST nodes', () => {
      const realSamples = [
        'Attacks deal <@ba.vup>+{atk_scale:0%}</> Arts damage\nApplies <$ba.sleep>Sleep</>',
        '<@ba.kw>Overdrive</>: ATK increases to <@ba.vup>{atk:0%}</>',
        'Reduces enemies DEF by <@ba.vdown>-{def:0%}</>',
      ]

      for (const sample of realSamples) {
        const nodes = parseRichText(sample, {
          blackboard: { atk_scale: 1.5, atk: 2.0, def: 0.3 },
          terms: constantsData.terms,
        })

        // Recursively inspect all string fields to ensure no <tag> or </tag> remains unhandled
        const verifyNoHtml = (nodeList: typeof nodes) => {
          for (const n of nodeList) {
            if (n.type === 'text') {
              expect(n.text).not.toMatch(/<[a-z]+[^>]*>/i)
            } else if (n.type === 'highlight' || n.type === 'term') {
              verifyNoHtml(n.children)
            }
          }
        }

        verifyNoHtml(nodes)
      }
    })
  })

  describe('Full Operator Dataset Scanner Test', () => {
    it('parses all operator skill, talent, and module descriptions without unknown tags', () => {
      const dir = path.resolve(process.cwd(), 'data/operators')
      const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'))

      expect(files.length).toBeGreaterThanOrEqual(434)

      const unknownTags: string[] = []
      const warnings: string[] = []

      for (const f of files) {
        const raw = fs.readFileSync(path.join(dir, f), 'utf-8')
        const op = JSON.parse(raw) as {
          id: string
          skills?: Array<{
            levels?: Array<{
              description?: { en?: string; zh?: string }
              blackboard?: Record<string, number>
            }>
          }>
          talents?: Array<{
            candidates?: Array<{
              description?: { en?: string; zh?: string }
              blackboard?: Record<string, number>
            }>
          }>
          modules?: Array<{
            stages?: Array<{
              parts?: Array<{
                candidates?: Array<{
                  additionalDescription?: { en?: string; zh?: string }
                  upgradeDescription?: { en?: string; zh?: string }
                  overrideDescription?: { en?: string; zh?: string }
                  blackboard?: Record<string, number>
                }>
              }>
            }>
          }>
        }

        const parseDesc = (text?: string, bb?: Record<string, number>) => {
          if (!text) return
          parseRichText(text, {
            blackboard: bb,
            terms: constantsData.terms,
            onWarning: (w) => {
              if (
                w.includes('Unknown highlight tag') ||
                (w.includes('Term') && w.includes('not found'))
              ) {
                unknownTags.push(`${op.id}: ${w}`)
              }
              warnings.push(w)
            },
          })
        }

        for (const s of op.skills ?? []) {
          for (const l of s.levels ?? []) {
            parseDesc(l.description?.en, l.blackboard)
            parseDesc(l.description?.zh, l.blackboard)
          }
        }
        for (const t of op.talents ?? []) {
          for (const c of t.candidates ?? []) {
            parseDesc(c.description?.en, c.blackboard)
            parseDesc(c.description?.zh, c.blackboard)
          }
        }
        for (const m of op.modules ?? []) {
          for (const st of m.stages ?? []) {
            for (const p of st.parts ?? []) {
              for (const c of p.candidates ?? []) {
                parseDesc(c.additionalDescription?.en, c.blackboard)
                parseDesc(c.additionalDescription?.zh, c.blackboard)
                parseDesc(c.upgradeDescription?.en, c.blackboard)
                parseDesc(c.upgradeDescription?.zh, c.blackboard)
                parseDesc(c.overrideDescription?.en, c.blackboard)
                parseDesc(c.overrideDescription?.zh, c.blackboard)
              }
            }
          }
        }
      }

      // Assert that 100% of highlight tags and terms across all 434 operators are recognized
      expect(unknownTags).toEqual([])
    })
  })
})
