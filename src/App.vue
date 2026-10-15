<script setup lang="ts">
import { computed, ref, shallowRef, watch } from 'vue'
import HintPanel from './components/HintPanel.vue'
import { marksFor, type HintView } from './components/hintView'
import PuzzleEditor from './components/PuzzleEditor.vue'
import PuzzleGrid from './components/PuzzleGrid.vue'
import { findHint } from './domain/hint'
import { SAMPLE_PUZZLE } from './domain/samplePuzzle'
import { withEntry } from './domain/selection'
import { emptyBoard, type Board, type Digit, type Puzzle } from './domain/types'
import { findViolations, isSolved } from './domain/validate'

// The board is the app's state; the grid owns only which cell is selected.
const board = ref<Board>(emptyBoard(SAMPLE_PUZZLE))
const violations = computed(() => findViolations(SAMPLE_PUZZLE, board.value))

/**
 * One screen shows at a time. The drawn puzzle is held here rather than in the
 * editor because the editor is unmounted on the way to the play screen, and the
 * work has to survive the trip; it lives only as long as the tab does.
 */
const screen = ref<'play' | 'editor'>('play')
const drawn = shallowRef<Puzzle | undefined>()

/**
 * The hint on screen, if any. A hint describes the board it was asked on, so any
 * change to the board — or leaving the screen — throws it away rather than leaving
 * it to go stale. Asking again always starts from the first stage.
 */
const hint = shallowRef<HintView | null>(null)
const solved = computed(() => isSolved(SAMPLE_PUZZLE, board.value))

watch([board, screen], () => (hint.value = null))

function onEntry(cell: number, digit: Digit | null) {
  board.value = withEntry(board.value, cell, digit)
}

function advanceHint() {
  const current = hint.value
  if (current?.result.kind === 'hint' && current.stage === 1) {
    hint.value = { ...current, stage: 2 }
    return
  }
  hint.value = { result: findHint(SAMPLE_PUZZLE, board.value), stage: 1 }
}

function fillHint() {
  const result = hint.value?.result
  if (result?.kind === 'hint') onEntry(result.placement.cell, result.placement.digit)
}
</script>

<template>
  <main class="page">
    <div class="chrome">
      <header>
        <h1>Tectoniq</h1>
        <p class="tagline">Help for Tectonic &amp; Suguru puzzles</p>
      </header>

      <nav class="screens">
        <button
          type="button"
          data-testid="open-play"
          :class="{ current: screen === 'play' }"
          :aria-current="screen === 'play' ? 'page' : undefined"
          @click="screen = 'play'"
        >
          Play the sample
        </button>
        <button
          type="button"
          data-testid="open-editor"
          :class="{ current: screen === 'editor' }"
          :aria-current="screen === 'editor' ? 'page' : undefined"
          @click="screen = 'editor'"
        >
          Create a puzzle
        </button>
      </nav>
    </div>

    <div v-if="screen === 'play'" class="work">
      <PuzzleGrid
        :puzzle="SAMPLE_PUZZLE"
        :board="board"
        :violations="violations"
        :marks="marksFor(hint)"
        @entry="onEntry"
      />

      <HintPanel
        :view="hint"
        :solved="solved"
        @advance="advanceHint"
        @fill="fillHint"
        @close="hint = null"
      />
    </div>

    <PuzzleEditor v-else :initial-puzzle="drawn" @change="(puzzle) => (drawn = puzzle)" />
  </main>
</template>

<style scoped>
/*
 * Two blocks, far apart: the chrome you navigate with, and the puzzle you came
 * for. Everything inside a block is bound to it by a much smaller gap, so the
 * squint test resolves to those two before it resolves to anything else.
 */
.page {
  max-width: var(--measure);
  margin-inline: auto;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  justify-items: center;
  gap: var(--space-xl);
  padding: var(--space-xl) var(--space-md);
}

.chrome {
  display: grid;
  justify-items: center;
  gap: var(--space-md);
}

header {
  text-align: center;
}

h1 {
  margin: 0;
  font-size: 1.75rem;
  letter-spacing: -0.02em;
}

.tagline {
  margin: var(--space-2xs) 0 0;
  opacity: 0.7;
  font-size: 0.9rem;
}

/*
 * The switcher is navigation, not a control on the puzzle, so it is set as text
 * rather than as two filled buttons — as buttons they were the highest-contrast
 * objects on the page and beat the grid in the squint test. The current screen is
 * marked three ways over, so it survives greyscale and a dropped colour: full ink
 * against 0.7, weight 600, and a 2px rule under it.
 */
.screens {
  display: flex;
  gap: var(--space-lg);
}

.screens button {
  padding: var(--space-sm) var(--space-2xs);
  border: 0;
  border-bottom: 2px solid transparent;
  background: none;
  color: var(--ink);
  opacity: 0.7;
  font: inherit;
  cursor: pointer;
}

.screens button:hover {
  opacity: 1;
}

.screens button:focus-visible {
  outline: 2px solid var(--ink);
  outline-offset: 2px;
  opacity: 1;
}

.screens button.current {
  border-bottom-color: var(--ink);
  opacity: 1;
  font-weight: 600;
}

/* The hint panel acts on the grid, so it is held close to it. */
.work {
  width: 100%;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  justify-items: center;
  gap: var(--space-sm);
}
</style>
