import { describe, expect, it } from 'vite-plus/test'
import { candidatesFor, type Candidates } from './candidates'
import { DEFAULT_STRATEGIES, findHint, type HintResult } from './hint'
import {
  F_17,
  F_A,
  F_A_DEAD,
  F_A_NONE,
  F_DEAD,
  F_DEAD_2,
  F_FULL_0_1_14,
  F_S3,
  F_START,
  F_STUCK,
  PAIRS_PUZZLE,
  sampleWith,
} from './hintFixtures'
import { NAKED_PAIR, TOUCHING_PAIR } from './nakedPairs'
import { SAMPLE_PUZZLE, SAMPLE_SOLUTION, SAMPLE_SOLVED_BOARD } from './samplePuzzle'
import {
  CROWN,
  FULL_BLOCK,
  HIDDEN_SINGLE,
  NAKED_SINGLE,
  UNIQUE,
  type Elimination,
  type Placement,
  type Strategy,
} from './strategies'
import { withEntry } from './selection'
import type { Board, Digit, Puzzle } from './types'
import { valueAt } from './validate'

/** hints-1's five strategies, without the pairs. */
const START_STRATEGIES = [FULL_BLOCK, UNIQUE, CROWN, NAKED_SINGLE, HIDDEN_SINGLE]

interface Scripted {
  readonly cell: number
  readonly digits: readonly Digit[]
  readonly justifying?: readonly number[]
}

function elimination({ cell, digits, justifying = [] }: Scripted): Elimination {
  return {
    kind: 'elimination',
    strategy: 'Stub',
    removals: [{ cell, digits }],
    justifying,
    explanation: 'A scripted elimination.',
  }
}

/**
 * A test-only elimination strategy. It offers its scripted steps one at a time,
 * each until the loop has applied it, then offers nothing.
 */
function stub(...script: Scripted[]): Strategy {
  return {
    name: 'Stub',
    apply: (_puzzle, _board, candidates: Candidates) => {
      const next = script.find(({ cell, digits }) =>
        digits.some((digit) => candidates[cell]?.has(digit)),
      )
      return next ? elimination(next) : null
    },
  }
}

/** A stub that only ever offers to remove what is already gone. */
const noOp: Strategy = {
  name: 'No-op',
  apply: () => elimination({ cell: 4, digits: [1] }),
}

/** A strategy that fails the test if the loop ever calls it. */
const tripwire: Strategy = {
  name: 'Tripwire',
  apply: () => {
    throw new Error('no strategy should run')
  },
}

function hint(board: Board, strategies?: readonly Strategy[]): HintResult {
  return findHint(SAMPLE_PUZZLE, board, strategies)
}

function placementOf(result: HintResult): { placement: Placement; leadUp: readonly Elimination[] } {
  if (result.kind !== 'hint') throw new Error(`expected a hint, got ${result.kind}`)
  return result
}

/** The removals of each lead-up step, so a test can compare against its script. */
const removalsOf = (leadUp: readonly Elimination[]) => leadUp.map((step) => step.removals)

describe('loop', () => {
  it('strategy order beats cell index', () => {
    // Crown and Naked Single would place 5 at the lower cell 14.
    expect(placementOf(hint(F_17)).placement).toMatchObject({
      cell: 15,
      digit: 1,
      strategy: 'Unique',
    })
    // Naked Single would place the same digit.
    expect(placementOf(hint(F_S3)).placement).toMatchObject({
      cell: 13,
      digit: 4,
      strategy: 'Crown',
    })
    // Unique, Crown and Naked Single also apply, Unique at the lower cell 0.
    expect(placementOf(hint(F_FULL_0_1_14)).placement).toMatchObject({
      cell: 14,
      digit: 5,
      strategy: 'Full Block',
    })
  })

  it('first hint from the givens', () => {
    const { placement, leadUp } = placementOf(hint(F_START))

    expect(placement).toMatchObject({ cell: 17, digit: 1, strategy: 'Full Block' })
    expect(placement.justifying).toEqual([])
    expect(leadUp).toEqual([])
  })

  it('a no-op elimination does not loop forever', () => {
    const { placement, leadUp } = placementOf(hint(F_START, [noOp, ...DEFAULT_STRATEGIES]))

    expect(placement).toMatchObject({ cell: 17, digit: 1 })
    expect(leadUp).toEqual([])
  })

  it('no strategy applies gives no hint', () => {
    expect(hint(F_STUCK, START_STRATEGIES)).toEqual({ kind: 'none' })
  })

  it('violations come first', () => {
    // A 3 at cell 5 touches the given 3 at cell 4.
    const board = sampleWith({ 5: 3 })

    expect(hint(board, [tripwire])).toEqual({ kind: 'violations' })
  })
})

describe('lead-up', () => {
  it('Naked Single keeps only eliminations on target', () => {
    const a = { cell: 0, digits: [4] } as const
    const b = { cell: 6, digits: [4] } as const

    const { placement, leadUp } = placementOf(hint(F_STUCK, [stub(a, b), ...DEFAULT_STRATEGIES]))

    expect(placement).toMatchObject({ cell: 6, digit: 1, strategy: 'Naked Single' })
    expect([...placement.justifying].sort((x, y) => x - y)).toEqual([7, 10, 11])
    expect(removalsOf(leadUp)).toEqual([[b]])
  })

  it('dependencies are followed transitively', () => {
    const a = { cell: 2, digits: [1] } as const
    const b = { cell: 6, digits: [4], justifying: [2] } as const

    const { placement, leadUp } = placementOf(hint(F_STUCK, [stub(a, b), ...DEFAULT_STRATEGIES]))

    expect(placement).toMatchObject({ cell: 6, digit: 1, strategy: 'Naked Single' })
    expect(removalsOf(leadUp)).toEqual([[{ cell: 2, digits: [1] }], [{ cell: 6, digits: [4] }]])
  })

  it("Hidden Single keeps the digit's cage removals", () => {
    const a = { cell: 2, digits: [4] } as const
    const b = { cell: 0, digits: [4] } as const
    const c = { cell: 1, digits: [4] } as const

    const { placement, leadUp } = placementOf(hint(F_STUCK, [stub(a, b, c), ...DEFAULT_STRATEGIES]))

    expect(placement).toMatchObject({ cell: 5, digit: 4, strategy: 'Hidden Single' })
    expect(removalsOf(leadUp)).toEqual([[b], [c]])
  })

  it('board strategies take none', () => {
    const { placement, leadUp } = placementOf(
      hint(F_17, [stub({ cell: 15, digits: [5] }), ...DEFAULT_STRATEGIES]),
    )

    expect(placement).toMatchObject({ cell: 15, digit: 1, strategy: 'Unique' })
    expect(leadUp).toEqual([])
  })
})

describe('dead end', () => {
  it('beats any hint', () => {
    // Full Block would otherwise place 1 in the cage of one at cell 17.
    expect(hint(F_DEAD)).toEqual({ kind: 'dead-end', cells: [17] })
  })

  it('names every cell with no candidates', () => {
    expect(hint(F_DEAD_2)).toEqual({ kind: 'dead-end', cells: [14, 17] })
  })

  it('is checked again after an elimination', () => {
    const strategies = [stub({ cell: 6, digits: [1, 4] }), ...DEFAULT_STRATEGIES]

    expect(hint(F_STUCK, strategies)).toEqual({ kind: 'dead-end', cells: [6] })
  })
})

describe('pair strategies', () => {
  const stuckOn = (puzzle: Puzzle, board: Board) => {
    const candidates = candidatesFor(puzzle, board)
    for (const strategy of START_STRATEGIES) {
      expect(strategy.apply(puzzle, board, candidates), strategy.name).toBeNull()
    }
    return candidates
  }

  it('an S1–S5 placement wins over a pair elimination', () => {
    const candidates = candidatesFor(SAMPLE_PUZZLE, F_START)
    expect(NAKED_PAIR.apply(SAMPLE_PUZZLE, F_START, candidates)).not.toBeNull()
    expect(TOUCHING_PAIR.apply(SAMPLE_PUZZLE, F_START, candidates)).not.toBeNull()

    const { placement, leadUp } = placementOf(hint(F_START))

    expect(placement).toMatchObject({ cell: 17, digit: 1, strategy: 'Full Block' })
    expect(leadUp).toEqual([])
  })

  it('default order ends with Naked Pairs A then B', () => {
    expect(DEFAULT_STRATEGIES).toEqual([...START_STRATEGIES, NAKED_PAIR, TOUCHING_PAIR])
  })

  it('Naked Pairs A unlocks a hint where S1–S5 are stuck', () => {
    stuckOn(PAIRS_PUZZLE, F_A)

    const { placement, leadUp } = placementOf(findHint(PAIRS_PUZZLE, F_A))

    expect(placement).toMatchObject({ cell: 6, digit: 1, strategy: 'Naked Single' })
    expect(leadUp.map((step) => step.strategy)).toContain('Naked Pair')
    expect(leadUp[0]).toMatchObject({
      strategy: 'Naked Pair',
      justifying: [10, 14],
      removals: [
        { cell: 6, digits: [2, 4] },
        { cell: 7, digits: [2, 4] },
        { cell: 11, digits: [2, 4] },
      ],
    })
  })

  it("Naked Pairs B unlocks the sample's stuck state", () => {
    const candidates = stuckOn(SAMPLE_PUZZLE, F_STUCK)
    expect(NAKED_PAIR.apply(SAMPLE_PUZZLE, F_STUCK, candidates)).toBeNull()
    const pair = TOUCHING_PAIR.apply(SAMPLE_PUZZLE, F_STUCK, candidates)
    expect(pair).toMatchObject({ justifying: [8, 9], removals: [{ cell: 5, digits: [1, 2] }] })

    const { placement, leadUp } = placementOf(hint(F_STUCK))

    expect(placement).toMatchObject({ cell: 5, digit: 4, strategy: 'Naked Single' })
    expect([...placement.justifying].sort((x, y) => x - y)).toEqual([4, 10])
    expect(leadUp).toEqual([pair])
  })

  it('eliminations leading nowhere give no hint found', () => {
    const candidates = candidatesFor(PAIRS_PUZZLE, F_A_NONE)
    expect(NAKED_PAIR.apply(PAIRS_PUZZLE, F_A_NONE, candidates)).not.toBeNull()
    expect(candidates.some((set) => set?.size === 0)).toBe(false)

    expect(findHint(PAIRS_PUZZLE, F_A_NONE)).toEqual({ kind: 'none' })
  })

  it("an elimination that empties a cell gives can't-complete", () => {
    expect(findHint(PAIRS_PUZZLE, F_A_DEAD, START_STRATEGIES)).toEqual({ kind: 'none' })

    expect(findHint(PAIRS_PUZZLE, F_A_DEAD)).toEqual({ kind: 'dead-end', cells: [14] })
  })
})

describe('sample', () => {
  it('hints from the givens solve the sample', () => {
    let board: Board = F_START

    for (let result = hint(board); result.kind === 'hint'; result = hint(board)) {
      const { cell, digit } = result.placement
      expect(digit).toBe(SAMPLE_SOLUTION[cell])
      board = withEntry(board, cell, digit)
    }

    // A board holds entries only, so the givens are read through valueAt.
    const shown = board.map((_, cell) => valueAt(SAMPLE_PUZZLE, board, cell))
    expect(shown).toEqual(SAMPLE_SOLVED_BOARD)
  })
})
