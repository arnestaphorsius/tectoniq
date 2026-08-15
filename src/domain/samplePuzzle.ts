import type { Board, Digit, Puzzle } from './types'

/**
 * A 4×5 Tectonic used by the demo screen and by tests as a known-good fixture.
 *
 *   0 0 1 1
 *   0 0 1 1
 *   2 2 3 1
 *   2 2 3 3
 *   2 4 3 3
 *
 */
export const SAMPLE_PUZZLE: Puzzle = {
  width: 4,
  height: 5,
  // prettier-ignore
  cages: [
    0, 0, 1, 1,
    0, 0, 1, 1,
    2, 2, 3, 1,
    2, 2, 3, 3,
    2, 4, 3, 3,
  ],
  // prettier-ignore
  givens: [
    null, null, null, null,
    3,    null, null, 5,
    null, null, 3,    2,
    5,    null, null, null,
    null, null, null, 4,
  ],
}

/** The solution the sample was built from. */
// prettier-ignore
export const SAMPLE_SOLUTION: readonly Digit[] = [
  1, 2, 3, 4,
  3, 4, 1, 5,
  1, 2, 3, 2,
  5, 4, 5, 1,
  3, 1, 2, 4,
]

/** The sample's solution expressed as a board, for tests and for a "reveal". */
export const SAMPLE_SOLVED_BOARD: Board = [...SAMPLE_SOLUTION]
