import { describe, expect, it } from 'vite-plus/test'
import {
  DEFAULT_GRID_SIZE,
  MAX_GRID_SIZE,
  MIN_GRID_SIZE,
  oneCellPerCage,
  SIZE_PRESETS,
  sizeProblem,
  withCells,
} from './cages'
import { cageIds, isCageContiguous } from './grid'
import type { Puzzle } from './types'
import { validatePuzzle } from './validate'

/**
 * A 5×5 of one-cell cages, indexed
 *
 *    0  1  2  3  4
 *    5  6  7  8  9
 *   10 11 12 13 14
 *   15 16 17 18 19
 *   20 21 22 23 24
 */
function grid(): Puzzle {
  return oneCellPerCage(DEFAULT_GRID_SIZE, DEFAULT_GRID_SIZE)
}

/**
 * The cells sharing `cell`'s cage, ascending. Cage ids are opaque — nothing renders
 * them and every domain function groups by equality — so tests compare membership
 * and never an id, which leaves the implementation free to renumber.
 */
function cageWith(puzzle: Puzzle, cell: number): number[] {
  const id = puzzle.cages[cell]
  return puzzle.cages.flatMap((other, index) => (other === id ? [index] : []))
}

/** Every cage in the puzzle as a set of cells, ordered by its lowest cell. */
function allCages(puzzle: Puzzle): number[][] {
  return cageIds(puzzle)
    .map((id) => puzzle.cages.flatMap((other, index) => (other === id ? [index] : [])))
    .sort((a, b) => (a[0] ?? 0) - (b[0] ?? 0))
}

describe('oneCellPerCage', () => {
  it('gives every cell a cage of its own', () => {
    const puzzle = oneCellPerCage(4, 3)

    expect(cageIds(puzzle)).toHaveLength(12)
    for (let cell = 0; cell < 12; cell += 1) {
      expect(cageWith(puzzle, cell)).toEqual([cell])
    }
  })

  it('validatePuzzle finds no problem at 5 by 5 or any offered size', () => {
    const sides = SIZE_PRESETS.map((side): [number, number] => [side, side])
    sides.push([MIN_GRID_SIZE, MAX_GRID_SIZE], [MAX_GRID_SIZE, MIN_GRID_SIZE])

    for (const [width, height] of sides) {
      expect(validatePuzzle(oneCellPerCage(width, height))).toEqual([])
    }
  })

  it('givens are all null and both arrays are width times height', () => {
    const puzzle = oneCellPerCage(4, 11)

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
  it('puts the dragged cells in one cage', () => {
    const puzzle = withCells(grid(), [0, 1, 2])

    expect(cageWith(puzzle, 0)).toEqual([0, 1, 2])
    // And nothing else joined it.
    expect(cageWith(puzzle, 3)).toEqual([3])
  })

  it('refuses a sixth cell and keeps the five', () => {
    const puzzle = withCells(grid(), [0, 1, 2, 3, 4, 9, 14])

    expect(cageWith(puzzle, 0)).toEqual([0, 1, 2, 3, 4])
    expect(cageWith(puzzle, 9)).toEqual([9])
    expect(cageWith(puzzle, 14)).toEqual([14])
  })

  it('refuses a diagonal-only neighbour', () => {
    // 6 touches 0 only at the corner, and cage shape is edge-based.
    const puzzle = withCells(grid(), [0, 6])

    expect(cageWith(puzzle, 0)).toEqual([0])
    expect(cageWith(puzzle, 6)).toEqual([6])
  })

  it('measures adjacency against the whole cage so far', () => {
    // 6 is refused, and the drag carries on: 5 shares an edge with 0.
    const puzzle = withCells(grid(), [0, 6, 5])

    expect(cageWith(puzzle, 0)).toEqual([0, 5])
    expect(cageWith(puzzle, 6)).toEqual([6])
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
})

describe('invariants', () => {
  it('validatePuzzle stays empty through merge, cap, steal, split, resize', () => {
    let puzzle = grid()
    expect(validatePuzzle(puzzle)).toEqual([])

    const drags: number[][] = [
      [0, 1, 2], // merge
      [10, 11, 12, 13, 14, 19], // cap — the sixth cell is refused
      [7, 2], // steal, leaving a contiguous remainder
      [6, 1], // steal, splitting the remainder in two
      [16], // isolate a single cell
    ]
    for (const drag of drags) {
      puzzle = withCells(puzzle, drag)
      expect(validatePuzzle(puzzle)).toEqual([])
    }

    puzzle = oneCellPerCage(9, 9)
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
