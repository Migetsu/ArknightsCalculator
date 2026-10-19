import { describe, it, expect } from 'vitest'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import {
  RangesDictionarySchema,
  RangeTableEntrySchema,
  type RangesDictionary,
} from '../../../shared/schemas/range'
import {
  normalizeRange,
  reconstructOffsetsFromMatrix,
  type RawRangeGridInput,
} from '../../../shared/utils/range'
import type { OperatorDetail } from '../../../shared/schemas/operator'

describe('Range Schema and Normalization (shared/schemas/range, shared/utils/range)', () => {
  const rangesFilePath = path.resolve(process.cwd(), 'data/ranges.json')
  const operatorsDirPath = path.resolve(process.cwd(), 'data/operators')

  it('validates data/ranges.json against RangesDictionarySchema and contains all 73 entries', async () => {
    const raw = await fs.readFile(rangesFilePath, 'utf-8')
    const json = JSON.parse(raw) as unknown
    const parsed = RangesDictionarySchema.parse(json)

    const keys = Object.keys(parsed)
    expect(keys.length).toBe(73)

    for (const [id, range] of Object.entries(parsed)) {
      expect(range.id).toBe(id)
      expect(range.direction).toBe(1)
      expect(range.grids.length).toBeGreaterThan(0)
      expect(range.rows).toBeGreaterThan(0)
      expect(range.cols).toBeGreaterThan(0)

      // Anchor inside matrix bounds
      expect(range.anchor.row).toBeGreaterThanOrEqual(0)
      expect(range.anchor.row).toBeLessThan(range.rows)
      expect(range.anchor.col).toBeGreaterThanOrEqual(0)
      expect(range.anchor.col).toBeLessThan(range.cols)

      // Matrix dimensions match rows x cols
      expect(range.matrix.length).toBe(range.rows)
      for (const row of range.matrix) {
        expect(row.length).toBe(range.cols)
        for (const cell of row) {
          expect([0, 1]).toContain(cell)
        }
      }
    }
  })

  describe('normalizeRange logic', () => {
    it('normalizes single-cell range (0-1) correctly', () => {
      const raw: RawRangeGridInput = {
        id: '0-1',
        direction: 1,
        grids: [{ row: 0, col: 0 }],
      }
      const norm = normalizeRange(raw)
      RangeTableEntrySchema.parse(norm)

      expect(norm.rows).toBe(1)
      expect(norm.cols).toBe(1)
      expect(norm.anchor).toEqual({ row: 0, col: 0 })
      expect(norm.matrix).toEqual([[1]])
    })

    it('normalizes single-cell range detached from operator (1-5) ensuring anchor is included', () => {
      const raw: RawRangeGridInput = {
        id: '1-5',
        direction: 1,
        grids: [{ row: 0, col: 1 }],
      }
      const norm = normalizeRange(raw)
      RangeTableEntrySchema.parse(norm)

      // Bounding box must encompass (0, 0) and (0, 1) -> 1 row x 2 cols
      expect(norm.rows).toBe(1)
      expect(norm.cols).toBe(2)
      expect(norm.anchor).toEqual({ row: 0, col: 0 })
      expect(norm.matrix).toEqual([[0, 1]])
      expect(norm.matrix[norm.anchor.row]![norm.anchor.col]).toBe(0)
    })

    it('handles negative column coordinates behind the operator (b-1)', () => {
      const raw: RawRangeGridInput = {
        id: 'b-1',
        direction: 1,
        grids: [
          { row: 0, col: -1 },
          { row: 0, col: 0 },
        ],
      }
      const norm = normalizeRange(raw)
      RangeTableEntrySchema.parse(norm)

      expect(norm.rows).toBe(1)
      expect(norm.cols).toBe(2)
      // Operator at col 0 relative -> maps to index 1 (col - minCol = 0 - (-1) = 1)
      expect(norm.anchor).toEqual({ row: 0, col: 1 })
      expect(norm.matrix).toEqual([[1, 1]])
    })

    it('handles negative row coordinates and vertical symmetry (3-6)', () => {
      const raw: RawRangeGridInput = {
        id: '3-6',
        direction: 1,
        grids: [
          { row: 1, col: 0 },
          { row: 1, col: 1 },
          { row: 1, col: 2 },
          { row: 0, col: 0 },
          { row: 0, col: 1 },
          { row: 0, col: 2 },
          { row: -1, col: 0 },
          { row: -1, col: 1 },
          { row: -1, col: 2 },
        ],
      }
      const norm = normalizeRange(raw)
      RangeTableEntrySchema.parse(norm)

      expect(norm.rows).toBe(3)
      expect(norm.cols).toBe(3)
      expect(norm.anchor).toEqual({ row: 1, col: 0 })
      expect(norm.matrix).toEqual([
        [1, 1, 1],
        [1, 1, 1],
        [1, 1, 1],
      ])
    })

    it('correctly handles Besieger snipers with minimum-range dead zones (4-3)', () => {
      const raw: RawRangeGridInput = {
        id: '4-3',
        direction: 1,
        grids: [
          { row: 2, col: 2 },
          { row: 2, col: 3 },
          { row: 1, col: 2 },
          { row: 1, col: 3 },
          { row: 1, col: 4 },
          { row: 0, col: 2 },
          { row: 0, col: 3 },
          { row: 0, col: 4 },
          { row: -1, col: 2 },
          { row: -1, col: 3 },
          { row: -1, col: 4 },
          { row: -2, col: 2 },
          { row: -2, col: 3 },
        ],
      }
      const norm = normalizeRange(raw)
      RangeTableEntrySchema.parse(norm)

      expect(norm.rows).toBe(5)
      expect(norm.cols).toBe(5)
      expect(norm.anchor).toEqual({ row: 2, col: 0 })
      expect(norm.matrix[norm.anchor.row]![norm.anchor.col]).toBe(0) // Dead zone at operator tile
      expect(norm.matrix).toEqual([
        [0, 0, 1, 1, 0],
        [0, 0, 1, 1, 1],
        [0, 0, 1, 1, 1],
        [0, 0, 1, 1, 1],
        [0, 0, 1, 1, 0],
      ])
    })

    it('guarantees 100% roundtrip invertibility between grids and matrix across all 73 ranges', async () => {
      const raw = await fs.readFile(rangesFilePath, 'utf-8')
      const ranges = JSON.parse(raw) as RangesDictionary

      for (const range of Object.values(ranges)) {
        const reconstructed = reconstructOffsetsFromMatrix(range)
        const originalSet = new Set(range.grids.map((g) => `${g.row},${g.col}`))
        const reconstructedSet = new Set(reconstructed.map((g) => `${g.row},${g.col}`))

        expect(reconstructedSet).toEqual(originalSet)
        expect(reconstructed.length).toBe(range.grids.length)
      }
    })
  })

  describe('Referential Integrity with Operators Dataset', () => {
    it('verifies that every rangeId in operator phases and skills exists in data/ranges.json', async () => {
      const rawRanges = await fs.readFile(rangesFilePath, 'utf-8')
      const ranges = JSON.parse(rawRanges) as RangesDictionary

      const files = await fs.readdir(operatorsDirPath)
      const opFiles = files.filter((f) => f.endsWith('.json'))
      expect(opFiles.length).toBe(434)

      let totalCheckedPhaseRefs = 0
      let totalCheckedSkillRefs = 0
      const missingPhaseRefs: string[] = []
      const missingSkillRefs: string[] = []

      for (const file of opFiles) {
        const opRaw = await fs.readFile(path.join(operatorsDirPath, file), 'utf-8')
        const op = JSON.parse(opRaw) as OperatorDetail

        for (const phase of op.phases ?? []) {
          if (phase.rangeId) {
            totalCheckedPhaseRefs++
            if (!ranges[phase.rangeId]) {
              missingPhaseRefs.push(`${op.id} phase ${phase.phase} -> ${phase.rangeId}`)
            }
          }
        }

        for (const skill of op.skills ?? []) {
          for (let lvl = 0; lvl < (skill.levels ?? []).length; lvl++) {
            const rangeId = skill.levels[lvl]?.rangeId
            if (rangeId) {
              totalCheckedSkillRefs++
              if (!ranges[rangeId]) {
                missingSkillRefs.push(`${op.id} ${skill.skillId} lvl ${lvl + 1} -> ${rangeId}`)
              }
            }
          }
        }
      }

      expect(totalCheckedPhaseRefs).toBe(1251)
      expect(totalCheckedSkillRefs).toBe(2377)
      expect(totalCheckedPhaseRefs + totalCheckedSkillRefs).toBe(3628)
      expect(missingPhaseRefs).toEqual([])
      expect(missingSkillRefs).toEqual([])
    })

    it('verifies that all CN-only operators have 100% valid rangeId references', async () => {
      const rawRanges = await fs.readFile(rangesFilePath, 'utf-8')
      const ranges = JSON.parse(rawRanges) as RangesDictionary

      const files = await fs.readdir(operatorsDirPath)
      let cnOnlyCount = 0
      let cnRangeRefs = 0

      for (const file of files) {
        if (!file.endsWith('.json')) continue
        const opRaw = await fs.readFile(path.join(operatorsDirPath, file), 'utf-8')
        const op = JSON.parse(opRaw) as OperatorDetail

        if (!op.servers.includes('global')) {
          cnOnlyCount++
          for (const phase of op.phases ?? []) {
            if (phase.rangeId) {
              cnRangeRefs++
              expect(ranges[phase.rangeId]).toBeDefined()
            }
          }
          for (const skill of op.skills ?? []) {
            for (const lvl of skill.levels ?? []) {
              if (lvl.rangeId) {
                cnRangeRefs++
                expect(ranges[lvl.rangeId]).toBeDefined()
              }
            }
          }
        }
      }

      expect(cnOnlyCount).toBe(17)
      expect(cnRangeRefs).toBe(167)
    })
  })
})
