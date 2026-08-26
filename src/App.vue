<script setup lang="ts">
import { computed, ref } from 'vue'
import PuzzleGrid from './components/PuzzleGrid.vue'
import { SAMPLE_PUZZLE } from './domain/samplePuzzle'
import { withEntry } from './domain/selection'
import { emptyBoard, type Board, type Digit } from './domain/types'
import { findViolations } from './domain/validate'

// The board is the app's state; the grid owns only which cell is selected. Cage
// drawing (the editor) is a later ticket.
const board = ref<Board>(emptyBoard(SAMPLE_PUZZLE))
const violations = computed(() => findViolations(SAMPLE_PUZZLE, board.value))

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

    <PuzzleGrid :puzzle="SAMPLE_PUZZLE" :board="board" :violations="violations" @entry="onEntry" />

    <p data-testid="violation-count">
      {{ violations.length }} rule {{ violations.length === 1 ? 'violation' : 'violations' }}
    </p>
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
</style>
