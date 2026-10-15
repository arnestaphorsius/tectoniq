import type { HintResult } from '@/domain/hint'

/**
 * Cells a hint points at. The target is where the digit goes, the reasons are the
 * cells that make the case for it, and dead cells are open ones with nothing left
 * that fits. The caller works these out; the grid only draws them.
 */
export interface HintMarks {
  readonly target?: number
  readonly reasons?: readonly number[]
  readonly dead?: readonly number[]
}

/** How far into a hint the player has asked: where to look, then why. */
export type HintStage = 1 | 2

/**
 * The hint on screen: a result from the domain, plus how much of it is revealed.
 * The stage only means something for a hint; every other result is a single message.
 */
export interface HintView {
  readonly result: HintResult
  readonly stage: HintStage
}

/** What the grid should mark for `view`. The reasons appear at stage 2. */
export function marksFor(view: HintView | null): HintMarks {
  if (view === null) return {}
  const { result, stage } = view
  if (result.kind === 'dead-end') return { dead: result.cells }
  if (result.kind !== 'hint') return {}
  return {
    target: result.placement.cell,
    reasons: stage === 2 ? result.placement.justifying : [],
  }
}
