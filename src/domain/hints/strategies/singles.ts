import { EXPLANATIONS } from '@/domain/hints/copy'
import { cageIds, cageSize, cellCount, cellsInCage, touching } from '@/domain/puzzle/grid'
import { isDigit, type Board, type Digit, type Puzzle } from '@/domain/puzzle/types'
import { valueAt } from '@/domain/puzzle/validate'
import type { Placement, Strategy } from './step'

function digitsUpTo(size: number): Digit[] {
  const digits: Digit[] = []
  for (let digit = 1; digit <= size; digit += 1) if (isDigit(digit)) digits.push(digit)
  return digits
}

/** Open cells of a cage, ascending. */
function openCells(puzzle: Puzzle, board: Board, cells: readonly number[]): number[] {
  return cells.filter((cell) => valueAt(puzzle, board, cell) === null)
}

/** Cells touching `cell` that show `digit`. */
function touchingWith(puzzle: Puzzle, board: Board, cell: number, digit: Digit): number[] {
  return touching(puzzle, cell).filter((other) => valueAt(puzzle, board, other) === digit)
}

/** Cells touching `cell` that show a digit `filter` accepts. */
function touchingPlaced(
  puzzle: Puzzle,
  board: Board,
  cell: number,
  filter: (digit: Digit) => boolean,
): number[] {
  return touching(puzzle, cell).filter((other) => {
    const value = valueAt(puzzle, board, other)
    return value !== null && filter(value)
  })
}

const ascending = (cells: Iterable<number>) => [...new Set(cells)].sort((a, b) => a - b)

/** The tie-break within one strategy: the lowest target cell wins, then the lowest digit. */
function lowest(placements: readonly Placement[]): Placement | null {
  let best: Placement | null = null
  for (const placement of placements) {
    if (
      best === null ||
      placement.cell < best.cell ||
      (placement.cell === best.cell && placement.digit < best.digit)
    ) {
      best = placement
    }
  }
  return best
}

/** S1: a cage with one open cell takes the one digit it is missing. */
export const FULL_BLOCK: Strategy = {
  name: 'Full Block',
  apply(puzzle, board) {
    const found: Placement[] = []
    for (const cageId of cageIds(puzzle)) {
      const cells = cellsInCage(puzzle, cageId)
      const open = openCells(puzzle, board, cells)
      const target = open[0]
      if (open.length !== 1 || target === undefined) continue

      const placed = new Set(cells.map((cell) => valueAt(puzzle, board, cell)))
      const missing = digitsUpTo(cells.length).filter((digit) => !placed.has(digit))
      const digit = missing[0]
      if (missing.length !== 1 || digit === undefined) continue

      found.push({
        kind: 'placement',
        strategy: 'Full Block',
        cell: target,
        digit,
        justifying: cells.filter((cell) => cell !== target),
        explanation: EXPLANATIONS.fullBlock(cells.length),
        reads: [],
      })
    }
    return lowest(found)
  },
}

/**
 * S2: a digit the cage still needs is ruled out of every open cell but one by the
 * digits on the board — which, for a digit not yet in the cage, means by touching
 * cells.
 */
export const UNIQUE: Strategy = {
  name: 'Unique',
  apply(puzzle, board) {
    const found: Placement[] = []
    for (const cageId of cageIds(puzzle)) {
      const cells = cellsInCage(puzzle, cageId)
      const open = openCells(puzzle, board, cells)
      const placed = new Set(cells.map((cell) => valueAt(puzzle, board, cell)))

      for (const digit of digitsUpTo(cells.length)) {
        if (placed.has(digit)) continue
        const fits = open.filter((cell) => touchingWith(puzzle, board, cell, digit).length === 0)
        const target = fits[0]
        if (fits.length !== 1 || target === undefined) continue

        const others = open.filter((cell) => cell !== target)
        found.push({
          kind: 'placement',
          strategy: 'Unique',
          cell: target,
          digit,
          justifying: ascending(others.flatMap((cell) => touchingWith(puzzle, board, cell, digit))),
          explanation: EXPLANATIONS.unique(cells.length),
          reads: [],
        })
      }
    }
    return lowest(found)
  },
}

/** S3: the touching digits alone, without the cage's, leave one digit for the cell. */
export const CROWN: Strategy = {
  name: 'Crown',
  apply(puzzle, board) {
    const found: Placement[] = []
    for (let cell = 0; cell < cellCount(puzzle); cell += 1) {
      const cageId = puzzle.cages[cell]
      if (cageId == null || valueAt(puzzle, board, cell) !== null) continue

      const size = cageSize(puzzle, cageId)
      const around = new Set(touching(puzzle, cell).map((other) => valueAt(puzzle, board, other)))
      const left = digitsUpTo(size).filter((digit) => !around.has(digit))
      const digit = left[0]
      if (left.length !== 1 || digit === undefined) continue

      found.push({
        kind: 'placement',
        strategy: 'Crown',
        cell,
        digit,
        justifying: touchingPlaced(puzzle, board, cell, (value) => value <= size),
        explanation: EXPLANATIONS.crown(size),
        reads: [],
      })
    }
    return lowest(found)
  },
}

/** S4: an open cell with a single candidate left. */
export const NAKED_SINGLE: Strategy = {
  name: 'Naked Single',
  apply(puzzle, board, candidates) {
    const found: Placement[] = []
    candidates.forEach((set, cell) => {
      const cageId = puzzle.cages[cell]
      const digit = set?.values().next().value
      if (set?.size !== 1 || digit === undefined || cageId == null) return

      const size = cageSize(puzzle, cageId)
      const inCage = cellsInCage(puzzle, cageId).filter(
        (other) => other !== cell && valueAt(puzzle, board, other) !== null,
      )
      const around = touchingPlaced(
        puzzle,
        board,
        cell,
        (value) => value <= size && value !== digit,
      )
      const ruledOut = new Set([...inCage, ...around].map((other) => valueAt(puzzle, board, other)))
      // Anything the board alone does not rule out was removed by an earlier step.
      const byEarlierSteps = digitsUpTo(size).some(
        (other) => other !== digit && !ruledOut.has(other),
      )

      found.push({
        kind: 'placement',
        strategy: 'Naked Single',
        cell,
        digit,
        justifying: ascending([...inCage, ...around]),
        explanation: EXPLANATIONS.nakedSingle(size, byEarlierSteps),
        reads: [{ cell }],
      })
    })
    return lowest(found)
  },
}

/** S5: within a cage, a digit still needed is a candidate in only one open cell. */
export const HIDDEN_SINGLE: Strategy = {
  name: 'Hidden Single',
  apply(puzzle, board, candidates) {
    const found: Placement[] = []
    for (const cageId of cageIds(puzzle)) {
      const cells = cellsInCage(puzzle, cageId)
      const open = openCells(puzzle, board, cells)
      const placed = new Set(cells.map((cell) => valueAt(puzzle, board, cell)))

      for (const digit of digitsUpTo(cells.length)) {
        if (placed.has(digit)) continue
        const fits = open.filter((cell) => candidates[cell]?.has(digit) === true)
        const target = fits[0]
        if (fits.length !== 1 || target === undefined) continue

        const others = open.filter((cell) => cell !== target)
        found.push({
          kind: 'placement',
          strategy: 'Hidden Single',
          cell: target,
          digit,
          justifying: ascending([
            ...others,
            ...others.flatMap((cell) => touchingWith(puzzle, board, cell, digit)),
          ]),
          explanation: EXPLANATIONS.hiddenSingle(cells.length),
          reads: others.map((cell) => ({ cell, digits: [digit] })),
        })
      }
    }
    return lowest(found)
  },
}
