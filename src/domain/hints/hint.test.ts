import { describe, expect, it } from 'vite-plus/test'
import { candidatesFor, type Candidates } from './candidates'
import { DEFAULT_STRATEGIES, findHint, type HintResult } from './hint'
import {
  F_17,
  F_A,
  F_CHAIN,
  F_A_DEAD,
  F_A_NONE,
  F_DEAD,
  F_DEAD_2,
  F_FULL_0_1_14,
  F_S3,
  F_START,
  F_STUCK,
  F_TARGET_PAIR,
  PAIRS_PUZZLE,
  smallWith,
} from './fixtures'
import { EXPLANATIONS } from '@/domain/hints/copy'
import { NAKED_PAIR, TOUCHING_PAIR } from '@/domain/hints/strategies/pairs'
import { SAMPLE_PUZZLE } from '@/domain/puzzle/samplePuzzle'
import { SMALL_PUZZLE, SMALL_SOLUTION, SMALL_SOLVED_BOARD } from '@/domain/puzzle/smallPuzzle'
import {
  CROWN,
  FULL_BLOCK,
  HIDDEN_SINGLE,
  NAKED_SINGLE,
  UNIQUE,
} from '@/domain/hints/strategies/singles'
import type { Elimination, Strategy } from '@/domain/hints/strategies/step'
import { withEntry } from '@/domain/input/selection'
import type { Board, Digit, Puzzle } from '@/domain/puzzle/types'
import { valueAt } from '@/domain/puzzle/validate'

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
  return findHint(SMALL_PUZZLE, board, strategies)
}

function hintOf(result: HintResult): Extract<HintResult, { kind: 'hint' }> {
  if (result.kind !== 'hint') throw new Error(`expected a hint, got ${result.kind}`)
  return result
}

/** The removals of each lead-up step, so a test can compare against its script. */
const removalsOf = (leadUp: readonly Elimination[]) => leadUp.map((step) => step.removals)

describe('loop', () => {
  it('strategy order beats cell index', () => {
    // Crown and Naked Single would place 5 at the lower cell 14.
    expect(hintOf(hint(F_17)).placement).toMatchObject({
      cell: 15,
      digit: 1,
      strategy: 'Unique',
    })
    // Naked Single would place the same digit.
    expect(hintOf(hint(F_S3)).placement).toMatchObject({
      cell: 13,
      digit: 4,
      strategy: 'Crown',
    })
    // Unique, Crown and Naked Single also apply, Unique at the lower cell 0.
    expect(hintOf(hint(F_FULL_0_1_14)).placement).toMatchObject({
      cell: 14,
      digit: 5,
      strategy: 'Full Block',
    })
  })

  it('first hint from the givens', () => {
    const { placement, leadUp } = hintOf(hint(F_START))

    expect(placement).toMatchObject({ cell: 17, digit: 1, strategy: 'Full Block' })
    expect(placement.justifying).toEqual([])
    expect(leadUp).toEqual([])
  })

  it('a no-op elimination does not loop forever', () => {
    const { placement, leadUp } = hintOf(hint(F_START, [noOp, ...DEFAULT_STRATEGIES]))

    expect(placement).toMatchObject({ cell: 17, digit: 1 })
    expect(leadUp).toEqual([])
  })

  it('no strategy applies gives no hint', () => {
    expect(hint(F_STUCK, START_STRATEGIES)).toEqual({ kind: 'none' })
  })

  it('violations come first', () => {
    // A 3 at cell 5 touches the given 3 at cell 4.
    const board = smallWith({ 5: 3 })

    expect(hint(board, [tripwire])).toEqual({ kind: 'violations' })
  })
})

describe('lead-up', () => {
  it('Naked Single keeps only eliminations on target', () => {
    const a = { cell: 0, digits: [4] } as const
    const b = { cell: 6, digits: [4] } as const

    const { placement, leadUp } = hintOf(hint(F_STUCK, [stub(a, b), ...DEFAULT_STRATEGIES]))

    expect(placement).toMatchObject({ cell: 6, digit: 1, strategy: 'Naked Single' })
    expect([...placement.justifying].sort((x, y) => x - y)).toEqual([7, 10, 11])
    expect(removalsOf(leadUp)).toEqual([[b]])
  })

  it('dependencies are followed transitively', () => {
    const a = { cell: 2, digits: [1] } as const
    const b = { cell: 6, digits: [4], justifying: [2] } as const

    const { placement, leadUp } = hintOf(hint(F_STUCK, [stub(a, b), ...DEFAULT_STRATEGIES]))

    expect(placement).toMatchObject({ cell: 6, digit: 1, strategy: 'Naked Single' })
    expect(removalsOf(leadUp)).toEqual([[{ cell: 2, digits: [1] }], [{ cell: 6, digits: [4] }]])
  })

  it("Hidden Single keeps the digit's cage removals", () => {
    const a = { cell: 2, digits: [4] } as const
    const b = { cell: 0, digits: [4] } as const
    const c = { cell: 1, digits: [4] } as const

    const { placement, leadUp } = hintOf(hint(F_STUCK, [stub(a, b, c), ...DEFAULT_STRATEGIES]))

    expect(placement).toMatchObject({ cell: 5, digit: 4, strategy: 'Hidden Single' })
    expect(removalsOf(leadUp)).toEqual([[b], [c]])
  })

  it('board strategies take none', () => {
    const { placement, leadUp } = hintOf(
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
    const candidates = candidatesFor(SMALL_PUZZLE, F_START)
    expect(NAKED_PAIR.apply(SMALL_PUZZLE, F_START, candidates)).not.toBeNull()
    expect(TOUCHING_PAIR.apply(SMALL_PUZZLE, F_START, candidates)).not.toBeNull()

    const { placement, leadUp } = hintOf(hint(F_START))

    expect(placement).toMatchObject({ cell: 17, digit: 1, strategy: 'Full Block' })
    expect(leadUp).toEqual([])
  })

  it('default order ends with Naked Pairs A then B', () => {
    expect(DEFAULT_STRATEGIES).toEqual([...START_STRATEGIES, NAKED_PAIR, TOUCHING_PAIR])
  })

  it('Naked Pairs A unlocks a hint where S1–S5 are stuck', () => {
    stuckOn(PAIRS_PUZZLE, F_A)

    const { placement, leadUp } = hintOf(findHint(PAIRS_PUZZLE, F_A))

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

  it("Naked Pairs B unlocks the small puzzle's stuck state", () => {
    const candidates = stuckOn(SMALL_PUZZLE, F_STUCK)
    expect(NAKED_PAIR.apply(SMALL_PUZZLE, F_STUCK, candidates)).toBeNull()
    const pair = TOUCHING_PAIR.apply(SMALL_PUZZLE, F_STUCK, candidates)
    expect(pair).toMatchObject({ justifying: [8, 9], removals: [{ cell: 5, digits: [1, 2] }] })

    const { placement, leadUp } = hintOf(hint(F_STUCK))

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

describe('shown candidates', () => {
  it("a hint shows its pair's candidates, then what they crossed out of the target", () => {
    const { shown } = hintOf(hint(F_STUCK))

    expect(shown).toEqual([
      [
        { cell: 8, digits: [1, 2], struck: [] },
        { cell: 9, digits: [1, 2], struck: [] },
        { cell: 5, digits: [], struck: [1, 2] },
      ],
      [{ cell: 5, digits: [], struck: [1, 2] }],
    ])
  })

  it('a hint from the board alone shows none', () => {
    expect(hintOf(hint(F_START)).shown).toEqual([[]])
  })

  it('a chain shows each pair as the steps before it left it', () => {
    const { placement, leadUp, shown } = hintOf(findHint(SAMPLE_PUZZLE, F_CHAIN))

    expect(placement).toMatchObject({ cell: 45, digit: 3, strategy: 'Naked Single' })
    expect(leadUp.map((step) => [step.strategy, step.justifying])).toEqual([
      ['Naked Pair', [29, 30]],
      ['Touching Pair', [37, 38]],
    ])
    // The Touching Pair is only a pair because the Naked Pair took 4 and 5.
    expect(shown[1]).toEqual([
      { cell: 37, digits: [1, 2], struck: [4, 5] },
      { cell: 38, digits: [1, 2], struck: [4, 5] },
      { cell: 45, digits: [], struck: [1, 2] },
      { cell: 46, digits: [], struck: [1, 2] },
    ])
    expect(shown[2]).toEqual([{ cell: 45, digits: [], struck: [1, 2] }])
  })

  it('a placement ruled by the steps alone says so, with nothing highlighted', () => {
    const { placement } = hintOf(findHint(SAMPLE_PUZZLE, F_CHAIN))

    expect(placement.justifying).toEqual([])
    expect(placement.explanation).toBe(EXPLANATIONS.nakedSingle(3, 'steps'))
  })

  it("a target in its own pair shows the pair's digits, and the placement shows none", () => {
    const { placement, leadUp, shown } = hintOf(findHint(SAMPLE_PUZZLE, F_TARGET_PAIR))

    expect(placement).toMatchObject({ cell: 21, digit: 2, strategy: 'Hidden Single' })
    expect(leadUp.map((step) => step.justifying)).toEqual([[21, 28]])
    // Only the two digits the pair's explanation names, which the answer is one of.
    expect(shown[0]).toContainEqual({ cell: 21, digits: [1, 2], struck: [] })
    // The Hidden Single shows its digit crossed out of the rest of the cage.
    expect(shown[1]).toEqual([{ cell: 20, digits: [], struck: [2] }])
  })
})

describe('small puzzle', () => {
  it('hints from the givens solve the small puzzle', () => {
    let board: Board = F_START

    for (let result = hint(board); result.kind === 'hint'; result = hint(board)) {
      const { cell, digit } = result.placement
      expect(digit).toBe(SMALL_SOLUTION[cell])
      board = withEntry(board, cell, digit)
    }

    // A board holds entries only, so the givens are read through valueAt.
    const shown = board.map((_, cell) => valueAt(SMALL_PUZZLE, board, cell))
    expect(shown).toEqual(SMALL_SOLVED_BOARD)
  })
})
