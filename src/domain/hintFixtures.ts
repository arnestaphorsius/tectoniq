import { SAMPLE_SOLVED_BOARD, SAMPLE_PUZZLE } from './samplePuzzle'
import { emptyBoard, type Board, type Digit } from './types'

/**
 * Board states on the sample puzzle that the hint specs are written against, named
 * as in `work/hints-1/spec.md`. Test-only: nothing in the app imports this.
 */

/** The sample's empty board with `entries` written in, as `cell → digit`. */
export function sampleWith(entries: Readonly<Record<number, Digit>>): Board {
  const board = [...emptyBoard(SAMPLE_PUZZLE)]
  for (const [cell, digit] of Object.entries(entries)) board[Number(cell)] = digit
  return board
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
