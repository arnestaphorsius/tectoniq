/**
 * Tectonic (also sold as Suguru) domain types.
 *
 * The rules, in full:
 *  1. The grid is partitioned into cages of between 1 and 5 cells.
 *  2. A cage of N cells contains each of the digits 1..N exactly once.
 *  3. No two equal digits may touch — including diagonally.
 *
 * Rule 3 is the one that makes Tectonic not Sudoku, and it is the rule that
 * makes the puzzle solvable at all: without it, cages would be independent.
 */

/** Classic Tectonic caps a cage at five cells, so no digit ever exceeds 5. */
export const MAX_CAGE_SIZE = 5

export type Digit = 1 | 2 | 3 | 4 | 5

export type CageId = number

/** Zero-indexed grid position. */
export interface Coord {
  readonly row: number
  readonly col: number
}

/**
 * An immutable puzzle definition.
 *
 * `cages` and `givens` are row-major arrays of length `width * height`, so the
 * index of a cell is `row * width + col`. Storing them flat keeps cell identity
 * a plain number, which makes violations cheap to compare and to render.
 */
export interface Puzzle {
  readonly width: number
  readonly height: number
  /** Which cage each cell belongs to. */
  readonly cages: readonly CageId[]
  /** Pre-filled clues; `null` where the player must supply a digit. */
  readonly givens: readonly (Digit | null)[]
}

/**
 * Player-entered digits, row-major, one slot per cell.
 *
 * Deliberately separate from `Puzzle.givens` so that a given can never be
 * overwritten: `valueAt` resolves the given first and ignores the entry.
 */
export type Board = readonly (Digit | null)[]

/** An empty board sized for `puzzle`. */
export function emptyBoard(puzzle: Puzzle): Board {
  return Array.from({ length: puzzle.width * puzzle.height }, (): Digit | null => null)
}

/** Narrows an arbitrary number to a Digit. */
export function isDigit(value: number): value is Digit {
  return Number.isInteger(value) && value >= 1 && value <= MAX_CAGE_SIZE
}
