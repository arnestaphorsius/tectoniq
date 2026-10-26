import { describe, expect, it } from 'vite-plus/test'
import { SAMPLE_PUZZLE } from '@/domain/puzzle/samplePuzzle'
import { emptyNotes, markedNote, toggledNote, withNotes } from './notes'

describe('emptyNotes', () => {
  it('has an empty mark list for every cell', () => {
    const notes = emptyNotes(SAMPLE_PUZZLE)

    expect(notes).toHaveLength(20)
    expect(notes.every((cell) => cell.length === 0)).toBe(true)
  })
})

describe('toggledNote', () => {
  it('adds a digit that is not marked', () => {
    expect(toggledNote(emptyNotes(SAMPLE_PUZZLE), 0, 3)).toEqual([3])
  })

  it('takes away a digit that is already marked', () => {
    const notes = withNotes(emptyNotes(SAMPLE_PUZZLE), 0, [1, 3])

    expect(toggledNote(notes, 0, 3)).toEqual([1])
  })

  it('keeps the marks in ascending order whatever order they were made in', () => {
    const notes = withNotes(emptyNotes(SAMPLE_PUZZLE), 0, [2, 4])

    expect(toggledNote(notes, 0, 1)).toEqual([1, 2, 4])
    expect(toggledNote(notes, 0, 3)).toEqual([2, 3, 4])
  })
})

describe('markedNote', () => {
  it('adds a digit that is not marked, in order', () => {
    const notes = withNotes(emptyNotes(SAMPLE_PUZZLE), 0, [1, 4])

    expect(markedNote(notes, 0, 2)).toEqual([1, 2, 4])
  })

  it('leaves a digit that is already marked', () => {
    const notes = withNotes(emptyNotes(SAMPLE_PUZZLE), 0, [1, 4])

    expect(markedNote(notes, 0, 4)).toEqual([1, 4])
  })
})

describe('withNotes', () => {
  it('sets one cell and leaves the rest alone', () => {
    const before = withNotes(emptyNotes(SAMPLE_PUZZLE), 1, [2])

    const after = withNotes(before, 0, [1, 5])

    expect(after[0]).toEqual([1, 5])
    expect(after[1]).toEqual([2])
  })

  it('returns new notes rather than changing the old', () => {
    const before = emptyNotes(SAMPLE_PUZZLE)

    withNotes(before, 0, [1])

    expect(before[0]).toEqual([])
  })

  it('ignores a cell outside the grid', () => {
    const before = emptyNotes(SAMPLE_PUZZLE)

    expect(withNotes(before, -1, [1])).toBe(before)
    expect(withNotes(before, 20, [1])).toBe(before)
  })
})
