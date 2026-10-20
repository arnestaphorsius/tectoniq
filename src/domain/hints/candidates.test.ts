import { describe, expect, it } from 'vite-plus/test'
import { candidatesFor } from './candidates'
import { F_17, F_START } from './fixtures'
import { SAMPLE_PUZZLE } from '@/domain/puzzle/samplePuzzle'

describe('candidates', () => {
  it("from the sample's givens", () => {
    const candidates = candidatesFor(SAMPLE_PUZZLE, F_START)

    // Cage 3 already holds 3 and 4, and the given 2 at cell 11 touches cell 14.
    expect(candidates[14]).toEqual(new Set([1, 5]))
    // A cage of one admits only the digit 1.
    expect(candidates[17]).toEqual(new Set([1]))
  })

  it('a touching entry removes its digit', () => {
    const candidates = candidatesFor(SAMPLE_PUZZLE, F_17)

    expect(candidates[14]).toEqual(new Set([5]))
  })

  it('filled cells have none', () => {
    const candidates = candidatesFor(SAMPLE_PUZZLE, F_17)

    expect(candidates[17]).toBeNull()
    SAMPLE_PUZZLE.givens.forEach((given, cell) => {
      if (given !== null) expect(candidates[cell]).toBeNull()
    })
  })
})
