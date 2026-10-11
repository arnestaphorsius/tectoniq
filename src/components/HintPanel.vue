<script setup lang="ts">
import { computed } from 'vue'
import { HINT_MESSAGES } from '@/domain/hintCopy'
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
const advanceLabel = computed(() => (hint.value === null ? 'Hint' : 'Why?'))

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
    <!-- Always present, so a screen reader is already listening when text arrives. -->
    <div class="hint-text" role="status" data-testid="hint-status">
      <template v-if="hint">
        <p v-if="stage === 1">{{ HINT_MESSAGES.whereToLook }}</p>
        <template v-else>
          <p class="strategy" data-testid="hint-strategy">{{ hint.placement.strategy }}</p>
          <p data-testid="hint-explanation">{{ hint.placement.explanation }}</p>
        </template>
      </template>
      <p v-else-if="message" data-testid="hint-message" :data-kind="message.kind">
        {{ message.text }}
      </p>
    </div>

    <div class="hint-actions">
      <button
        v-if="hint && stage === 2"
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
