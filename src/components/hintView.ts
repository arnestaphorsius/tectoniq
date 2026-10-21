import type { HintResult } from '@/domain/hints/hint'
import type { Step } from '@/domain/hints/strategies/step'

/**
 * Cells a hint points at. The target is where the digit goes, the reasons are the
 * cells that make the case for the step on show, losing cells are the ones that step
 * rules digits out of, and dead cells are open ones with nothing left that fits. The
 * caller works these out; the grid only draws them.
 */
export interface HintMarks {
  readonly target?: number
  readonly reasons?: readonly number[]
  readonly losing?: readonly number[]
  readonly dead?: readonly number[]
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
 */
export interface HintView {
  readonly result: HintResult
  readonly stage: HintStage
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

/** What the grid should mark for `view`. The target stays marked at every stage. */
export function marksFor(view: HintView | null): HintMarks {
  if (view === null) return {}
  const { result } = view
  if (result.kind === 'dead-end') return { dead: result.cells }
  if (result.kind !== 'hint') return {}

  const step = shownStep(view)
  return {
    target: result.placement.cell,
    reasons: step?.justifying ?? [],
    losing: step?.kind === 'elimination' ? step.removals.map((removal) => removal.cell) : [],
  }
}
