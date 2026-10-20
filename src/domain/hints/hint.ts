import { candidatesFor } from './candidates'
import { NAKED_PAIR, TOUCHING_PAIR } from '@/domain/hints/strategies/pairs'
import {
  CROWN,
  FULL_BLOCK,
  HIDDEN_SINGLE,
  NAKED_SINGLE,
  UNIQUE,
} from '@/domain/hints/strategies/singles'
import type {
  Elimination,
  Placement,
  Reads,
  Removal,
  Strategy,
} from '@/domain/hints/strategies/step'
import type { Board, Digit, Puzzle } from '@/domain/puzzle/types'
import { findViolations } from '@/domain/puzzle/validate'

/** The order hints are looked for in: easiest deduction first. */
export const DEFAULT_STRATEGIES: readonly Strategy[] = [
  FULL_BLOCK,
  UNIQUE,
  CROWN,
  NAKED_SINGLE,
  HIDDEN_SINGLE,
  NAKED_PAIR,
  TOUCHING_PAIR,
]

/**
 * What asking for a hint gives back. Exactly one of:
 *
 * - `violations`: the board already breaks a rule, and a hint built on it would mislead.
 * - `dead-end`: open cells with no digit left that fits. The board cannot be
 *   completed as it stands, so some entry is wrong.
 * - `hint`: the next digit, plus the eliminations its reasoning depends on, in the
 *   order they were found.
 * - `none`: no strategy applies. This is said plainly rather than guessed at.
 */
export type HintResult =
  | { readonly kind: 'violations' }
  | { readonly kind: 'dead-end'; readonly cells: readonly number[] }
  | {
      readonly kind: 'hint'
      readonly placement: Placement
      readonly leadUp: readonly Elimination[]
    }
  | { readonly kind: 'none' }

/**
 * Runs `strategies` in order. The first placement is the hint. An elimination narrows
 * the candidates and starts the list again from the top, so that an easier strategy
 * always gets the first look at what it uncovered.
 *
 * An elimination that removes nothing still present is not progress and is passed
 * over. Without that rule, restarting from the top would never end.
 */
export function findHint(
  puzzle: Puzzle,
  board: Board,
  strategies: readonly Strategy[] = DEFAULT_STRATEGIES,
): HintResult {
  if (findViolations(puzzle, board).length > 0) return { kind: 'violations' }

  const candidates = candidatesFor(puzzle, board).map((set) => (set ? new Set(set) : null))
  const applied: Elimination[] = []

  search: for (;;) {
    const dead = candidates.flatMap((set, cell) => (set?.size === 0 ? [cell] : []))
    if (dead.length > 0) return { kind: 'dead-end', cells: dead }

    for (const strategy of strategies) {
      const step = strategy.apply(puzzle, board, candidates)
      if (step === null) continue

      if (step.kind === 'placement') {
        return { kind: 'hint', placement: step, leadUp: leadUpFor(step.reads, applied) }
      }

      const removals = removeFrom(candidates, step.removals)
      if (removals.length === 0) continue
      applied.push({ ...step, removals })
      continue search
    }

    return { kind: 'none' }
  }
}

/** Removes what is still there, and says what that was. */
function removeFrom(candidates: (Set<Digit> | null)[], removals: readonly Removal[]): Removal[] {
  const done: Removal[] = []
  for (const { cell, digits } of removals) {
    const set = candidates[cell]
    const removed = digits.filter((digit) => set?.delete(digit) === true)
    if (removed.length > 0) done.push({ cell, digits: removed })
  }
  return done
}

/**
 * The eliminations a placement depends on. One counts if it removed something the
 * placement reads; the cells justifying it are then read in turn, so a chain is
 * followed back. Walking backwards means each elimination can only pull in the ones
 * found before it.
 */
function leadUpFor(reads: readonly Reads[], applied: readonly Elimination[]): Elimination[] {
  const wanted = [...reads]
  const kept: Elimination[] = []
  for (let index = applied.length - 1; index >= 0; index -= 1) {
    const step = applied[index]
    if (step === undefined || !step.removals.some((removal) => isRead(removal, wanted))) continue
    kept.unshift(step)
    wanted.push(...step.justifying.map((cell) => ({ cell })))
  }
  return kept
}

function isRead({ cell, digits }: Removal, reads: readonly Reads[]): boolean {
  return reads.some(
    (read) =>
      read.cell === cell &&
      (read.digits === undefined || digits.some((digit) => read.digits?.includes(digit))),
  )
}
