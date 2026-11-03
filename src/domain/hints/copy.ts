/**
 * Every word a hint shows the player, in one place so it can be edited without
 * reading any solving logic.
 *
 * Explanations state the rules in plain words, never by number. They are shown
 * before the digit is filled in, so none of them names the digit.
 */

/** Rule 2, for a cage of `size` cells. */
const cageRule = (size: number) =>
  size === 1
    ? 'A cage of a single cell holds just one digit: the smallest there is.'
    : `A cage of ${size} cells holds each digit from 1 to ${size} exactly once.`

/** Rule 3. */
const touchRule = 'Equal digits may not touch, not even diagonally.'

/**
 * What rules a placement's other options out: digits on the board, which are
 * highlighted; the steps before it, whose work the grid shows crossed out; or both.
 */
export type RuledOutBy = 'board' | 'steps' | 'both'

/** Why each strategy's digit must go where it does, keyed by strategy. */
export const EXPLANATIONS = {
  fullBlock: (size: number) =>
    size === 1
      ? `${cageRule(1)} This cell is a cage on its own, so there is nothing else it could be.`
      : `${cageRule(size)} Every other cell of this cage is filled, so this cell takes the one digit still missing.`,

  unique: (size: number) =>
    `${cageRule(size)} ${touchRule} One digit this cage still needs is ruled out of every other open cell by a highlighted copy of it nearby, so this is the only place left for it.`,

  crown: (size: number) =>
    `${touchRule} This cell's cage only allows 1 to ${size}, and the highlighted digits around it already use every one of those but one.`,

  /** `by` says what rules the other options out of this cell. */
  nakedSingle: (size: number, by: RuledOutBy) =>
    `This cell's cage only allows 1 to ${size}. A digit can't repeat within its cage, and equal digits may not touch, not even diagonally. ` +
    {
      board: 'Between them, the highlighted digits rule out every option but one.',
      steps:
        'The steps before this one ruled out every option but one, and those are crossed out in this cell.',
      both: 'The steps before this one ruled out the digits crossed out in this cell, and the highlighted digits rule out all but one of the rest.',
    }[by],

  /** `by` says what rules the digit out of the cage's other open cells. */
  hiddenSingle: (size: number, by: RuledOutBy) =>
    `${cageRule(size)} One digit this cage still needs has been ruled out of every other open cell in it, highlighted, so it can only go here.` +
    (by === 'board'
      ? ''
      : ' In the cells where it is crossed out, the steps before this one ruled it out.'),

  /** Eliminations name their pair's digits: they are not the digit being hinted at. */
  nakedPair: (size: number, [a, b]: readonly [number, number]) =>
    `${cageRule(size)} The two highlighted cells can each only be ${a} or ${b}, so between them they take both. That rules ${a} and ${b} out of the rest of this cage, where they are crossed out.`,

  touchingPair: ([a, b]: readonly [number, number]) =>
    `${touchRule} The two highlighted cells touch, so they can't be equal, and each can only be ${a} or ${b}. One of them is ${a} and the other ${b}, so a cell touching both can be neither, and they are crossed out there.`,
} as const

/**
 * What a screen reader is told about a cell where a hint draws candidates, which are
 * drawn for the eye only, as the player's own are: "hint: candidates 1, 2" or
 * "hint: candidates 2, 4; crossed out 1".
 */
export function hintCandidatesLabel(digits: readonly number[], struck: readonly number[]): string {
  const parts = [
    ...(digits.length > 0 ? [`candidates ${digits.join(', ')}`] : []),
    ...(struck.length > 0 ? [`crossed out ${struck.join(', ')}`] : []),
  ]
  return `hint: ${parts.join('; ')}`
}

/** What the hint panel says outside the explanation itself. */
export const HINT_MESSAGES = {
  /** Stage 1, while only the target cell is marked. */
  whereToLook: 'Look at the highlighted cell. Can you work out what goes there?',
  violations: 'The board breaks a rule. Fix the marked cells first, then ask again.',
  none: 'No hint found. None of the strategies Tectoniq knows can place a digit from here.',
  deadEnd:
    "This board can't be completed as it stands: the highlighted cells have no digit left that fits. An entry may be wrong.",
} as const
