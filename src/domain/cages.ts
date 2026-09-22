import { adjacent, cageIds, cellCount, cellsInCage } from './grid'
import { MAX_CAGE_SIZE, type CageId, type Digit, type Puzzle } from './types'

/**
 * Cage drawing, as pure arithmetic over a `Puzzle`.
 *
 * The editor does hold a half-built partition — it opens on one, since a grid
 * nobody has drawn on is exactly that. What stays invariant is narrower and more
 * useful: every cage these functions produce is contiguous and at most five cells,
 * however the pointer wandered. So the only defect they can leave behind is a cell
 * nobody has drawn on yet, which is precisely the thing the editor asks about.
 */

/** The smallest and largest side the editor accepts, inclusive. */
export const MIN_GRID_SIZE = 3
export const MAX_GRID_SIZE = 12

/** The square sizes offered as one-click presets. */
export const SIZE_PRESETS: readonly number[] = [5, 7, 9]

/** The side the editor opens on, before anyone chooses a size. */
export const DEFAULT_GRID_SIZE = 5

/**
 * Why a requested size was refused.
 *
 * Singular, unlike `validatePuzzle`'s list, because the editor shows one message
 * stating the rule rather than one message per bad field — knowing that the width
 * is also out of range adds nothing once the reader has been told the range.
 */
export type SizeProblem =
  | { readonly kind: 'missing'; readonly field: 'width' | 'height' }
  | { readonly kind: 'not-a-whole-number'; readonly field: 'width' | 'height' }
  | {
      readonly kind: 'out-of-range'
      readonly field: 'width' | 'height'
      readonly value: number
    }

/** `null` when the size is usable. A blank field arrives here as `null`. */
export function sizeProblem(width: number | null, height: number | null): SizeProblem | null {
  return sideProblem('width', width) ?? sideProblem('height', height)
}

function sideProblem(field: 'width' | 'height', value: number | null): SizeProblem | null {
  if (value === null || Number.isNaN(value)) return { kind: 'missing', field }
  if (!Number.isInteger(value)) return { kind: 'not-a-whole-number', field }
  if (value < MIN_GRID_SIZE || value > MAX_GRID_SIZE) return { kind: 'out-of-range', field, value }
  return null
}

/**
 * A grid nobody has drawn on: every cell belongs to no cage at all.
 *
 * The editor opens here rather than on a grid of one-cell cages. Cages of one are
 * legal Tectonic and such a grid passes every structural check, but rule 3 forbids
 * two equal digits touching and a one-cell cage admits only the digit 1 — so it is
 * never a puzzle anyone can solve. Offering it as the starting point invites the
 * reader to believe the grid is already finished.
 */
export function emptyLayout(width: number, height: number): Puzzle {
  const count = width * height
  return {
    width,
    height,
    cages: Array.from({ length: count }, (): CageId | null => null),
    givens: Array.from({ length: count }, (): Digit | null => null),
  }
}

/**
 * The puzzle with the cells of `path` collected into one cage.
 *
 * `path` is the sequence a drag visited, first cell first, and it is filtered here
 * rather than by the caller: a cell already collected, a cell beyond the five-cell
 * cap, and a cell sharing no edge with the cage so far are all skipped, and none of
 * them ends the collection. That makes the function total for any path, which is
 * what lets the editor recompute from an untouched snapshot on every pointer move
 * instead of accumulating state it could get wrong.
 *
 * Cells taken from other cages leave those cages behind: whatever is left of one is
 * split into its connected pieces, each becoming a cage in its own right, so no
 * non-contiguous cage can be produced.
 */
export function withCells(puzzle: Puzzle, path: readonly number[]): Puzzle {
  const drawn = collect(puzzle, path)
  if (drawn.length === 0) return puzzle

  const taken = new Set(drawn)
  const groups: number[][] = [drawn]
  // `cageIds` leaves out the undrawn cells, so they are never gathered into a group
  // and `regrouped` below leaves them as they are. That is the whole mechanism by
  // which drawing one cage does not quietly adopt the blank cells around it.
  for (const cageId of cageIds(puzzle)) {
    const left = cellsInCage(puzzle, cageId).filter((cell) => !taken.has(cell))
    groups.push(...pieces(puzzle, left))
  }
  return regrouped(puzzle, groups)
}

/** The cells of `path` a cage may actually take, in the order it takes them. */
function collect(puzzle: Puzzle, path: readonly number[]): number[] {
  const drawn: number[] = []
  const inCage = new Set<number>()
  for (const cell of path) {
    if (drawn.length >= MAX_CAGE_SIZE) break
    if (cell < 0 || cell >= cellCount(puzzle) || inCage.has(cell)) continue
    // Adjacency is to the cage so far, not to the cell added last, so a pointer that
    // wanders across a diagonal and comes back carries on where it left off.
    const touches = drawn.length === 0 || adjacent(puzzle, cell).some((n) => inCage.has(n))
    if (!touches) continue
    drawn.push(cell)
    inCage.add(cell)
  }
  return drawn
}

/** `cells` split into edge-connected groups. */
function pieces(puzzle: Puzzle, cells: readonly number[]): number[][] {
  const left = new Set(cells)
  const found: number[][] = []
  for (const start of cells) {
    if (!left.has(start)) continue
    const piece: number[] = []
    const queue = [start]
    left.delete(start)
    while (queue.length > 0) {
      const current = queue.pop() as number
      piece.push(current)
      for (const neighbour of adjacent(puzzle, current)) {
        if (left.delete(neighbour)) queue.push(neighbour)
      }
    }
    found.push(piece)
  }
  return found
}

/**
 * The puzzle with `groups` as its cages, renumbered from zero in reading order.
 *
 * Ids are renumbered on every edit on purpose. Nothing displays a cage id and every
 * domain function groups by equality alone, so keeping ids stable would buy nothing
 * and cost a growing pile of vacated numbers.
 */
function regrouped(puzzle: Puzzle, groups: readonly (readonly number[])[]): Puzzle {
  const ordered = groups.filter((group) => group.length > 0).sort((a, b) => first(a) - first(b))
  const cages = [...puzzle.cages]
  ordered.forEach((group, cageId) => {
    for (const cell of group) cages[cell] = cageId
  })
  return { ...puzzle, cages }
}

/** The lowest cell index in a group, which is how groups are ordered. */
function first(group: readonly number[]): number {
  return group.reduce((lowest, cell) => (cell < lowest ? cell : lowest), Number.POSITIVE_INFINITY)
}
