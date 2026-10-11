import { describe, it, expect } from 'vitest'
import { clamp } from '../../../../shared/utils/clamp'

describe('clamp', () => {
  describe('values within range', () => {
    it('returns the value unchanged when between min and max', () => {
      expect(clamp(5, 0, 10)).toBe(5)
      expect(clamp(0, -5, 5)).toBe(0)
      expect(clamp(3.14, 1.0, 5.0)).toBe(3.14)
    })

    it('returns the boundary value when equal to min or max', () => {
      expect(clamp(0, 0, 10)).toBe(0)
      expect(clamp(10, 0, 10)).toBe(10)
    })
  })

  describe('values out of bounds', () => {
    it('clamps to min when value is smaller than min', () => {
      expect(clamp(-5, 0, 10)).toBe(0)
      expect(clamp(-100, -50, 50)).toBe(-50)
      expect(clamp(-0.1, 0, 1)).toBe(0)
    })

    it('clamps to max when value is greater than max', () => {
      expect(clamp(15, 0, 10)).toBe(10)
      expect(clamp(100, -50, 50)).toBe(50)
      expect(clamp(1.05, 0, 1)).toBe(1)
    })
  })

  describe('edge cases', () => {
    it('handles identical min and max correctly', () => {
      expect(clamp(5, 5, 5)).toBe(5)
      expect(clamp(0, 5, 5)).toBe(5)
      expect(clamp(10, 5, 5)).toBe(5)
    })

    it('handles negative numbers correctly', () => {
      expect(clamp(-15, -20, -10)).toBe(-15)
      expect(clamp(-25, -20, -10)).toBe(-20)
      expect(clamp(-5, -20, -10)).toBe(-10)
    })

    it('throws RangeError when min is greater than max', () => {
      expect(() => clamp(5, 10, 0)).toThrow(RangeError)
      expect(() => clamp(5, 10, 0)).toThrow('min (10) cannot be greater than max (0)')
    })
  })
})
