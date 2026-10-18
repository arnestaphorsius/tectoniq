import type { Candidates } from './candidates'
import { cellCount, cellsInCage, touching } from './grid'
import { EXPLANATIONS } from './hintCopy'
import type { Removal, Strategy } from './strategies'
import type { Digit, Puzzle } from './types'

type Pair = readonly [number, number]

interface PairRule {
  readonly name: string
  /** Whether two open cells with the same two candidates count as a pair at all. */
  related(puzzle: Puzzle, low: number, high: number): boolean
  /** The cells that cannot hold either of the pair's digits. */
  losing(puzzle: Puzzle, pair: Pair): readonly number[]
  explain(puzzle: Puzzle, pair: Pair, digits: readonly [Digit, Digit], losing: number): string
}

/**
 * Two cells that must hold two digits between them rule both digits out of some
 * other cells. Pairs are tried by lower cell, then by higher cell, and one that would
 * remove nothing is passed over, so it cannot hide a later one that would.
 */
function pairStrategy(rule: PairRule): Strategy {
  return {
    name: rule.name,
    apply(puzzle, _board, candidates) {
      for (let low = 0; low < cellCount(puzzle); low += 1) {
        const digits = twoOf(candidates[low])
        if (digits === null) continue

        for (let high = low + 1; high < cellCount(puzzle); high += 1) {
          if (!sameTwo(digits, candidates[high]) || !rule.related(puzzle, low, high)) continue

          const pair: Pair = [low, high]
          const removals = removalsFrom(candidates, rule.losing(puzzle, pair), digits)
          if (removals.length === 0) continue
          return {
            kind: 'elimination',
            strategy: rule.name,
            removals,
            justifying: pair,
            explanation: rule.explain(puzzle, pair, digits, removals.length),
          }
        }
      }
      return null
    },
  }
}

/** A candidate set of exactly two digits, ascending, or `null` for any other. */
function twoOf(set: ReadonlySet<Digit> | null | undefined): [Digit, Digit] | null {
  if (set?.size !== 2) return null
  const [a, b] = [...set].sort((x, y) => x - y)
  return a === undefined || b === undefined ? null : [a, b]
}

function sameTwo([a, b]: readonly [Digit, Digit], set: ReadonlySet<Digit> | null | undefined) {
  return set?.size === 2 && set.has(a) && set.has(b)
}

/** What `cells` would lose of `digits`. Cells that would lose nothing are left out. */
function removalsFrom(
  candidates: Candidates,
  cells: readonly number[],
  digits: readonly Digit[],
): Removal[] {
  return cells.flatMap((cell) => {
    const lost = digits.filter((digit) => candidates[cell]?.has(digit) === true)
    return lost.length > 0 ? [{ cell, digits: lost }] : []
  })
}

/** The other cells of the pair's cage. */
function restOfCage(puzzle: Puzzle, [low, high]: Pair): number[] {
  const cageId = puzzle.cages[low]
  if (cageId == null) return []
  return cellsInCage(puzzle, cageId).filter((cell) => cell !== low && cell !== high)
}

/**
 * Two open cells of one cage with the same two candidates hold both digits between
 * them, because each digit appears once per cage. The cage's other cells lose both.
 */
export const NAKED_PAIR = pairStrategy({
  name: 'Naked Pair',
  related: (puzzle, low, high) => puzzle.cages[low] === puzzle.cages[high],
  losing: restOfCage,
  explain: (puzzle, pair, digits, losing) =>
    EXPLANATIONS.nakedPair(restOfCage(puzzle, pair).length + 2, digits, losing),
})

/**
 * Two touching open cells with the same two candidates cannot be equal, so they hold
 * both digits between them, whatever their cages. Any cell touching both would touch
 * an equal digit, so it loses both.
 */
export const TOUCHING_PAIR = pairStrategy({
  name: 'Touching Pair',
  related: (puzzle, low, high) => touching(puzzle, low).includes(high),
  losing: (puzzle, [low, high]) => {
    const nearHigh = touching(puzzle, high)
    return touching(puzzle, low).filter((cell) => nearHigh.includes(cell))
  },
  explain: (_puzzle, _pair, digits, losing) => EXPLANATIONS.touchingPair(digits, losing),
})
