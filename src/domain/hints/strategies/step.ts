import type { Candidates } from '@/domain/hints/candidates'
import type { Board, Digit, Puzzle } from '@/domain/puzzle/types'

/** Digits taken out of one cell's candidates. */
export interface Removal {
  readonly cell: number
  readonly digits: readonly Digit[]
}

/**
 * A candidate removal that a step's reasoning relies on: any removal from `cell`,
 * or only one of `digits` when given. The hint loop uses these to decide which
 * earlier eliminations a hint has to explain first.
 */
export interface Reads {
  readonly cell: number
  readonly digits?: readonly Digit[]
}

/**
 * A digit that must go in a cell.
 *
 * `justifying` holds the cells whose digits make the case, never the target itself.
 * The explanation's wording lives in `hints/copy.ts`.
 */
export interface Placement {
  readonly kind: 'placement'
  readonly strategy: string
  readonly cell: number
  readonly digit: Digit
  readonly justifying: readonly number[]
  readonly explanation: string
  readonly reads: readonly Reads[]
}

/**
 * Digits ruled out of cells without placing anything, such as the naked pairs in
 * `pairs.ts`. An elimination's reasoning reads the whole candidate set of its
 * justifying cells.
 */
export interface Elimination {
  readonly kind: 'elimination'
  readonly strategy: string
  readonly removals: readonly Removal[]
  readonly justifying: readonly number[]
  readonly explanation: string
}

export type Step = Placement | Elimination

/**
 * One way of finding the next step. Strategies are handed the candidates rather than
 * computing them, so an elimination found earlier in the loop narrows what later
 * strategies see.
 */
export interface Strategy {
  readonly name: string
  apply(puzzle: Puzzle, board: Board, candidates: Candidates): Step | null
}
