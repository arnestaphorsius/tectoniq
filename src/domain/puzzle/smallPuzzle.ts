import type { Board, Digit, Puzzle } from './types'

/**
 * A 4×5 Tectonic, the app's first sample, kept for tests as a known-good fixture.
 *
 * The strategies solve it from its givens alone, which is what makes it the
 * fixture for walking a hint end to end. The play screen uses `SAMPLE_PUZZLE`.
 *
 *   0 0 1 1
 *   0 0 1 1
 *   2 2 3 1
 *   2 2 3 3
 *   2 4 3 3
 *
 */
export const SMALL_PUZZLE: Puzzle = {
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

/** The solution the small puzzle was built from. */
// prettier-ignore
export const SMALL_SOLUTION: readonly Digit[] = [
  1, 2, 3, 4,
  3, 4, 1, 5,
  1, 2, 3, 2,
  5, 4, 5, 1,
  3, 1, 2, 4,
]

/** The small puzzle's solution expressed as a board, for tests. */
export const SMALL_SOLVED_BOARD: Board = [...SMALL_SOLUTION]
