import type { HintResult } from '@/domain/hints/hint'
import type { ShownCandidates } from '@/domain/hints/shown'
import type { Step } from '@/domain/hints/strategies/step'

/**
 * What a hint marks on the grid. The target is where the digit goes, the reasons are
 * the cells that make the case for the step on show, and dead cells are open ones
 * with nothing left that fits. `candidates` are the cells the step draws candidates
 * in, in place of the player's own; a cell the step rules digits out of has them
 * crossed out there. The caller works these out; the grid only draws them.
 */
export interface HintMarks {
  readonly target?: number
  readonly reasons?: readonly number[]
  readonly dead?: readonly number[]
  readonly candidates?: readonly ShownCandidates[]
}

/**
 * How far into a hint the player has asked. Stage 1 points at the target. Each
 * elimination the hint depends on then takes a stage of its own, in the order they
 * were applied, and the last stage gives the placement's why.
 */
export type HintStage = number

/**
 * The hint on screen: a result from the domain, plus how much of it is revealed.
 * The stage only means something for a hint; every other result is a single message.
 *
 * `handedBack` holds the cells the player has pressed a candidate or a clear in
 * while this stage drew its own there. They show the player's again, so a press made
 * while reading a hint is seen to land, until the next stage draws its own.
 */
export interface HintView {
  readonly result: HintResult
  readonly stage: HintStage
  readonly handedBack?: readonly number[]
}

/** The stage that gives the placement's why, after which only "Fill in" is left. */
export function lastStage(result: HintResult): HintStage {
  return result.kind === 'hint' ? result.leadUp.length + 2 : 1
}

/** The step being explained: an elimination, then the placement. None at stage 1. */
export function shownStep(view: HintView | null): Step | null {
  if (view?.result.kind !== 'hint' || view.stage === 1) return null
  const { leadUp, placement } = view.result
  return leadUp[view.stage - 2] ?? placement
}

/** The next stage of `view`, which draws all of its candidates again. */
export function nextStage(view: HintView): HintView {
  return { result: view.result, stage: view.stage + 1 }
}

/** What the grid should mark for `view`. The target stays marked at every stage. */
export function marksFor(view: HintView | null): HintMarks {
  if (view === null) return {}
  const { result } = view
  if (result.kind === 'dead-end') return { dead: result.cells }
  if (result.kind !== 'hint') return {}

  const step = shownStep(view)
  const shown = step === null ? [] : (result.shown[view.stage - 2] ?? [])
  const handedBack = view.handedBack ?? []
  return {
    target: result.placement.cell,
    reasons: step?.justifying ?? [],
    candidates: shown.filter(({ cell }) => !handedBack.includes(cell)),
  }
}

/**
 * `view` with `cell` handed back to the player, once their candidates there change or
 * are uncovered: the same view when the stage draws no candidates in it.
 */
export function handBack(view: HintView, cell: number): HintView {
  const drawn = marksFor(view).candidates ?? []
  if (!drawn.some((shown) => shown.cell === cell)) return view
  return { ...view, handedBack: [...(view.handedBack ?? []), cell] }
}
