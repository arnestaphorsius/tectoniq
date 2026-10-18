import { describe, expect, it } from 'vite-plus/test'
import { candidatesFor, type Candidates } from './candidates'
import { cellCount } from './grid'
import { F_STUCK } from './hintFixtures'
import { NAKED_PAIR, TOUCHING_PAIR } from './nakedPairs'
import { SAMPLE_PUZZLE } from './samplePuzzle'
import type { Elimination, Step, Strategy } from './strategies'
import { emptyBoard, type Digit } from './types'

/*
 * Most maps here are written by hand on the sample's cage layout, with every cell
 * not listed treated as filled. The strategies read only the cages and the map.
 *
 *    0  1  2  3      0 0 1 1
 *    4  5  6  7      0 0 1 1
 *    8  9 10 11      2 2 3 1
 *   12 13 14 15      2 2 3 3
 *   16 17 18 19      2 4 3 3
 */

/** A candidate map with `open` as the only open cells. */
function map(open: Readonly<Record<number, readonly Digit[]>>): Candidates {
  return Array.from({ length: cellCount(SAMPLE_PUZZLE) }, (_, cell) => {
    const digits = open[cell]
    return digits ? new Set(digits) : null
  })
}

function run(strategy: Strategy, candidates: Candidates): Step | null {
  return strategy.apply(SAMPLE_PUZZLE, emptyBoard(SAMPLE_PUZZLE), candidates)
}

function elimination(step: Step | null): Elimination {
  if (step?.kind !== 'elimination')
    throw new Error(`expected an elimination, got ${step?.kind ?? 'nothing'}`)
  return step
}

const touchedCells = (step: Elimination) => step.removals.map((removal) => removal.cell)

describe('Naked Pairs A', () => {
  // Cage 1 is cells 2, 3, 6, 7 and 11. Cell 1, in cage 0, has the same pair.
  const cage = map({ 1: [1, 2], 2: [1, 2], 3: [1, 2], 6: [1, 2, 3], 7: [2, 4], 11: [3, 5] })

  it("removes the pair's digits from the rest of the cage", () => {
    const step = elimination(run(NAKED_PAIR, cage))

    expect(step.strategy).toBe('Naked Pair')
    expect(step.justifying).toEqual([2, 3])
    expect(step.removals).toEqual([
      { cell: 6, digits: [1, 2] },
      { cell: 7, digits: [2] },
    ])
  })

  it('leaves the pair and cells outside the cage untouched', () => {
    const touched = touchedCells(elimination(run(NAKED_PAIR, cage)))

    expect(touched).not.toContain(2)
    expect(touched).not.toContain(3)
    expect(touched).not.toContain(1)
    expect(touched).not.toContain(11)
  })

  it('explains the pair by the cage rule', () => {
    // 3 and 4, so the digits cannot be confused with the rule's "1 to 5".
    const { explanation } = elimination(run(NAKED_PAIR, map({ 2: [3, 4], 3: [3, 4], 6: [3, 5] })))

    expect(explanation).toMatch(/\b3\b/)
    expect(explanation).toMatch(/\b4\b/)
    expect(explanation).toMatch(/cage of 5 cells holds each digit from 1 to 5 exactly once/i)
    expect(explanation).not.toMatch(/rule\s*\d/i)
  })

  it('does not fire when nothing would be removed', () => {
    // The sample's stuck state: 8 and 9 are {1,2}, and the rest of cage 2 is filled.
    expect(run(NAKED_PAIR, candidatesFor(SAMPLE_PUZZLE, F_STUCK))).toBeNull()
  })

  it('does not fire on unequal two-candidate sets', () => {
    expect(run(NAKED_PAIR, map({ 2: [1, 2], 3: [1, 3], 6: [1, 2, 3] }))).toBeNull()
  })

  it('does not fire on equal sets of other sizes', () => {
    expect(run(NAKED_PAIR, map({ 2: [1, 2, 3], 3: [1, 2, 3], 6: [1, 2, 3, 4] }))).toBeNull()
    expect(run(NAKED_PAIR, map({ 2: [1], 3: [1], 6: [1, 2] }))).toBeNull()
  })

  it('does not fire on a pair split across cages', () => {
    // 5 is in cage 0, 6 in cage 1; each cage has another cell holding 1 or 2.
    expect(run(NAKED_PAIR, map({ 4: [1, 2, 3], 5: [1, 2], 6: [1, 2], 7: [1, 2, 4] }))).toBeNull()
  })

  it('reports the lowest-indexed pair that removes something', () => {
    // Pairs at 2+3 (cage 1) and 8+9 (cage 2).
    const two = map({ 2: [1, 2], 3: [1, 2], 6: [1, 2, 3], 8: [3, 4], 9: [3, 4], 12: [3, 4, 5] })
    expect(elimination(run(NAKED_PAIR, two)).justifying).toEqual([2, 3])

    // 8+9 and 8+12 share their lower cell.
    const shared = map({ 8: [1, 2], 9: [1, 2], 12: [1, 2], 13: [1, 2, 3], 16: [1, 3] })
    expect(elimination(run(NAKED_PAIR, shared)).justifying).toEqual([8, 9])

    // 0+1 would remove nothing from cage 0; 8+9 removes 1 from 12.
    const later = map({
      0: [1, 2],
      1: [1, 2],
      4: [3, 4],
      5: [3, 4],
      8: [1, 2],
      9: [1, 2],
      12: [1, 3],
    })
    expect(elimination(run(NAKED_PAIR, later)).justifying).toEqual([8, 9])
  })
})

describe('Naked Pairs B', () => {
  it('fires on an edge-sharing pair across cages', () => {
    // 5 (cage 0) and 6 (cage 1) both touch 1, 2, 9 and 10.
    const candidates = map({
      1: [1, 2, 3],
      2: [3, 4],
      4: [1, 2, 3],
      5: [1, 2],
      6: [1, 2],
      7: [1, 3],
      9: [1, 4],
      10: [2, 3],
    })

    const step = elimination(run(TOUCHING_PAIR, candidates))

    expect(step.strategy).toBe('Touching Pair')
    expect(step.justifying).toEqual([5, 6])
    expect(step.removals).toEqual([
      { cell: 1, digits: [1, 2] },
      { cell: 9, digits: [1] },
      { cell: 10, digits: [2] },
    ])
  })

  it('fires on a diagonal pair', () => {
    // 5 and 10 touch only at a corner, and both touch 6 and 9.
    const candidates = map({
      4: [3, 4, 5],
      5: [3, 4],
      6: [3, 5],
      9: [4, 5],
      10: [3, 4],
      14: [3, 4, 5],
    })

    const step = elimination(run(TOUCHING_PAIR, candidates))

    expect(step.justifying).toEqual([5, 10])
    expect(step.removals).toEqual([
      { cell: 6, digits: [3] },
      { cell: 9, digits: [4] },
    ])
  })

  it('fires on a pair inside one cage', () => {
    const step = elimination(run(TOUCHING_PAIR, candidatesFor(SAMPLE_PUZZLE, F_STUCK)))

    expect(step.justifying).toEqual([8, 9])
    expect(step.removals).toEqual([{ cell: 5, digits: [1, 2] }])
  })

  it('leaves cells touching only one of the pair untouched', () => {
    const edge = map({ 4: [1, 2, 3], 5: [1, 2], 6: [1, 2], 7: [1, 3], 9: [1, 4] })
    expect(touchedCells(elimination(run(TOUCHING_PAIR, edge)))).toEqual([9])

    const diagonal = map({ 4: [3, 4, 5], 5: [3, 4], 9: [4, 5], 10: [3, 4], 14: [3, 4, 5] })
    expect(touchedCells(elimination(run(TOUCHING_PAIR, diagonal)))).toEqual([9])

    // At the sample's stuck state, 6 touches 9 but not 8, and keeps its 1.
    const stuck = elimination(run(TOUCHING_PAIR, candidatesFor(SAMPLE_PUZZLE, F_STUCK)))
    expect(touchedCells(stuck)).toEqual([5])
  })

  it('explains the pair by the touching rule', () => {
    const { explanation } = elimination(run(TOUCHING_PAIR, candidatesFor(SAMPLE_PUZZLE, F_STUCK)))

    expect(explanation).toMatch(/\b1\b/)
    expect(explanation).toMatch(/\b2\b/)
    expect(explanation).toMatch(/equal digits may not touch, not even diagonally/i)
    expect(explanation).not.toMatch(/rule\s*\d/i)
  })

  it('does not fire when the pair does not touch', () => {
    // 0 and 10 are two apart; 5 touches both.
    expect(run(TOUCHING_PAIR, map({ 0: [1, 2], 5: [1, 2, 3], 10: [1, 2] }))).toBeNull()
  })

  it('does not fire on unequal two-candidate sets', () => {
    expect(run(TOUCHING_PAIR, map({ 1: [1, 2, 3], 5: [1, 2], 6: [1, 3] }))).toBeNull()
  })

  it('does not fire when no cell touching both would lose', () => {
    // 4 touches 5 only, 7 touches 6 only.
    const candidates = map({ 1: [3], 4: [1, 2, 3], 5: [1, 2], 6: [1, 2], 7: [1, 2, 3], 9: [3, 4] })
    expect(run(TOUCHING_PAIR, candidates)).toBeNull()
  })

  it('reports the lowest-indexed pair that removes something', () => {
    // Pairs at 5+6 and 10+14 (which both touch 13).
    const two = map({ 5: [1, 2], 6: [1, 2], 9: [1, 3], 10: [3, 4], 13: [3, 5], 14: [3, 4] })
    expect(elimination(run(TOUCHING_PAIR, two)).justifying).toEqual([5, 6])

    // 5 touches both 6 and 8, which do not touch each other; 9 touches all three.
    const shared = map({ 5: [1, 2], 6: [1, 2], 8: [1, 2], 9: [1, 3] })
    expect(elimination(run(TOUCHING_PAIR, shared)).justifying).toEqual([5, 6])

    // 5+6 would remove nothing; 10+14 removes 3 from 13.
    const later = map({ 5: [1, 2], 6: [1, 2], 10: [3, 4], 13: [3, 5], 14: [3, 4] })
    expect(elimination(run(TOUCHING_PAIR, later)).justifying).toEqual([10, 14])
  })
})
