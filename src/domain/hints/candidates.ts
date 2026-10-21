import { cageSize, cellCount, cellsInCage, touching } from '@/domain/puzzle/grid'
import { isDigit, type Board, type Digit, type Puzzle } from '@/domain/puzzle/types'
import { valueAt } from '@/domain/puzzle/validate'

/**
 * The digits each cell could still take, row-major like the board: `null` for a cell
 * that already shows a digit (or sits in no cage), and a set — possibly empty — for
 * an open one.
 *
 * This is internal bookkeeping for the hint loop. The player never sees it.
 */
export type Candidates = readonly (ReadonlySet<Digit> | null)[]

/**
 * For each open cell: 1..N for its cage, minus the digits already placed in the
 * cage (rule 2), minus the digits in touching cells (rule 3).
 */
export function candidatesFor(puzzle: Puzzle, board: Board): Candidates {
  return Array.from({ length: cellCount(puzzle) }, (_, cell) => {
    const cageId = puzzle.cages[cell]
    if (cageId == null || valueAt(puzzle, board, cell) !== null) return null

    const possible = new Set<Digit>()
    for (let digit = 1; digit <= cageSize(puzzle, cageId); digit += 1) {
      if (isDigit(digit)) possible.add(digit)
    }
    for (const other of [...cellsInCage(puzzle, cageId), ...touching(puzzle, cell)]) {
      const value = valueAt(puzzle, board, other)
      if (value !== null) possible.delete(value)
    }
    return possible
  })
}
