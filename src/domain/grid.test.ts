import { describe, expect, it } from 'vite-plus/test'
import {
  adjacent,
  cageIds,
  cageSize,
  cellCount,
  cellsInCage,
  coordOf,
  indexOf,
  isCageContiguous,
  touching,
} from './grid'
import { SAMPLE_PUZZLE } from './samplePuzzle'
import type { Puzzle } from './types'

/**
 * Geometry fixture — a 4×3 grid of one-cell cages.
 *
 * Deliberately not `SAMPLE_PUZZLE`: neighbourhood and coordinate maths are
 * properties of the grid itself, not of any particular puzzle. Pinning them to
 * the sample means every test here breaks the moment the sample is swapped.
 *
 *    0  1  2  3
 *    4  5  6  7
 *    8  9 10 11
 */
const GRID: Puzzle = {
  width: 4,
  height: 3,
  cages: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  givens: Array.from({ length: 12 }, () => null),
}

/** A 3×1 strip whose single cage is split in two by a cage of one. */
const SPLIT_CAGE: Puzzle = {
  width: 3,
  height: 1,
  cages: [0, 1, 0],
  givens: [null, null, null],
}

const ascending = (a: number, b: number) => a - b

describe('coordinate mapping', () => {
  it('round-trips every cell', () => {
    for (let index = 0; index < cellCount(GRID); index += 1) {
      expect(indexOf(GRID, coordOf(GRID, index))).toBe(index)
    }
  })

  it('maps row-major', () => {
    expect(coordOf(GRID, 6)).toEqual({ row: 1, col: 2 })
    expect(indexOf(GRID, { row: 1, col: 2 })).toBe(6)
  })
})

describe('touching', () => {
  it('gives three neighbours in a corner', () => {
    expect(touching(GRID, 0).sort(ascending)).toEqual([1, 4, 5])
  })

  it('gives five neighbours on an edge', () => {
    expect(touching(GRID, 1).sort(ascending)).toEqual([0, 2, 4, 5, 6])
  })

  it('gives all eight neighbours in the interior', () => {
    expect(touching(GRID, 5).sort(ascending)).toEqual([0, 1, 2, 4, 6, 8, 9, 10])
  })
})

describe('adjacent', () => {
  it('excludes diagonals', () => {
    expect(adjacent(GRID, 5).sort(ascending)).toEqual([1, 4, 6, 9])
  })

  it('clips at corners', () => {
    expect(adjacent(GRID, 0).sort(ascending)).toEqual([1, 4])
  })
})

describe('the sample puzzle', () => {
  it('partitions twenty cells into five cages', () => {
    expect(cellCount(SAMPLE_PUZZLE)).toBe(20)
    expect(cageIds(SAMPLE_PUZZLE)).toEqual([0, 1, 2, 3, 4])
  })

  it('has cages of the sizes its diagram documents', () => {
    const sizes = cageIds(SAMPLE_PUZZLE).map((id) => [id, cageSize(SAMPLE_PUZZLE, id)])
    // Not uniform: a cage of four and a cage of one, which is what gives the
    // `value-exceeds-cage` rule something real to catch.
    expect(sizes).toEqual([
      [0, 4],
      [1, 5],
      [2, 5],
      [3, 5],
      [4, 1],
    ])
  })

  it('lists cage members by index', () => {
    expect(cellsInCage(SAMPLE_PUZZLE, 0)).toEqual([0, 1, 4, 5])
    expect(cellsInCage(SAMPLE_PUZZLE, 4)).toEqual([17])
  })

  it('has only contiguous cages', () => {
    for (const cageId of cageIds(SAMPLE_PUZZLE)) {
      expect(isCageContiguous(SAMPLE_PUZZLE, cageId)).toBe(true)
    }
  })
})

describe('cage contiguity', () => {
  it('rejects a cage split into islands', () => {
    expect(isCageContiguous(SPLIT_CAGE, 0)).toBe(false)
    expect(isCageContiguous(SPLIT_CAGE, 1)).toBe(true)
  })
})
