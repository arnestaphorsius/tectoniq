import { describe, expect, it } from 'vite-plus/test'
import { SAMPLE_PUZZLE, SAMPLE_SOLVED_BOARD } from './samplePuzzle'
import { emptyBoard, type Board, type Digit, type Puzzle } from './types'
import { findViolations, isComplete, isSolved, validatePuzzle, valueAt } from './validate'

/**
 * Two vertical cages of two, side by side. Isolates the diagonal rule.
 *
 * Note this shape is deliberately *unsolvable*: all four cells touch each other,
 * so they need four distinct digits, but cages of two permit only 1 and 2. That
 * makes it a good fixture for violation detection and a bad one for solving.
 */
const TWO_BY_TWO: Puzzle = {
  width: 2,
  height: 2,
  cages: [0, 1, 0, 1],
  givens: [null, null, null, null],
}

/** A single horizontal cage of two — the smallest genuinely solvable puzzle. */
const PAIR: Puzzle = {
  width: 2,
  height: 1,
  cages: [0, 0],
  givens: [null, null],
}

function boardOf(...values: readonly (Digit | null)[]): Board {
  return values
}

describe('the sample fixture', () => {
  it('is a structurally valid puzzle', () => {
    expect(validatePuzzle(SAMPLE_PUZZLE)).toEqual([])
  })

  it('is actually solved by its stated solution', () => {
    // Guards the hand-built fixture: if the grid or the solution is wrong,
    // every other test using it is meaningless.
    expect(findViolations(SAMPLE_PUZZLE, SAMPLE_SOLVED_BOARD)).toEqual([])
    expect(isSolved(SAMPLE_PUZZLE, SAMPLE_SOLVED_BOARD)).toBe(true)
  })

  it('has givens consistent with its solution', () => {
    SAMPLE_PUZZLE.givens.forEach((given, cell) => {
      if (given !== null) expect(given).toBe(SAMPLE_SOLVED_BOARD[cell])
    })
  })

  it('breaks no rules while still empty', () => {
    expect(findViolations(SAMPLE_PUZZLE, emptyBoard(SAMPLE_PUZZLE))).toEqual([])
    expect(isComplete(SAMPLE_PUZZLE, emptyBoard(SAMPLE_PUZZLE))).toBe(false)
  })
})

describe('validatePuzzle', () => {
  it('rejects a zero-sized grid', () => {
    const problems = validatePuzzle({ width: 0, height: 0, cages: [], givens: [] })
    expect(problems).toEqual([{ kind: 'empty-grid' }])
  })

  it('rejects arrays that do not match the cell count', () => {
    const problems = validatePuzzle({ width: 2, height: 2, cages: [0, 0], givens: [null] })
    expect(problems).toEqual([
      { kind: 'array-length-mismatch', field: 'cages', expected: 4, actual: 2 },
      { kind: 'array-length-mismatch', field: 'givens', expected: 4, actual: 1 },
    ])
  })

  it('rejects a cage larger than five cells', () => {
    const problems = validatePuzzle({
      width: 6,
      height: 1,
      cages: [0, 0, 0, 0, 0, 0],
      givens: Array.from({ length: 6 }, () => null),
    })
    expect(problems).toContainEqual({ kind: 'cage-too-large', cageId: 0, size: 6 })
  })

  it('rejects a cage split into islands', () => {
    const problems = validatePuzzle({
      width: 3,
      height: 1,
      cages: [0, 1, 0],
      givens: [null, null, null],
    })
    expect(problems).toContainEqual({ kind: 'cage-not-contiguous', cageId: 0 })
  })

  it('rejects a given outside 1..5', () => {
    const problems = validatePuzzle({
      width: 2,
      height: 1,
      cages: [0, 0],
      givens: [9 as Digit, null],
    })
    expect(problems).toContainEqual({ kind: 'given-not-a-digit', cell: 0, value: 9 })
  })
})

describe('valueAt', () => {
  it('prefers the given over a board entry', () => {
    // Cell 4 carries a given; the guard fails loudly if the sample changes.
    expect(SAMPLE_PUZZLE.givens[4]).toBe(3)
    const allFours = Array.from({ length: SAMPLE_PUZZLE.givens.length }, (): Digit => 4)
    expect(valueAt(SAMPLE_PUZZLE, allFours, 4)).toBe(3)
  })

  it('falls back to the board entry where there is no given', () => {
    const board = emptyBoard(SAMPLE_PUZZLE).slice()
    board[1] = 2
    expect(valueAt(SAMPLE_PUZZLE, board, 1)).toBe(2)
  })

  it('is null for an untouched cell', () => {
    expect(valueAt(SAMPLE_PUZZLE, emptyBoard(SAMPLE_PUZZLE), 1)).toBeNull()
  })
})

describe('findViolations', () => {
  it('flags equal digits touching diagonally', () => {
    const violations = findViolations(TWO_BY_TWO, boardOf(1, null, null, 1))
    expect(violations).toEqual([{ kind: 'touching-duplicate', value: 1, cells: [0, 3] }])
  })

  it('flags equal digits touching vertically', () => {
    const violations = findViolations(TWO_BY_TWO, boardOf(1, null, 1, null))
    expect(violations).toContainEqual({ kind: 'touching-duplicate', value: 1, cells: [0, 2] })
  })

  it('reports each touching pair only once', () => {
    const violations = findViolations(TWO_BY_TWO, boardOf(1, null, null, 1))
    expect(violations).toHaveLength(1)
  })

  it('flags a digit repeated inside one cage', () => {
    const cage: Puzzle = {
      width: 1,
      height: 3,
      cages: [0, 0, 0],
      givens: [null, null, null],
    }
    const violations = findViolations(cage, boardOf(2, 3, 2))
    expect(violations).toContainEqual({
      kind: 'cage-duplicate',
      cageId: 0,
      value: 2,
      cells: [0, 2],
    })
  })

  it('flags a digit larger than its cage', () => {
    const violations = findViolations(PAIR, boardOf(3, null))
    expect(violations).toContainEqual({
      kind: 'value-exceeds-cage',
      cell: 0,
      value: 3,
      cageSize: 2,
    })
  })

  it('accepts equal digits that do not touch', () => {
    const strip: Puzzle = {
      width: 3,
      height: 1,
      cages: [0, 1, 2],
      givens: [null, null, null],
    }
    expect(findViolations(strip, boardOf(1, null, 1))).toEqual([])
  })
})

describe('completion', () => {
  it('treats a full but illegal board as complete, not solved', () => {
    const board = boardOf(1, 1, 1, 1)
    expect(isComplete(TWO_BY_TWO, board)).toBe(true)
    expect(isSolved(TWO_BY_TWO, board)).toBe(false)
  })

  it('treats a full and legal board as solved', () => {
    expect(isSolved(PAIR, boardOf(1, 2))).toBe(true)
  })

  it('is not solved while any cell is empty', () => {
    expect(isSolved(PAIR, boardOf(1, null))).toBe(false)
  })
})
