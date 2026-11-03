import { describe, expect, it } from 'vite-plus/test'
import type { Candidates } from './candidates'
import { shownCandidates } from './shown'
import type { Elimination, Placement, Reads, Removal } from '@/domain/hints/strategies/step'
import type { Digit } from '@/domain/puzzle/types'

/*
 * The lead-ups here are written by hand, so each test states only the steps it is
 * about. `shownCandidates` reads nothing but the steps and the board's candidates.
 */

/** A candidate map of 20 cells with `open` as the only open cells. */
function map(open: Readonly<Record<number, readonly Digit[]>>): Candidates {
  return Array.from({ length: 20 }, (_, cell) => {
    const digits = open[cell]
    return digits ? new Set(digits) : null
  })
}

function pair(justifying: readonly number[], removals: readonly Removal[]): Elimination {
  return {
    kind: 'elimination',
    strategy: 'Pair',
    removals,
    justifying,
    explanation: 'A pair.',
  }
}

function single(cell: number, reads: readonly Reads[]): Placement {
  return {
    kind: 'placement',
    strategy: 'Single',
    cell,
    digit: 4,
    justifying: [],
    explanation: 'A single.',
    reads,
  }
}

describe('an elimination', () => {
  // The small puzzle's stuck state: 8 and 9 hold 1 and 2, so 5 can only be 4.
  const initial = map({ 5: [1, 2, 4], 8: [1, 2], 9: [1, 2] })
  const touching = pair([8, 9], [{ cell: 5, digits: [2, 1] }])

  it('shows its pair whole, and crosses out what it removes where it falls', () => {
    const [shown] = shownCandidates(initial, [touching], single(5, [{ cell: 5 }]))

    expect(shown).toEqual([
      { cell: 8, digits: [1, 2], struck: [] },
      { cell: 9, digits: [1, 2], struck: [] },
      { cell: 5, digits: [], struck: [1, 2] },
    ])
  })

  it('keeps crossed out what earlier steps took from a cell it removes from too', () => {
    const before = map({ 0: [3, 5], 1: [3, 5], 5: [1, 2, 3, 4], 8: [1, 2], 9: [1, 2] })
    const first = pair([8, 9], [{ cell: 5, digits: [1, 2] }])
    const second = pair([0, 1], [{ cell: 5, digits: [3] }])

    const shown = shownCandidates(before, [first, second], single(5, [{ cell: 5 }]))

    expect(shown[1]).toContainEqual({ cell: 5, digits: [], struck: [1, 2, 3] })
    expect(shown[2]).toEqual([{ cell: 5, digits: [], struck: [1, 2, 3] }])
  })

  it('shows a pair cell as the steps before it left it', () => {
    // 0 and 1 lose their 3 to the pair at 2 and 3, which makes them a pair of their own.
    const before = map({ 0: [1, 2, 3], 1: [1, 2, 3], 2: [3, 4], 3: [3, 4], 5: [1, 2, 4] })
    const first = pair(
      [2, 3],
      [
        { cell: 0, digits: [3] },
        { cell: 1, digits: [3] },
      ],
    )
    const second = pair([0, 1], [{ cell: 5, digits: [1, 2] }])

    const shown = shownCandidates(before, [first, second], single(5, [{ cell: 5 }]))

    expect(shown[1]).toEqual([
      { cell: 0, digits: [1, 2], struck: [3] },
      { cell: 1, digits: [1, 2], struck: [3] },
      { cell: 5, digits: [], struck: [1, 2] },
    ])
  })
})

describe('a placement', () => {
  it('crosses out what the steps before it removed, and never shows what is left', () => {
    const initial = map({ 5: [1, 2, 4], 8: [1, 2], 9: [1, 2] })
    const touching = pair([8, 9], [{ cell: 5, digits: [1, 2] }])

    const shown = shownCandidates(initial, [touching], single(5, [{ cell: 5 }]))

    expect(shown).toHaveLength(2)
    expect(shown[1]).toEqual([{ cell: 5, digits: [], struck: [1, 2] }])
  })

  it('crosses out only the digits it reads, in the cells it reads', () => {
    // A Hidden Single of 4 at cell 5 reads only the 4s gone from the rest of its cage.
    const initial = map({
      0: [1, 2, 4],
      1: [1, 4],
      5: [1, 2, 4],
      6: [1, 4],
      12: [1, 4],
      13: [1, 4],
    })
    const earlier = pair(
      [12, 13],
      [
        { cell: 0, digits: [4] },
        { cell: 1, digits: [1, 4] },
        { cell: 6, digits: [4] },
      ],
    )
    const reads = [
      { cell: 0, digits: [4] },
      { cell: 1, digits: [4] },
    ] as const

    const shown = shownCandidates(initial, [earlier], single(5, reads))

    expect(shown[1]).toEqual([
      { cell: 0, digits: [], struck: [4] },
      { cell: 1, digits: [], struck: [4] },
    ])
  })

  it('found from the board alone shows nothing', () => {
    expect(shownCandidates(map({ 17: [1] }), [], single(17, []))).toEqual([[]])
  })

  it('shows nothing of a cell it reads that no step removed from', () => {
    expect(shownCandidates(map({ 5: [4] }), [], single(5, [{ cell: 5 }]))).toEqual([[]])
  })
})
