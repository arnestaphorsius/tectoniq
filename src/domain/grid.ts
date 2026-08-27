import type { CageId, Coord, Puzzle } from './types'

/** Total cells in the grid. */
export function cellCount(puzzle: Puzzle): number {
  return puzzle.width * puzzle.height
}

export function indexOf(puzzle: Puzzle, { row, col }: Coord): number {
  return row * puzzle.width + col
}

export function coordOf(puzzle: Puzzle, index: number): Coord {
  return { row: Math.floor(index / puzzle.width), col: index % puzzle.width }
}

export function inBounds(puzzle: Puzzle, { row, col }: Coord): boolean {
  return row >= 0 && row < puzzle.height && col >= 0 && col < puzzle.width
}

/** All eight directions — a king's move. */
const TOUCHING_OFFSETS: readonly (readonly [number, number])[] = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1],
]

/** The four edge-sharing directions. */
const ADJACENT_OFFSETS: readonly (readonly [number, number])[] = [
  [-1, 0],
  [0, -1],
  [0, 1],
  [1, 0],
]

function step(
  puzzle: Puzzle,
  { row, col }: Coord,
  offsets: readonly (readonly [number, number])[],
): number[] {
  const result: number[] = []
  for (const [dRow, dCol] of offsets) {
    const coord = { row: row + dRow, col: col + dCol }
    if (inBounds(puzzle, coord)) result.push(indexOf(puzzle, coord))
  }
  return result
}

/**
 * Indices of the up-to-eight cells touching `index`, diagonals included.
 * This is the neighbourhood rule 3 operates over.
 */
export function touching(puzzle: Puzzle, index: number): number[] {
  return step(puzzle, coordOf(puzzle, index), TOUCHING_OFFSETS)
}

/**
 * Indices of the up-to-four cells sharing an edge with `index`.
 * Cage contiguity is defined over these, not over diagonals.
 */
export function adjacent(puzzle: Puzzle, index: number): number[] {
  return step(puzzle, coordOf(puzzle, index), ADJACENT_OFFSETS)
}

/** Every distinct cage id present in the grid, ascending. */
export function cageIds(puzzle: Puzzle): CageId[] {
  return [...new Set(puzzle.cages)].sort((a, b) => a - b)
}

/** Cell indices belonging to `cageId`, ascending. */
export function cellsInCage(puzzle: Puzzle, cageId: CageId): number[] {
  const cells: number[] = []
  puzzle.cages.forEach((id, index) => {
    if (id === cageId) cells.push(index)
  })
  return cells
}

/** How many cells `cageId` spans — which is also its highest legal digit. */
export function cageSize(puzzle: Puzzle, cageId: CageId): number {
  return cellsInCage(puzzle, cageId).length
}

/** The cage containing `index`, or undefined if the index is out of range. */
export function cageAt(puzzle: Puzzle, index: number): CageId | undefined {
  return puzzle.cages[index]
}

/**
 * Whether every cell of `cageId` is reachable from every other by edge-sharing
 * steps that stay inside the cage. A cage split into islands is not a cage.
 */
export function isCageContiguous(puzzle: Puzzle, cageId: CageId): boolean {
  const cells = cellsInCage(puzzle, cageId)
  const first = cells[0]
  if (first === undefined) return true

  const seen = new Set<number>([first])
  const queue = [first]
  while (queue.length > 0) {
    const current = queue.pop() as number
    for (const neighbour of adjacent(puzzle, current)) {
      if (puzzle.cages[neighbour] === cageId && !seen.has(neighbour)) {
        seen.add(neighbour)
        queue.push(neighbour)
      }
    }
  }
  return seen.size === cells.length
}

/**
 * Which sides of a cell sit on a cage boundary.
 *
 * The keys are the grid's edge classes, so both grids can bind the result straight
 * to `:class`. Keeping the shape here rather than in a component is what makes this
 * the one place cage borders are derived from `puzzle.cages` — the play grid and the
 * editor draw the same boundaries because they ask the same function.
 */
export type CageEdges = Readonly<
  Record<'edge-top' | 'edge-right' | 'edge-bottom' | 'edge-left', boolean>
>

/**
 * A boundary is any side where the neighbour sits in a different cage, or where the
 * grid ends. Deriving it per cell keeps this independent of cage shape.
 */
export function cageEdges(puzzle: Puzzle, cell: number): CageEdges {
  const { row, col } = coordOf(puzzle, cell)
  const own = cageAt(puzzle, cell)
  const differs = (dRow: number, dCol: number): boolean => {
    const next = { row: row + dRow, col: col + dCol }
    if (!inBounds(puzzle, next)) return true
    return cageAt(puzzle, indexOf(puzzle, next)) !== own
  }
  return {
    'edge-top': differs(-1, 0),
    'edge-right': differs(0, 1),
    'edge-bottom': differs(1, 0),
    'edge-left': differs(0, -1),
  }
}
