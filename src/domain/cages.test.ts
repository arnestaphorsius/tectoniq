import { describe, expect, it } from 'vite-plus/test'
import {
  DEFAULT_GRID_SIZE,
  emptyLayout,
  MAX_GRID_SIZE,
  MIN_GRID_SIZE,
  SIZE_PRESETS,
  sizeProblem,
  withCells,
} from './cages'
import { cageIds, cageSize, isCageContiguous } from './grid'
import { MAX_CAGE_SIZE, type Puzzle } from './types'
import { validatePuzzle, type PuzzleProblem } from './validate'

/**
 * A 5×5 nobody has drawn on, indexed
 *
 *    0  1  2  3  4
 *    5  6  7  8  9
 *   10 11 12 13 14
 *   15 16 17 18 19
 *   20 21 22 23 24
 */
function grid(): Puzzle {
  return emptyLayout(DEFAULT_GRID_SIZE, DEFAULT_GRID_SIZE)
}

/**
 * The cells sharing `cell`'s cage, ascending, and `[]` if nobody has drawn on it.
 *
 * Cage ids are opaque — nothing renders them and every domain function groups by
 * equality — so tests compare membership and never an id, which leaves the
 * implementation free to renumber. The undrawn guard is not a nicety: without it the
 * id is `null`, and the match below would quietly return every *other* undrawn cell
 * rather than failing.
 */
function cageWith(puzzle: Puzzle, cell: number): number[] {
  const id = puzzle.cages[cell]
  if (id == null) return []
  return puzzle.cages.flatMap((other, index) => (other === id ? [index] : []))
}

/** The cells nobody has drawn on, ascending. */
function undrawn(puzzle: Puzzle): number[] {
  return puzzle.cages.flatMap((id, index) => (id === null ? [index] : []))
}

/** Every problem except the named kind — used to say "unfinished, but not broken". */
function problemsOtherThan(puzzle: Puzzle, kind: PuzzleProblem['kind']): PuzzleProblem[] {
  return validatePuzzle(puzzle).filter((problem) => problem.kind !== kind)
}

/** Every cage in the puzzle as a set of cells, ordered by its lowest cell. */
function allCages(puzzle: Puzzle): number[][] {
  return cageIds(puzzle)
    .map((id) => puzzle.cages.flatMap((other, index) => (other === id ? [index] : [])))
    .sort((a, b) => (a[0] ?? 0) - (b[0] ?? 0))
}

describe('emptyLayout', () => {
  it('leaves every cell out of a cage', () => {
    const puzzle = emptyLayout(4, 3)

    expect(cageIds(puzzle)).toEqual([])
    expect(undrawn(puzzle)).toHaveLength(12)
    for (let cell = 0; cell < 12; cell += 1) {
      expect(cageWith(puzzle, cell)).toEqual([])
    }
  })

  it('is reported as unfinished at 5 by 5 or any offered size', () => {
    const sides = SIZE_PRESETS.map((side): [number, number] => [side, side])
    sides.push([MIN_GRID_SIZE, MAX_GRID_SIZE], [MAX_GRID_SIZE, MIN_GRID_SIZE])

    for (const [width, height] of sides) {
      const puzzle = emptyLayout(width, height)
      // Unfinished, and nothing worse: the grid itself is well formed.
      expect(validatePuzzle(puzzle)).toEqual([
        { kind: 'cell-without-cage', cells: undrawn(puzzle) },
      ])
    }
  })

  it('givens are all null and both arrays are width times height', () => {
    const puzzle = emptyLayout(4, 11)

    expect(puzzle.cages).toHaveLength(44)
    expect(puzzle.givens).toHaveLength(44)
    expect(puzzle.givens.every((given) => given === null)).toBe(true)
  })
})

describe('sizeProblem', () => {
  it('accepts every width and height from 3 to 12', () => {
    for (let width = MIN_GRID_SIZE; width <= MAX_GRID_SIZE; width += 1) {
      for (let height = MIN_GRID_SIZE; height <= MAX_GRID_SIZE; height += 1) {
        expect(sizeProblem(width, height)).toBeNull()
      }
    }
  })

  it('rejects out-of-range, blank and non-integer sizes', () => {
    // Below the range, above it, blank, and a number that is not a whole one.
    expect(sizeProblem(2, 5)).not.toBeNull()
    expect(sizeProblem(5, 2)).not.toBeNull()
    expect(sizeProblem(13, 5)).not.toBeNull()
    expect(sizeProblem(5, 13)).not.toBeNull()
    expect(sizeProblem(null, 5)).not.toBeNull()
    expect(sizeProblem(5, null)).not.toBeNull()
    expect(sizeProblem(Number.NaN, 5)).not.toBeNull()
    expect(sizeProblem(3.5, 5)).not.toBeNull()
    expect(sizeProblem(0, 0)).not.toBeNull()
    expect(sizeProblem(-4, 5)).not.toBeNull()
  })
})

describe('withCells', () => {
  it('draws the first cage on a grid nobody has touched', () => {
    const puzzle = withCells(grid(), [0, 1, 2])

    expect(cageIds(puzzle)).toHaveLength(1)
    expect(cageWith(puzzle, 0)).toEqual([0, 1, 2])
    // The other twenty-two are still nobody's.
    expect(undrawn(puzzle)).toHaveLength(22)
  })

  it('puts the dragged cells in one cage', () => {
    const puzzle = withCells(grid(), [0, 1, 2])

    expect(cageWith(puzzle, 0)).toEqual([0, 1, 2])
    // And nothing else joined it — 3 was not adopted by the cage beside it.
    expect(cageWith(puzzle, 3)).toEqual([])
  })

  it('refuses a sixth cell and keeps the five', () => {
    const puzzle = withCells(grid(), [0, 1, 2, 3, 4, 9, 14])

    expect(cageWith(puzzle, 0)).toEqual([0, 1, 2, 3, 4])
    // The refused cells are left undrawn rather than made cages of their own.
    expect(cageWith(puzzle, 9)).toEqual([])
    expect(cageWith(puzzle, 14)).toEqual([])
  })

  it('refuses a diagonal-only neighbour', () => {
    // 6 touches 0 only at the corner, and cage shape is edge-based.
    const puzzle = withCells(grid(), [0, 6])

    expect(cageWith(puzzle, 0)).toEqual([0])
    expect(cageWith(puzzle, 6)).toEqual([])
  })

  it('measures adjacency against the whole cage so far', () => {
    // 6 is refused, and the drag carries on: 5 shares an edge with 0.
    const puzzle = withCells(grid(), [0, 6, 5])

    expect(cageWith(puzzle, 0)).toEqual([0, 5])
    expect(cageWith(puzzle, 6)).toEqual([])
  })

  it('removes a stolen cell from its previous cage', () => {
    const drawn = withCells(grid(), [0, 1, 2])

    const puzzle = withCells(drawn, [7, 2])

    expect(cageWith(puzzle, 7)).toEqual([2, 7])
    expect(cageWith(puzzle, 0)).toEqual([0, 1])
  })

  it('splits a disconnected remainder into separate cages', () => {
    const drawn = withCells(grid(), [0, 1, 2])

    // Taking the middle cell leaves 0 and 2 with no edge between them.
    const puzzle = withCells(drawn, [6, 1])

    expect(cageWith(puzzle, 6)).toEqual([1, 6])
    expect(cageWith(puzzle, 0)).toEqual([0])
    expect(cageWith(puzzle, 2)).toEqual([2])
  })

  it('a single cell becomes a cage of one', () => {
    const drawn = withCells(grid(), [0, 1, 2])

    const puzzle = withCells(drawn, [1])

    expect(cageWith(puzzle, 1)).toEqual([1])
    expect(cageWith(puzzle, 0)).toEqual([0])
    expect(cageWith(puzzle, 2)).toEqual([2])
  })

  it('never puts an undrawn cell into a cage it was not dragged into', () => {
    // Drawing beside blank cells must not adopt them, and renumbering the ids
    // afterwards must not sweep them into cage zero.
    const drawn = withCells(grid(), [12, 13])

    const puzzle = withCells(drawn, [0, 1])

    expect(undrawn(puzzle)).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24]) // prettier-ignore
    expect(cageWith(puzzle, 0)).toEqual([0, 1])
    expect(cageWith(puzzle, 12)).toEqual([12, 13])
  })
})

describe('invariants', () => {
  /**
   * The editor now opens on a half-built partition, so "validatePuzzle stays empty"
   * is no longer the invariant — an unfinished layout reports `cell-without-cage`
   * until the last cell is drawn. What `withCells` actually guarantees is narrower
   * and worth more: however the pointer wandered, no cage it produces is ever too
   * large or split in two, so being unfinished is the only thing that can be wrong.
   */
  it('leaves a layout unfinished but never broken, through merge, cap, steal, split', () => {
    let puzzle = grid()

    const drags: number[][] = [
      [0, 1, 2], // merge
      [10, 11, 12, 13, 14, 19], // cap — the sixth cell is refused
      [7, 2], // steal, leaving a contiguous remainder
      [6, 1], // steal, splitting the remainder in two
      [16], // isolate a single cell
    ]
    for (const drag of drags) {
      puzzle = withCells(puzzle, drag)

      expect(problemsOtherThan(puzzle, 'cell-without-cage')).toEqual([])
      for (const cageId of cageIds(puzzle)) {
        expect(isCageContiguous(puzzle, cageId)).toBe(true)
        expect(cageSize(puzzle, cageId)).toBeLessThanOrEqual(MAX_CAGE_SIZE)
      }
    }
  })

  it('reports nothing at all once every cell has been drawn into a cage', () => {
    // A 3×2 partitioned by two drags, so no cell is left over.
    let puzzle = emptyLayout(3, 2)
    puzzle = withCells(puzzle, [0, 1, 2])
    puzzle = withCells(puzzle, [3, 4, 5])

    expect(validatePuzzle(puzzle)).toEqual([])
  })

  it('every cage stays contiguous after a steal', () => {
    const drawn = withCells(grid(), [0, 1, 2])

    const puzzle = withCells(drawn, [6, 1])

    for (const cageId of cageIds(puzzle)) {
      expect(isCageContiguous(puzzle, cageId)).toBe(true)
    }
    // The split really happened: three cages where the drawn one used to be.
    expect(allCages(puzzle)).toContainEqual([0])
    expect(allCages(puzzle)).toContainEqual([1, 6])
    expect(allCages(puzzle)).toContainEqual([2])
  })
})
