import type { Candidates } from './candidates'
import { cageIds, cageSize, cellCount, cellsInCage, touching } from './grid'
import { isDigit, type Board, type Digit, type Puzzle } from './types'
import { valueAt } from './validate'

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
 * The explanation is written to be shown before the digit is, so it never names it.
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
 * Digits ruled out of cells without placing anything. None ship yet; the loop takes
 * them so that strategies such as naked pairs can be added without changing it. An
 * elimination's reasoning reads the whole candidate set of its justifying cells.
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

const ruleCage = (size: number) =>
  size === 1
    ? 'A cage of a single cell holds just one digit: the smallest there is.'
    : `A cage of ${size} cells holds each digit from 1 to ${size} exactly once.`
const RULE_TOUCH = 'Equal digits may not touch, not even diagonally.'

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
        explanation:
          cells.length === 1
            ? `${ruleCage(1)} This cell is a cage on its own, so there is nothing else it could be.`
            : `${ruleCage(cells.length)} Every other cell of this cage is filled, so this cell takes the one digit still missing.`,
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
          explanation: `${ruleCage(cells.length)} ${RULE_TOUCH} One digit this cage still needs is ruled out of every other open cell by a highlighted copy of it nearby, so this is the only place left for it.`,
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
        explanation: `${RULE_TOUCH} This cell's cage only allows 1 to ${size}, and the highlighted digits around it already use every one of those but one.`,
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
        explanation:
          `This cell's cage only allows 1 to ${size}. A digit can't repeat within its cage, and ${RULE_TOUCH.toLowerCase()} ` +
          (byEarlierSteps
            ? 'The highlighted digits and the steps before this one rule out every option but one.'
            : 'Between them, the highlighted digits rule out every option but one.'),
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
          explanation: `${ruleCage(cells.length)} One digit this cage still needs has been ruled out of every other open cell in it, highlighted, so it can only go here.`,
          reads: others.map((cell) => ({ cell, digits: [digit] })),
        })
      }
    }
    return lowest(found)
  },
}
