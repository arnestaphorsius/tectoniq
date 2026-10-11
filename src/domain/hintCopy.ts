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

  /** `byEarlierSteps`: some options were ruled out by earlier steps, not by the board. */
  nakedSingle: (size: number, byEarlierSteps: boolean) =>
    `This cell's cage only allows 1 to ${size}. A digit can't repeat within its cage, and equal digits may not touch, not even diagonally. ` +
    (byEarlierSteps
      ? 'The highlighted digits and the steps before this one rule out every option but one.'
      : 'Between them, the highlighted digits rule out every option but one.'),

  hiddenSingle: (size: number) =>
    `${cageRule(size)} One digit this cage still needs has been ruled out of every other open cell in it, highlighted, so it can only go here.`,
} as const

/** What the hint panel says outside the explanation itself. */
export const HINT_MESSAGES = {
  /** Stage 1, while only the target cell is marked. */
  whereToLook: 'Look at the highlighted cell. Can you work out what goes there?',
  violations: 'The board breaks a rule. Fix the marked cells first, then ask again.',
  none: 'No hint found. None of the strategies Tectoniq knows can place a digit from here.',
  deadEnd:
    "This board can't be completed as it stands: the highlighted cells have no digit left that fits. An entry may be wrong.",
} as const
