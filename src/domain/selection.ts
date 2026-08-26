import { cellCount, coordOf, indexOf } from './grid'
import type { Board, Digit, Puzzle } from './types'
import { valueAt } from './validate'

/** The four ways an arrow key can move the selection. */
export type Direction = 'up' | 'down' | 'left' | 'right'

/**
 * Whether the player may put a digit in a cell. Givens may not be altered, but they
 * can still hold the selection — arrow keys cross them, so refusing the write is
 * what protects them rather than refusing the selection.
 */
export function isWritable(puzzle: Puzzle, cell: number): boolean {
  if (cell < 0 || cell >= cellCount(puzzle)) return false
  return puzzle.givens[cell] == null
}

/**
 * Where the selection lands when an arrow key is pressed.
 *
 * Movement is one step along the line it started from — a row for left/right, a
 * column for up/down — and wraps at the ends, so it never leaves that line. Givens
 * are ordinary stops: a grid whose free cells are scattered is still navigable in
 * single steps. A line only one cell long has nowhere to go and stays put.
 */
export function nextSelection(puzzle: Puzzle, from: number, direction: Direction): number {
  if (from < 0 || from >= cellCount(puzzle)) return from

  const { row, col } = coordOf(puzzle, from)
  const horizontal = direction === 'left' || direction === 'right'
  const length = horizontal ? puzzle.width : puzzle.height
  const delta = direction === 'right' || direction === 'down' ? 1 : -1
  const start = horizontal ? col : row

  // Modulo of a negative is negative in JS, hence the second wrap.
  const position = (((start + delta) % length) + length) % length
  return horizontal
    ? indexOf(puzzle, { row, col: position })
    : indexOf(puzzle, { row: position, col })
}

/**
 * What pressing `digit` on `cell` should leave there — the digit, or nothing when
 * that digit is already in the cell. Pressing a digit twice takes it back, which
 * spares the player reaching for Backspace to undo a keystroke they just made.
 */
export function toggledEntry(
  puzzle: Puzzle,
  board: Board,
  cell: number,
  digit: Digit,
): Digit | null {
  return valueAt(puzzle, board, cell) === digit ? null : digit
}

/**
 * The board with `cell` set to `digit`, or cleared when `digit` is null. Returns a
 * new board rather than mutating, so a caller can hold the old one for comparison.
 */
export function withEntry(board: Board, cell: number, digit: Digit | null): Board {
  if (cell < 0 || cell >= board.length) return board
  const next = [...board]
  next[cell] = digit
  return next
}
