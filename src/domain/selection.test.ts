import { describe, expect, it } from 'vite-plus/test'
import { SAMPLE_PUZZLE } from './samplePuzzle'
import { isSelectable, nextSelection, withEntry } from './selection'
import { emptyBoard, type Puzzle } from './types'

/**
 * A puzzle whose row 1 and column 1 each hold exactly one non-given cell — cell 4.
 * Traversal from there has nowhere legal to land, which is the termination case.
 *
 *   . x .        givens marked x, cell 4 is the only free cell
 *   x 4 x        in both its row and its column
 *   . x .
 */
// prettier-ignore
const BOXED_IN: Puzzle = {
  width: 3,
  height: 3,
  cages: [
    0, 0, 1,
    0, 1, 1,
    2, 2, 2,
  ],
  givens: [
    null, 1,    null,
    2,    null, 3,
    null, 1,    null,
  ],
}

describe('isSelectable', () => {
  it('accepts an empty cell and rejects a given', () => {
    expect(isSelectable(SAMPLE_PUZZLE, 0)).toBe(true)
    expect(isSelectable(SAMPLE_PUZZLE, 4)).toBe(false)
  })

  it('rejects an index outside the grid', () => {
    expect(isSelectable(SAMPLE_PUZZLE, -1)).toBe(false)
    expect(isSelectable(SAMPLE_PUZZLE, 20)).toBe(false)
  })
})

describe('nextSelection', () => {
  it('steps to the neighbour when it is free', () => {
    expect(nextSelection(SAMPLE_PUZZLE, 0, 'right')).toBe(1)
    expect(nextSelection(SAMPLE_PUZZLE, 1, 'left')).toBe(0)
    expect(nextSelection(SAMPLE_PUZZLE, 13, 'down')).toBe(17)
    expect(nextSelection(SAMPLE_PUZZLE, 5, 'up')).toBe(1)
  })

  it('skips a given in the way', () => {
    // Column 0 is 0, 4, 8, 12, 16 with 4 and 12 given.
    expect(nextSelection(SAMPLE_PUZZLE, 0, 'down')).toBe(8)
    // Column 2 is 2, 6, 10, 14, 18 with 10 given.
    expect(nextSelection(SAMPLE_PUZZLE, 14, 'up')).toBe(6)
  })

  it('skips a run of givens rather than only one', () => {
    // Column 3 is 3, 7, 11, 15, 19 with 7, 11 and 19 given.
    expect(nextSelection(SAMPLE_PUZZLE, 3, 'down')).toBe(15)
  })

  it('wraps within the row, never onto another row', () => {
    expect(nextSelection(SAMPLE_PUZZLE, 3, 'right')).toBe(0)
    expect(nextSelection(SAMPLE_PUZZLE, 0, 'left')).toBe(3)
  })

  it('wraps within the column, never onto another column', () => {
    expect(nextSelection(SAMPLE_PUZZLE, 1, 'up')).toBe(17)
    expect(nextSelection(SAMPLE_PUZZLE, 17, 'down')).toBe(1)
  })

  it('skips a given at the end of a line and then wraps', () => {
    // Row 4 is 16, 17, 18, 19 with 19 given.
    expect(nextSelection(SAMPLE_PUZZLE, 18, 'right')).toBe(16)
  })

  it('stays put when the cell is the only free one in its line', () => {
    expect(nextSelection(BOXED_IN, 4, 'left')).toBe(4)
    expect(nextSelection(BOXED_IN, 4, 'right')).toBe(4)
    expect(nextSelection(BOXED_IN, 4, 'up')).toBe(4)
    expect(nextSelection(BOXED_IN, 4, 'down')).toBe(4)
  })
})

describe('withEntry', () => {
  const board = emptyBoard(SAMPLE_PUZZLE)

  it('writes a digit without mutating the board it was given', () => {
    const next = withEntry(board, 0, 3)
    expect(next[0]).toBe(3)
    expect(board[0]).toBeNull()
  })

  it('replaces a digit already present', () => {
    expect(withEntry(withEntry(board, 0, 4), 0, 2)[0]).toBe(2)
  })

  it('clears a cell when given null', () => {
    expect(withEntry(withEntry(board, 0, 4), 0, null)[0]).toBeNull()
  })

  it('leaves every other cell alone', () => {
    const next = withEntry(board, 5, 1)
    expect(next.filter((value) => value !== null)).toHaveLength(1)
  })
})
