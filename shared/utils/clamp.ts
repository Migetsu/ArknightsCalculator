/**
 * Clamps a number between a minimum and a maximum value.
 *
 * @param value - The numerical value to clamp.
 * @param min - The lower inclusive bound.
 * @param max - The upper inclusive bound.
 * @returns The clamped value within [min, max].
 * @throws {RangeError} If min is strictly greater than max.
 */
export function clamp(value: number, min: number, max: number): number {
  if (min > max) {
    throw new RangeError(`min (${min}) cannot be greater than max (${max})`)
  }
  return Math.min(Math.max(value, min), max)
}
