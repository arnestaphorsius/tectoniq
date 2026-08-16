import { cageIds, cageSize, cellCount, cellsInCage, isCageContiguous, touching } from './grid'
import { isDigit, MAX_CAGE_SIZE, type Board, type CageId, type Digit, type Puzzle } from './types'

/** A structural defect in a puzzle definition — a bug in the editor, not in play. */
export type PuzzleProblem =
  | { readonly kind: 'empty-grid' }
  | {
      readonly kind: 'array-length-mismatch'
      readonly field: 'cages' | 'givens'
      readonly expected: number
      readonly actual: number
    }
  | { readonly kind: 'cage-too-large'; readonly cageId: CageId; readonly size: number }
  | { readonly kind: 'cage-not-contiguous'; readonly cageId: CageId }
  | { readonly kind: 'given-not-a-digit'; readonly cell: number; readonly value: number }

/** A rule broken by the digits currently on the board. */
export type Violation =
  | {
      readonly kind: 'value-exceeds-cage'
      readonly cell: number
      readonly value: Digit
      readonly cageSize: number
    }
  | {
      readonly kind: 'cage-duplicate'
      readonly cageId: CageId
      readonly value: Digit
      readonly cells: readonly number[]
    }
  | {
      readonly kind: 'touching-duplicate'
      readonly value: Digit
      readonly cells: readonly [number, number]
    }

/**
 * Checks a puzzle definition against rules 1 and 2 before anyone plays it.
 * Returns every problem found rather than the first, so an editor can show them
 * all at once.
 */
export function validatePuzzle(puzzle: Puzzle): PuzzleProblem[] {
  const problems: PuzzleProblem[] = []

  if (puzzle.width <= 0 || puzzle.height <= 0) {
    problems.push({ kind: 'empty-grid' })
    return problems
  }

  const expected = cellCount(puzzle)
  if (puzzle.cages.length !== expected) {
    problems.push({
      kind: 'array-length-mismatch',
      field: 'cages',
      expected,
      actual: puzzle.cages.length,
    })
  }
  if (puzzle.givens.length !== expected) {
    problems.push({
      kind: 'array-length-mismatch',
      field: 'givens',
      expected,
      actual: puzzle.givens.length,
    })
  }
  // Later checks index by cell, so bail before reading past either array.
  if (problems.length > 0) return problems

  for (const cageId of cageIds(puzzle)) {
    const size = cageSize(puzzle, cageId)
    if (size > MAX_CAGE_SIZE) problems.push({ kind: 'cage-too-large', cageId, size })
    if (!isCageContiguous(puzzle, cageId)) problems.push({ kind: 'cage-not-contiguous', cageId })
  }

  puzzle.givens.forEach((value, cell) => {
    if (value !== null && !isDigit(value)) {
      problems.push({ kind: 'given-not-a-digit', cell, value })
    }
  })

  return problems
}

/**
 * The digit showing in a cell. A given always wins, so a stray board entry
 * underneath one can never affect play.
 */
export function valueAt(puzzle: Puzzle, board: Board, index: number): Digit | null {
  return puzzle.givens[index] ?? board[index] ?? null
}

/** Every rule the current board breaks. An empty array means "legal so far". */
export function findViolations(puzzle: Puzzle, board: Board): Violation[] {
  const violations: Violation[] = []
  const total = cellCount(puzzle)

  // Rule 2, upper bound: a cage of three can never hold a 4.
  for (let cell = 0; cell < total; cell += 1) {
    const value = valueAt(puzzle, board, cell)
    const cageId = puzzle.cages[cell]
    if (value === null || cageId === undefined) continue
    const size = cageSize(puzzle, cageId)
    if (value > size) {
      violations.push({ kind: 'value-exceeds-cage', cell, value, cageSize: size })
    }
  }

  // Rule 2, uniqueness within a cage.
  for (const cageId of cageIds(puzzle)) {
    const byValue = new Map<Digit, number[]>()
    for (const cell of cellsInCage(puzzle, cageId)) {
      const value = valueAt(puzzle, board, cell)
      if (value === null) continue
      const cells = byValue.get(value)
      if (cells) cells.push(cell)
      else byValue.set(value, [cell])
    }
    for (const [value, cells] of byValue) {
      if (cells.length > 1) violations.push({ kind: 'cage-duplicate', cageId, value, cells })
    }
  }

  // Rule 3: equal digits may not touch, diagonals included. Each offending pair
  // is reported once by only looking at the higher-indexed neighbour.
  for (let cell = 0; cell < total; cell += 1) {
    const value = valueAt(puzzle, board, cell)
    if (value === null) continue
    for (const neighbour of touching(puzzle, cell)) {
      if (neighbour <= cell) continue
      if (valueAt(puzzle, board, neighbour) === value) {
        violations.push({ kind: 'touching-duplicate', value, cells: [cell, neighbour] })
      }
    }
  }

  return violations
}

/** Whether every cell holds a digit, legal or otherwise. */
export function isComplete(puzzle: Puzzle, board: Board): boolean {
  const total = cellCount(puzzle)
  for (let cell = 0; cell < total; cell += 1) {
    if (valueAt(puzzle, board, cell) === null) return false
  }
  return true
}

/** Whether the board is both full and legal — the win condition. */
export function isSolved(puzzle: Puzzle, board: Board): boolean {
  return isComplete(puzzle, board) && findViolations(puzzle, board).length === 0
}
