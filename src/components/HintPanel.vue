<script setup lang="ts">
import { computed } from 'vue'
import type { HintView } from './hintView'

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

/** One button walks the stages, so its label says what pressing it reveals. */
const advanceLabel = computed(() => {
  if (hint.value === null) return 'Hint'
  return stage.value === 1 ? 'Why?' : 'Show digit'
})

const MESSAGES = {
  violations: 'The board breaks a rule. Fix the marked cells first, then ask again.',
  none: 'No hint found. None of the strategies Tectoniq knows can place a digit from here.',
  'dead-end':
    "This board can't be completed as it stands: the highlighted cells have no digit left that fits. An entry may be wrong.",
} as const

const message = computed(() => {
  const kind = props.view?.result.kind
  return kind === undefined || kind === 'hint' ? null : { kind, text: MESSAGES[kind] }
})
</script>

<template>
  <section class="hint" aria-label="Hint">
    <!-- Always present, so a screen reader is already listening when text arrives. -->
    <div class="hint-text" role="status" data-testid="hint-status">
      <template v-if="hint">
        <p v-if="stage === 1">Look at the highlighted cell. Can you work out what goes there?</p>
        <template v-else>
          <p class="strategy" data-testid="hint-strategy">{{ hint.placement.strategy }}</p>
          <p data-testid="hint-explanation">{{ hint.placement.explanation }}</p>
          <p v-if="stage === 3" data-testid="hint-digit">
            It's a <strong class="digit">{{ hint.placement.digit }}</strong
            >.
          </p>
        </template>
      </template>
      <p v-else-if="message" data-testid="hint-message" :data-kind="message.kind">
        {{ message.text }}
      </p>
    </div>

    <div class="hint-actions">
      <button
        v-if="hint && stage === 3"
        type="button"
        class="control"
        data-testid="hint-fill"
        @click="emit('fill')"
      >
        Fill in
      </button>
      <button
        v-else
        type="button"
        class="control"
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
  </section>
</template>

<style scoped>
/*
 * Text above, controls below, bound tightly: the panel is one thing the player reads
 * and then acts on. The measure is held short so an explanation reads as a sentence
 * rather than a banner across a wide grid.
 */
.hint {
  display: grid;
  justify-items: center;
  gap: var(--space-xs);
  max-width: 34rem;
  text-align: center;
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

.strategy {
  font-weight: 600;
}

.digit {
  color: var(--entry);
  font-variant-numeric: tabular-nums;
}

.hint-actions {
  display: flex;
  gap: var(--space-xs);
}

.close {
  padding: 0 var(--space-sm);
  font-size: 1.25rem;
  line-height: 1;
}
</style>
