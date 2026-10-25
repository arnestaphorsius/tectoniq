<script setup lang="ts">
import { MAX_CAGE_SIZE, isDigit, type Digit } from '@/domain/puzzle/types'

/**
 * Digits for a pointer or a finger, after the NYT Sudoku pad. It holds no state: the
 * caller knows which cell is selected and decides what each press does to it.
 *
 * The keys are never disabled. Greying the whole pad out each time the selection
 * crossed a given flickered while the player moved around the board; a press with
 * nowhere to write simply does nothing, as the keyboard does.
 */
const emit = defineEmits<{
  digit: [digit: Digit]
  erase: []
}>()

/** Every digit is always offered: the keyboard accepts them all too. */
const DIGITS = Array.from({ length: MAX_CAGE_SIZE }, (_, index) => index + 1).filter(isDigit)
</script>

<template>
  <div class="pad" role="group" aria-label="Number pad" data-testid="number-pad">
    <button
      v-for="digit in DIGITS"
      :key="digit"
      type="button"
      class="control key"
      :data-digit="digit"
      @click="emit('digit', digit)"
    >
      {{ digit }}
    </button>
    <button
      type="button"
      class="control key"
      data-testid="pad-erase"
      aria-label="Erase"
      title="Erase"
      @click="emit('erase')"
    >
      ⌫
    </button>
  </div>
</template>

<style scoped>
/*
 * One row under the grid, three columns beside it. The play screen sets both
 * properties from its one width media query, so the pad never needs a branch of its
 * own; the defaults are the row, which is what a phone gets.
 */
.pad {
  display: grid;
  grid-template-columns: repeat(var(--pad-columns, 6), var(--pad-key, 2.5rem));
  grid-auto-rows: var(--pad-key, 2.5rem);
  gap: var(--space-xs);
}

.key {
  min-height: 0;
  padding: 0;
  font-size: 1.25rem;
  font-variant-numeric: tabular-nums;
}
</style>
