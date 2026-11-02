import { SAMPLE_PUZZLE } from '@/domain/puzzle/samplePuzzle'
import { SMALL_SOLVED_BOARD, SMALL_PUZZLE } from '@/domain/puzzle/smallPuzzle'
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

/** The small puzzle's empty board with `entries` written in, as `cell → digit`. */
export function smallWith(entries: Readonly<Record<number, Digit>>): Board {
  return boardWith(SMALL_PUZZLE, entries)
}

/** The solved small puzzle with `cells` cleared again. */
export function solvedWithout(...cells: number[]): Board {
  const board: (Digit | null)[] = [...SMALL_SOLVED_BOARD]
  for (const cell of cells) board[cell] = null
  return board
}

export const F_START = smallWith({})
export const F_17 = smallWith({ 17: 1 })
export const F_S4 = smallWith({ 14: 5, 15: 1, 17: 1 })
export const F_S3 = smallWith({ 14: 5, 15: 1, 16: 3, 17: 1, 18: 2 })
export const F_STUCK = smallWith({ 13: 4, 14: 5, 15: 1, 16: 3, 17: 1, 18: 2 })
export const F_FULL_0 = solvedWithout(0)
export const F_FULL_0_1_14 = solvedWithout(0, 1, 14)
export const F_DEAD = smallWith({ 13: 1 })
export const F_DEAD_2 = smallWith({ 13: 1, 15: 5 })

/**
 * A 4×4 puzzle where a Naked Pairs A elimination unlocks a hint, which the small puzzle has
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

/**
 * A chain of two eliminations on the sample. The Naked Pair at 29 and 30 takes 4 and
 * 5 out of 37 and 38, which leaves those two a Touching Pair of 1 and 2, which takes
 * 1 and 2 out of 45. Its cage only allows 1 to 3, so 45 is 3, and nothing on the
 * board rules anything out of it.
 */
export const F_CHAIN = boardWith(SAMPLE_PUZZLE, {
  0: 1,
  7: 5,
  14: 3,
  21: 2,
  22: 1,
  23: 2,
  56: 1,
})

/**
 * A hint whose target is one of its own pair, on the sample. The Touching Pair at 21
 * and 28 holds 1 and 2 and takes both out of 20, which leaves 2 nowhere else to go in
 * the cage of 21: a Hidden Single.
 */
export const F_TARGET_PAIR = boardWith(SAMPLE_PUZZLE, {
  0: 1,
  7: 5,
  14: 3,
  29: 5,
  30: 4,
  35: 3,
  36: 4,
  42: 4,
  45: 3,
  46: 4,
  47: 3,
  51: 3,
  56: 1,
})
