<script setup lang="ts">
import { computed, ref, shallowRef } from 'vue'
import PuzzleEditor from './components/PuzzleEditor.vue'
import PuzzleGrid from './components/PuzzleGrid.vue'
import { SAMPLE_PUZZLE } from './domain/samplePuzzle'
import { withEntry } from './domain/selection'
import { emptyBoard, type Board, type Digit, type Puzzle } from './domain/types'
import { findViolations } from './domain/validate'

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

function onEntry(cell: number, digit: Digit | null) {
  board.value = withEntry(board.value, cell, digit)
}
</script>

<template>
  <main class="page">
    <header>
      <h1>Tectoniq</h1>
      <p class="tagline">Help for Tectonic &amp; Suguru puzzles</p>
    </header>

    <nav class="screens">
      <button type="button" data-testid="open-play" @click="screen = 'play'">
        Play the sample
      </button>
      <button type="button" data-testid="open-editor" @click="screen = 'editor'">
        Create a puzzle
      </button>
    </nav>

    <template v-if="screen === 'play'">
      <PuzzleGrid
        :puzzle="SAMPLE_PUZZLE"
        :board="board"
        :violations="violations"
        @entry="onEntry"
      />

      <p data-testid="violation-count">
        {{ violations.length }} rule {{ violations.length === 1 ? 'violation' : 'violations' }}
      </p>
    </template>

    <PuzzleEditor v-else :initial-puzzle="drawn" @change="(puzzle) => (drawn = puzzle)" />
  </main>
</template>

<style scoped>
.page {
  display: grid;
  justify-items: center;
  gap: 1.5rem;
  padding: 2rem 1rem;
}

h1 {
  margin: 0;
  font-size: 1.75rem;
  letter-spacing: -0.02em;
}

.tagline {
  margin: 0.25rem 0 0;
  opacity: 0.7;
  font-size: 0.9rem;
}

header {
  text-align: center;
}

.screens {
  display: flex;
  gap: 0.5rem;
}

.screens button {
  padding: 0.35rem 0.75rem;
  font: inherit;
  cursor: pointer;
}
</style>
