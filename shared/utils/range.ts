import type { RangeOffset, RangeTableEntry } from '../schemas/range'

export interface RawRangeGridInput {
  id: string
  direction: number
  grids: RangeOffset[]
}

/**
 * Normalizes relative range offsets into a 2D bounding matrix and operator anchor.
 *
 * Coordinates in game data are relative offsets to the operator tile at (0, 0):
 * - `col`: horizontal offset (0 = operator tile, positive = forward / right, negative = behind / left)
 * - `row`: vertical offset (0 = operator tile, positive = top / up, negative = bottom / down)
 *
 * To ensure the operator tile is always accessible within the matrix (even for snipers
 * with minimum range / dead zones like Besieger '4-3' where (0, 0) is not attackable),
 * the bounding box encompasses both all attackable offsets AND (0, 0).
 *
 * In the normalized matrix (rows x cols):
 * - row 0 is the topmost row (corresponding to maxRow in relative coordinates)
 * - col 0 is the leftmost column (corresponding to minCol in relative coordinates)
 * - cells contain 1 for attackable tiles and 0 for non-attackable tiles
 * - `anchor` marks the (row, col) coordinates of the operator inside the matrix
 */
export function normalizeRange(raw: RawRangeGridInput): RangeTableEntry {
  const allRows = [0, ...raw.grids.map((g) => g.row)]
  const allCols = [0, ...raw.grids.map((g) => g.col)]

  const minRow = Math.min(...allRows)
  const maxRow = Math.max(...allRows)
  const minCol = Math.min(...allCols)
  const maxCol = Math.max(...allCols)

  const rows = maxRow - minRow + 1
  const cols = maxCol - minCol + 1

  const anchor = {
    row: maxRow === 0 ? 0 : maxRow,
    col: minCol === 0 ? 0 : -minCol,
  }

  const gridSet = new Set(raw.grids.map((g) => `${g.row},${g.col}`))

  const matrix: Array<Array<0 | 1>> = []
  for (let r = 0; r < rows; r++) {
    const rowOffset = maxRow - r
    const rowCells: Array<0 | 1> = []
    for (let c = 0; c < cols; c++) {
      const colOffset = minCol + c
      rowCells.push(gridSet.has(`${rowOffset},${colOffset}`) ? 1 : 0)
    }
    matrix.push(rowCells)
  }

  return {
    id: raw.id,
    direction: raw.direction,
    grids: raw.grids,
    rows,
    cols,
    anchor,
    matrix,
  }
}

/**
 * Reconstructs original relative offsets from a normalized matrix and operator anchor.
 */
export function reconstructOffsetsFromMatrix(
  range: Pick<RangeTableEntry, 'matrix' | 'anchor'>,
): RangeOffset[] {
  const offsets: RangeOffset[] = []
  for (let r = 0; r < range.matrix.length; r++) {
    const rowCells = range.matrix[r]
    if (!rowCells) continue
    for (let c = 0; c < rowCells.length; c++) {
      if (rowCells[c] === 1) {
        offsets.push({
          row: range.anchor.row - r,
          col: c - range.anchor.col,
        })
      }
    }
  }
  return offsets
}
