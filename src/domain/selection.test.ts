import { describe, expect, it } from 'vite-plus/test'
import { SAMPLE_PUZZLE } from './samplePuzzle'
import { isWritable, nextSelection, withEntry } from './selection'
import { emptyBoard, type Puzzle } from './types'

/** A single column, so left and right have nowhere to go. */
// prettier-ignore
const ONE_WIDE: Puzzle = {
  width: 1,
  height: 3,
  cages: [
    0,
    0,
    0,
  ],
  givens: [
    null,
    null,
    null,
  ],
}

describe('isWritable', () => {
  it('accepts an empty cell and rejects a given', () => {
    expect(isWritable(SAMPLE_PUZZLE, 0)).toBe(true)
    expect(isWritable(SAMPLE_PUZZLE, 4)).toBe(false)
  })

  it('rejects an index outside the grid', () => {
    expect(isWritable(SAMPLE_PUZZLE, -1)).toBe(false)
    expect(isWritable(SAMPLE_PUZZLE, 20)).toBe(false)
  })
})

describe('nextSelection', () => {
  it('steps to the neighbour when it is free', () => {
    expect(nextSelection(SAMPLE_PUZZLE, 0, 'right')).toBe(1)
    expect(nextSelection(SAMPLE_PUZZLE, 1, 'left')).toBe(0)
    expect(nextSelection(SAMPLE_PUZZLE, 13, 'down')).toBe(17)
    expect(nextSelection(SAMPLE_PUZZLE, 5, 'up')).toBe(1)
  })

  it('lands on a given rather than stepping over it', () => {
    // Column 0 is 0, 4, 8, 12, 16 with 4 and 12 given.
    expect(nextSelection(SAMPLE_PUZZLE, 0, 'down')).toBe(4)
    // Column 2 is 2, 6, 10, 14, 18 with 10 given.
    expect(nextSelection(SAMPLE_PUZZLE, 14, 'up')).toBe(10)
  })

  it('wraps within the row, never onto another row', () => {
    expect(nextSelection(SAMPLE_PUZZLE, 3, 'right')).toBe(0)
    expect(nextSelection(SAMPLE_PUZZLE, 0, 'left')).toBe(3)
  })

  it('wraps within the column, never onto another column', () => {
    expect(nextSelection(SAMPLE_PUZZLE, 1, 'up')).toBe(17)
    expect(nextSelection(SAMPLE_PUZZLE, 17, 'down')).toBe(1)
  })

  it('wraps onto a given like any other cell', () => {
    // Row 4 is 16, 17, 18, 19 with 19 given.
    expect(nextSelection(SAMPLE_PUZZLE, 16, 'left')).toBe(19)
  })

  it('stays put when the line is one cell long', () => {
    expect(nextSelection(ONE_WIDE, 1, 'left')).toBe(1)
    expect(nextSelection(ONE_WIDE, 1, 'right')).toBe(1)
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
