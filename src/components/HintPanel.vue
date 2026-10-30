<script setup lang="ts">
import { computed } from 'vue'
import { HINT_MESSAGES } from '@/domain/hints/copy'
import { lastStage, shownStep, type HintView } from './hintView'

/**
 * Shows a hint one stage at a time and says what the player can do next. It holds no
 * state of its own: the caller owns the hint and decides what each button does.
 */
const props = defineProps<{
  view: HintView | null
  /** Set once the board is solved, when there is nothing left to hint at. */
  solved: boolean
}>()

const emit = defineEmits<{
  /** Ask for a hint, or reveal the next stage of the one showing. */
  advance: []
  fill: []
  close: []
}>()

const hint = computed(() => (props.view?.result.kind === 'hint' ? props.view.result : null))
const stage = computed(() => props.view?.stage ?? 1)
const step = computed(() => shownStep(props.view))
const atLast = computed(() => hint.value !== null && stage.value === lastStage(hint.value))

/**
 * Where an explanation stands among the hint's steps, so a player pressing Next
 * knows how far there is to go. A hint explained in a single step needs no count.
 */
const progress = computed(() => {
  if (hint.value === null || step.value === null) return null
  const steps = lastStage(hint.value) - 1
  return steps > 1 ? `Step ${stage.value - 1} of ${steps}` : null
})

/**
 * One button walks the stages, so its label says what pressing it reveals: the why
 * after the target, and then, while an elimination is on show, the next step.
 */
const advanceLabel = computed(() => {
  if (hint.value === null) return 'Hint'
  return stage.value === 1 ? 'Why?' : 'Next'
})

const MESSAGES = {
  violations: HINT_MESSAGES.violations,
  none: HINT_MESSAGES.none,
  'dead-end': HINT_MESSAGES.deadEnd,
} as const

const message = computed(() => {
  const kind = props.view?.result.kind
  return kind === undefined || kind === 'hint' ? null : { kind, text: MESSAGES[kind] }
})
</script>

<template>
  <section class="hint" aria-label="Hint">
    <div class="hint-actions">
      <button
        v-if="atLast"
        type="button"
        class="control primary"
        data-testid="hint-fill"
        @click="emit('fill')"
      >
        Fill in
      </button>
      <button
        v-else
        type="button"
        class="control primary"
        data-testid="hint-advance"
        :disabled="solved && view === null"
        @click="emit('advance')"
      >
        {{ advanceLabel }}
      </button>
      <button
        v-if="view"
        type="button"
        class="control close"
        data-testid="hint-close"
        aria-label="Close hint"
        @click="emit('close')"
      >
        ×
      </button>
    </div>

    <!-- Always present, so a screen reader is already listening when text arrives. -->
    <div class="hint-text" role="status" data-testid="hint-status">
      <template v-if="hint">
        <p v-if="step === null">{{ HINT_MESSAGES.whereToLook }}</p>
        <template v-else>
          <p v-if="progress" class="progress" data-testid="hint-progress">{{ progress }}</p>
          <p class="strategy" data-testid="hint-strategy" :data-step="step.kind">
            {{ step.strategy }}
          </p>
          <p data-testid="hint-explanation">{{ step.explanation }}</p>
        </template>
      </template>
      <p v-else-if="message" data-testid="hint-message" :data-kind="message.kind">
        {{ message.text }}
      </p>
    </div>
  </section>
</template>

<style scoped>
/*
 * Controls above, text below, bound tightly. The player presses the same spot
 * through every stage, so nothing may move the main button: the text that comes
 * and goes and changes length sits under it, the close control has its own column
 * beside it, and the button keeps one width whatever its label says.
 *
 * The caller holds the panel to the grid's width, and the text is set flush left
 * inside it: an explanation runs to several lines, and a centred paragraph gives
 * the eye no edge to return to. The buttons stay centred, on the axis of the grid
 * and the pad above them. The measure is capped so a wide grid's explanation still
 * reads as a sentence rather than a banner.
 */
.hint {
  justify-self: center;
  width: 100%;
  display: grid;
  gap: var(--space-xs);
  max-width: 34rem;
}

.hint-text:empty {
  display: none;
}

.hint-text p {
  margin: 0;
  line-height: 1.45;
}

.hint-text p + p {
  margin-top: var(--space-2xs);
}

.progress {
  opacity: 0.7;
  font-size: 0.9rem;
}

.hint-text .progress + .strategy {
  margin-top: 0;
}

.strategy {
  font-weight: 600;
}

.hint-actions {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: var(--space-xs);
}

.primary {
  grid-column: 2;
  min-width: 6rem;
}

.close {
  grid-column: 3;
  justify-self: start;
  padding: 0 var(--space-sm);
  font-size: 1.25rem;
  line-height: 1;
}
</style>
