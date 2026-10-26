import type { Digit, Puzzle } from '@/domain/puzzle/types'

/**
 * The candidates the player has marked in each cell, row-major like the board: the
 * digits they think a cell could still take, in ascending order, or none.
 *
 * These are the player's own pencil marks, and only the player changes them. They
 * are not the hint loop's `Candidates` (`@/domain/hints/candidates`), which are
 * worked out from the rules and never shown; a player's marks can be wrong, and the
 * hint loop never reads them. In code they are notes, so the two cannot be confused;
 * on screen they are candidates, the word the player knows them by.
 */
export type Notes = readonly (readonly Digit[])[]

/**
 * What a digit press does: write the digit, or mark it as a candidate. The player
 * switches between the two; Shift and a digit marks one candidate in either.
 */
export type EntryMode = 'normal' | 'candidate'

/** No candidates marked anywhere, sized for `puzzle`. */
export function emptyNotes(puzzle: Puzzle): Notes {
  return Array.from({ length: puzzle.width * puzzle.height }, (): readonly Digit[] => [])
}

/**
 * What marking `digit` in `cell` should leave there: the cell's candidates with
 * `digit` added, or taken away when it is already marked. Kept in ascending order,
 * so a cell's marks never depend on the order they were made in.
 */
export function toggledNote(notes: Notes, cell: number, digit: Digit): readonly Digit[] {
  const current = notes[cell] ?? []
  if (current.includes(digit)) return current.filter((marked) => marked !== digit)
  return [...current, digit].sort((a, b) => a - b)
}

/**
 * The cell's candidates with `digit` marked: added when missing, and left as they
 * are when it is already there. For a press that must end with the candidate
 * showing — replacing a digit, where toggling a kept mark off would leave the cell
 * without the one just pressed.
 */
export function markedNote(notes: Notes, cell: number, digit: Digit): readonly Digit[] {
  const current = notes[cell] ?? []
  return current.includes(digit) ? current : toggledNote(notes, cell, digit)
}

/**
 * The notes with `cell` holding `digits`. Returns new notes rather than mutating,
 * like `withEntry`, and the same notes when the cell is outside the grid.
 */
export function withNotes(notes: Notes, cell: number, digits: readonly Digit[]): Notes {
  if (cell < 0 || cell >= notes.length) return notes
  const next = [...notes]
  next[cell] = digits
  return next
}
