import { describe, expect, it } from 'vite-plus/test'
import { candidatesFor, type Candidates } from './candidates'
import { F_17, F_FULL_0, F_S3, F_S4, F_START, F_STUCK } from './hintFixtures'
import { SAMPLE_PUZZLE } from './samplePuzzle'
import {
  CROWN,
  FULL_BLOCK,
  HIDDEN_SINGLE,
  NAKED_SINGLE,
  UNIQUE,
  type Placement,
  type Step,
  type Strategy,
} from './strategies'
import type { Board, Digit } from './types'

/** Runs `strategy` on the sample, against `candidates` or the board's own. */
function run(strategy: Strategy, board: Board, candidates?: Candidates): Step | null {
  return strategy.apply(SAMPLE_PUZZLE, board, candidates ?? candidatesFor(SAMPLE_PUZZLE, board))
}

/** The board's candidates with `digit` struck from each of `cells`. */
function narrowed(board: Board, digit: Digit, ...cells: number[]): Candidates {
  return candidatesFor(SAMPLE_PUZZLE, board).map((set, cell) => {
    if (set === null || !cells.includes(cell)) return set
    const next = new Set(set)
    next.delete(digit)
    return next
  })
}

function placement(step: Step | null): Placement {
  if (step?.kind !== 'placement')
    throw new Error(`expected a placement, got ${step?.kind ?? 'nothing'}`)
  return step
}

const sorted = (cells: readonly number[]) => [...cells].sort((a, b) => a - b)

/** Every placement AC-3 to AC-9 produce, gathered for AC-10. */
function allPlacements(): Placement[] {
  return [
    placement(run(FULL_BLOCK, F_FULL_0)),
    placement(run(UNIQUE, F_17)),
    placement(run(UNIQUE, F_START)),
    placement(run(CROWN, F_S3)),
    placement(run(NAKED_SINGLE, F_S4)),
    placement(run(NAKED_SINGLE, F_STUCK, narrowed(F_STUCK, 4, 6))),
    placement(run(HIDDEN_SINGLE, F_STUCK, narrowed(F_STUCK, 4, 0, 1))),
  ]
}

describe('Full Block', () => {
  it('fires / does not fire', () => {
    const step = placement(run(FULL_BLOCK, F_FULL_0))
    expect(step).toMatchObject({ cell: 0, digit: 1, strategy: 'Full Block' })
    expect(sorted(step.justifying)).toEqual([1, 4, 5])

    expect(run(FULL_BLOCK, F_17)).toBeNull()
  })
})

describe('Unique', () => {
  it('fires / does not fire', () => {
    const step = placement(run(UNIQUE, F_17))
    expect(step).toMatchObject({ cell: 15, digit: 1, strategy: 'Unique' })
    expect(sorted(step.justifying)).toEqual([17])

    expect(run(UNIQUE, F_STUCK)).toBeNull()
  })

  it('lowest cell index wins', () => {
    // Unique also applies at cells 17 and 18 here.
    expect(placement(run(UNIQUE, F_START))).toMatchObject({ cell: 16, digit: 3 })
  })
})

describe('Crown', () => {
  it('fires on neighbours alone / does not fire', () => {
    const step = placement(run(CROWN, F_S3))
    expect(step).toMatchObject({ cell: 13, digit: 4, strategy: 'Crown' })
    // Cell 10's given 3 counts as well as cell 16's (notes.md, AC-6 correction).
    expect(sorted(step.justifying)).toEqual([10, 12, 14, 16, 17, 18])

    // Cell 18's neighbours alone leave {2, 3}.
    expect(run(CROWN, F_S4)).toBeNull()
  })
})

describe('Naked Single', () => {
  it('fires / does not fire', () => {
    const step = placement(run(NAKED_SINGLE, F_S4))
    expect(step).toMatchObject({ cell: 18, digit: 2, strategy: 'Naked Single' })
    expect(sorted(step.justifying)).toEqual([10, 14, 15, 17, 19])

    expect(run(NAKED_SINGLE, F_STUCK)).toBeNull()
  })

  it('reads the candidates passed in', () => {
    const step = run(NAKED_SINGLE, F_STUCK, narrowed(F_STUCK, 4, 6))

    expect(placement(step)).toMatchObject({ cell: 6, digit: 1 })
  })
})

describe('Hidden Single', () => {
  it('fires on narrowed candidates / not', () => {
    const step = placement(run(HIDDEN_SINGLE, F_STUCK, narrowed(F_STUCK, 4, 0, 1)))
    expect(step).toMatchObject({ cell: 5, digit: 4, strategy: 'Hidden Single' })
    expect(sorted(step.justifying)).toEqual([0, 1])

    expect(run(HIDDEN_SINGLE, F_STUCK)).toBeNull()
  })
})

describe('every placement', () => {
  it('uncoded name, target, plain words', () => {
    for (const step of allPlacements()) {
      expect(step.strategy).not.toMatch(/^S\d/)
      expect(Number.isInteger(step.cell)).toBe(true)
      expect(step.explanation.trim()).not.toBe('')
      expect(step.explanation).not.toMatch(/rule\s*\d/i)
    }
  })

  it('never lists the target among its justifying cells', () => {
    for (const step of allPlacements()) expect(step.justifying).not.toContain(step.cell)
  })
})
