<script setup lang="ts">
import type { EntryMode } from '@/domain/input/notes'
import { MAX_CAGE_SIZE, isDigit, type Digit } from '@/domain/puzzle/types'

/**
 * Digits for a pointer or a finger, after the NYT Sudoku pad. It holds no state of
 * its own: the caller knows which cell is selected and decides what each press does
 * to it, and owns the mode the toggle switches.
 *
 * The keys are never disabled. Greying the whole pad out each time the selection
 * crossed a given flickered while the player moved around the board; a press with
 * nowhere to write simply does nothing, as the keyboard does.
 */
const emit = defineEmits<{
  digit: [digit: Digit]
  erase: []
}>()

/** Whether a digit is written or marked as a candidate. */
const mode = defineModel<EntryMode>('mode', { default: 'normal' })

const MODES: readonly { readonly mode: EntryMode; readonly label: string }[] = [
  { mode: 'normal', label: 'Normal' },
  { mode: 'candidate', label: 'Candidate' },
]

/** Every digit is always offered: the keyboard accepts them all too. */
const DIGITS = Array.from({ length: MAX_CAGE_SIZE }, (_, index) => index + 1).filter(isDigit)
</script>

<template>
  <div class="pad" role="group" aria-label="Number pad" data-testid="number-pad">
    <div class="modes segmented" role="group" aria-label="Entry mode">
      <button
        v-for="option in MODES"
        :key="option.mode"
        type="button"
        class="control"
        :class="{ current: mode === option.mode }"
        :aria-pressed="mode === option.mode ? 'true' : 'false'"
        :data-mode="option.mode"
        @click="mode = option.mode"
      >
        {{ option.label }}
      </button>
    </div>

    <div class="keys">
      <button
        v-for="digit in DIGITS"
        :key="digit"
        type="button"
        class="control key die"
        :data-digit="digit"
        @click="emit('digit', digit)"
      >
        <span class="face" :data-note="mode === 'candidate' ? digit : undefined">{{ digit }}</span>
      </button>
      <button
        type="button"
        class="control key die"
        data-testid="pad-erase"
        aria-label="Erase"
        title="Erase"
        @click="emit('erase')"
      >
        <span class="face">⌫</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.pad {
  display: grid;
  gap: var(--space-xs);
}

/*
 * The mode toggle spans the keys exactly and never widens them: beside the grid the
 * pad is `--pad-width`, which the play screen's measure is summed from. Label size
 * and tight padding are what let "Candidate" fit half of 11.5rem. It is joined and
 * marked by `.segmented` (style.css), like the editor's size presets, because two
 * modes are one choice.
 */
.modes {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.modes .control {
  padding: 0 var(--space-xs);
  font-size: 0.9rem;
}

/*
 * One row under the grid, three columns beside it. The play screen sets both
 * properties from its one width media query, so the pad never needs a branch of its
 * own; the defaults are the row, which is what a phone gets.
 */
.keys {
  display: grid;
  grid-template-columns: repeat(var(--pad-columns, 6), var(--pad-key, 2.5rem));
  grid-auto-rows: var(--pad-key, 2.5rem);
  gap: var(--space-xs);
}

/*
 * A key is a die face (`.die`, style.css), like a cell holding candidates. In
 * Normal mode its face carries no `data-note` and spans all of it; in Candidate
 * mode the face takes the place that candidate takes in a cell, so the pad shows
 * what a press will draw.
 */
.key {
  min-height: 0;
  /* The same inset as a cell's candidates, in proportion to the key. */
  padding: calc(var(--pad-key, 2.5rem) / 14);
  font-size: 1.25rem;
  font-variant-numeric: tabular-nums;
}

.face {
  place-self: center;
}

.face:not([data-note]) {
  grid-area: 1 / 1 / 4 / 4;
}

/* Tied to the key, as a cell's candidates are tied to the cell: one third of it. */
.face[data-note] {
  font-size: calc(var(--pad-key, 2.5rem) / 3);
}
</style>
