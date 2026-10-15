import { describe, it, expect } from 'vitest'
import { formatWordDigits } from '../../../../app/utils/typography'

describe('formatWordDigits', () => {
  it('wraps digits inside words with u-font-alt-num class', () => {
    expect(formatWordDigits('Mon3tr')).toBe('Mon<span class="u-font-alt-num">3</span>tr')
    expect(formatWordDigits('SilverAsh')).toBe('SilverAsh')
    expect(formatWordDigits('Operator 123')).toBe('Operator 123')
  })
})
