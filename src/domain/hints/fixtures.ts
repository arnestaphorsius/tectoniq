import { SAMPLE_SOLVED_BOARD, SAMPLE_PUZZLE } from '@/domain/puzzle/samplePuzzle'
import { emptyBoard, type Board, type Digit, type Puzzle } from '@/domain/puzzle/types'

/**
 * Board states that the hint specs are written against, named as in
 * `work/hints-1/spec.md` and `work/hints-2/spec.md`. Test-only: nothing in the app
 * imports this.
 */

/** `puzzle`'s empty board with `entries` written in, as `cell → digit`. */
function boardWith(puzzle: Puzzle, entries: Readonly<Record<number, Digit>>): Board {
  const board = [...emptyBoard(puzzle)]
  for (const [cell, digit] of Object.entries(entries)) board[Number(cell)] = digit
  return board
}

/** The sample's empty board with `entries` written in, as `cell → digit`. */
export function sampleWith(entries: Readonly<Record<number, Digit>>): Board {
  return boardWith(SAMPLE_PUZZLE, entries)
}

/** The solved sample with `cells` cleared again. */
export function solvedWithout(...cells: number[]): Board {
  const board: (Digit | null)[] = [...SAMPLE_SOLVED_BOARD]
  for (const cell of cells) board[cell] = null
  return board
}

export const F_START = sampleWith({})
export const F_17 = sampleWith({ 17: 1 })
export const F_S4 = sampleWith({ 14: 5, 15: 1, 17: 1 })
export const F_S3 = sampleWith({ 14: 5, 15: 1, 16: 3, 17: 1, 18: 2 })
export const F_STUCK = sampleWith({ 13: 4, 14: 5, 15: 1, 16: 3, 17: 1, 18: 2 })
export const F_FULL_0 = solvedWithout(0)
export const F_FULL_0_1_14 = solvedWithout(0, 1, 14)
export const F_DEAD = sampleWith({ 13: 1 })
export const F_DEAD_2 = sampleWith({ 13: 1, 15: 5 })

/**
 * A 4×4 puzzle where a Naked Pairs A elimination unlocks a hint, which the sample has
 * none of. That takes a five-cell cage shaped just so, here cage 2: cells 10 and 14
 * can only be 2 or 4, and only once they claim both is cell 6 down to one digit.
 * Found by search, not built from a solution, and it has several solutions.
 *
 *   0 0 0 0     1 . . .
 *   1 0 2 2     4 5 . .
 *   1 1 2 2     1 3 . .
 *   1 1 2 3     2 5 . 1
 */
export const PAIRS_PUZZLE: Puzzle = {
  width: 4,
  height: 4,
  // prettier-ignore
  cages: [
    0, 0, 0, 0,
    1, 0, 2, 2,
    1, 1, 2, 2,
    1, 1, 2, 3,
  ],
  // prettier-ignore
  givens: [
    1,    null, null, null,
    4,    5,    null, null,
    1,    3,    null, null,
    2,    5,    null, 1,
  ],
}

/** S1–S5 are stuck; the pair at 10 and 14 leaves cell 6 with only 1. */
export const F_A = emptyBoard(PAIRS_PUZZLE)
/** Pairs still apply after 6=1, but nothing places a digit. */
export const F_A_NONE = boardWith(PAIRS_PUZZLE, { 6: 1 })
/** Legal but wrong: the pair at 6 and 10 takes cell 14's last candidates. */
export const F_A_DEAD = boardWith(PAIRS_PUZZLE, { 7: 1, 11: 3 })
