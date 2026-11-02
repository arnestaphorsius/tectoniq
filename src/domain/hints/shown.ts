import type { Candidates } from './candidates'
import type { Elimination, Placement } from '@/domain/hints/strategies/step'
import type { Digit } from '@/domain/puzzle/types'

/**
 * One cell's candidates as a step of a hint shows them to the player: `digits` are
 * still possible, and the step reasons from them; `struck` were ruled out by this
 * step or one before it, and are shown crossed out. Both ascending.
 */
export interface ShownCandidates {
  readonly cell: number
  readonly digits: readonly Digit[]
  readonly struck: readonly Digit[]
}

/**
 * What each step of a hint shows of the candidates: one list per lead-up elimination,
 * in order, then the placement's. A step shows what its reasoning reads, so that the
 * case it makes is there on the grid:
 *
 * - An elimination shows its justifying cells' candidates, which it reads whole, and
 *   crosses out the digits it removes in the cells that lose them.
 * - A placement crosses out the digits the steps before it removed from the cells it
 *   reads. It never shows what is left in its target, which would give the digit
 *   away before the player fills it in. An elimination can show the target as one of
 *   its pair, but only with the digits its own explanation names.
 *
 * Wherever a step shows a cell, the digits earlier steps removed from it stay crossed
 * out. A cell appears at most once per step, because no step removes from the cells
 * that justify it.
 *
 * `initial` is the board's candidates, before any elimination. A justifying cell is
 * drawn as it stood when its step was found: `initial`, less what earlier lead-up
 * steps took from it. Nothing else took anything, because `leadUpFor` keeps every
 * earlier elimination that removed from a justifying cell.
 */
export function shownCandidates(
  initial: Candidates,
  leadUp: readonly Elimination[],
  placement: Placement,
): ShownCandidates[][] {
  const removed = new Map<number, Set<Digit>>()
  const removedFrom = (cell: number) => removed.get(cell) ?? new Set<Digit>()
  const steps: ShownCandidates[][] = []

  for (const step of leadUp) {
    const justifying = step.justifying.map((cell) => {
      const struck = removedFrom(cell)
      const digits = [...(initial[cell] ?? [])].filter((digit) => !struck.has(digit))
      return shown(cell, digits, struck)
    })
    const losing = step.removals.map(({ cell, digits }) =>
      shown(cell, [], [...removedFrom(cell), ...digits]),
    )
    steps.push([...justifying, ...losing])

    for (const { cell, digits } of step.removals) {
      removed.set(cell, new Set([...removedFrom(cell), ...digits]))
    }
  }

  const reads = placement.reads.flatMap(({ cell, digits }) => {
    const struck = [...removedFrom(cell)].filter(
      (digit) => digits === undefined || digits.includes(digit),
    )
    return struck.length > 0 ? [shown(cell, [], struck)] : []
  })
  steps.push(reads)
  return steps
}

function shown(cell: number, digits: Iterable<Digit>, struck: Iterable<Digit>): ShownCandidates {
  return { cell, digits: ascending(digits), struck: ascending(struck) }
}

const ascending = (digits: Iterable<Digit>) => [...digits].sort((a, b) => a - b)
