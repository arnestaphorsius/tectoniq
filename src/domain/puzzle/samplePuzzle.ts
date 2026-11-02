import type { Board, Digit, Puzzle } from './types'

/**
 * The 8×8 Tectonic the play screen opens on: Denksport's example of a
 * five-star ("Moeilijk") puzzle, from denksport.com/puzzelwijzer-logisch-niveau-tectonic-5.
 *
 *    0  1  2  2  3  4  4  4
 *    5  1  2  2  3  3  4  4
 *    5  1  1  2  3  3  6  6
 *    5  1  7  7  7  8  8  8
 *    5  5  9  7  7  8  8 10
 *   11 11  9  9 12 12 10 10
 *   11 11  9  9 13 12 10 10
 *   14 11 15 15 13 13 13 13
 *
 * It has exactly one solution. The current strategies stall a few placements
 * in, so the small puzzle in `smallPuzzle.ts` stays the fixture for tests that
 * need hints to solve a puzzle outright.
 */
export const SAMPLE_PUZZLE: Puzzle = {
  width: 8,
  height: 8,
  // prettier-ignore
  cages: [
     0,  1,  2,  2,  3,  4,  4,  4,
     5,  1,  2,  2,  3,  3,  4,  4,
     5,  1,  1,  2,  3,  3,  6,  6,
     5,  1,  7,  7,  7,  8,  8,  8,
     5,  5,  9,  7,  7,  8,  8, 10,
    11, 11,  9,  9, 12, 12, 10, 10,
    11, 11,  9,  9, 13, 12, 10, 10,
    14, 11, 15, 15, 13, 13, 13, 13,
  ],
  // prettier-ignore
  givens: [
    null, null, null, 2,    null, null, null, null,
    null, null, null, null, null, 5,    null, 4,
    3,    null, null, null, null, null, null, null,
    null, null, null, null, null, null, null, 3,
    2,    null, null, null, null, null, null, null,
    null, null, null, null, null, null, null, null,
    null, null, null, null, null, null, null, 5,
    null, null, null, null, null, 4,    null, null,
  ],
}

/** The sample's one solution. */
// prettier-ignore
export const SAMPLE_SOLUTION: readonly Digit[] = [
  1, 3, 1, 2, 3, 2, 1, 5,
  4, 2, 4, 5, 1, 5, 3, 4,
  3, 5, 1, 3, 4, 2, 1, 2,
  1, 4, 2, 5, 1, 5, 4, 3,
  2, 5, 1, 3, 4, 2, 1, 2,
  1, 3, 4, 2, 1, 3, 4, 3,
  5, 2, 5, 3, 5, 2, 1, 5,
  1, 4, 1, 2, 1, 4, 3, 2,
]

/** The sample's solution expressed as a board. */
export const SAMPLE_SOLVED_BOARD: Board = [...SAMPLE_SOLUTION]
