import { cellCount, coordOf, indexOf } from './grid'
import type { Board, Digit, Puzzle } from './types'

/** The four ways an arrow key can move the selection. */
export type Direction = 'up' | 'down' | 'left' | 'right'

/**
 * Whether a cell can hold the selection. Givens cannot: they are unwritable, so
 * selecting one would offer the player a cell no keystroke can affect.
 */
export function isSelectable(puzzle: Puzzle, cell: number): boolean {
  if (cell < 0 || cell >= cellCount(puzzle)) return false
  return puzzle.givens[cell] == null
}

/**
 * Where the selection lands when an arrow key is pressed.
 *
 * Movement stays on the line it started from — a row for left/right, a column for
 * up/down — wrapping at the ends, and steps over any given in the way. It therefore
 * makes at most one full pass over that line: if the line holds no other selectable
 * cell, the traversal returns to where it began and the selection is unchanged.
 * That bound is what stops the search rather than a special case for it.
 */
export function nextSelection(puzzle: Puzzle, from: number, direction: Direction): number {
  if (from < 0 || from >= cellCount(puzzle)) return from

  const { row, col } = coordOf(puzzle, from)
  const horizontal = direction === 'left' || direction === 'right'
  const length = horizontal ? puzzle.width : puzzle.height
  const delta = direction === 'right' || direction === 'down' ? 1 : -1
  const start = horizontal ? col : row

  for (let step = 1; step < length; step += 1) {
    // Modulo of a negative is negative in JS, hence the second wrap.
    const position = (((start + delta * step) % length) + length) % length
    const cell = horizontal
      ? indexOf(puzzle, { row, col: position })
      : indexOf(puzzle, { row: position, col })
    if (isSelectable(puzzle, cell)) return cell
  }
  return from
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
