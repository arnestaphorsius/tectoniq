<script setup lang="ts">
import { computed } from 'vue'
import PuzzleGrid from './components/PuzzleGrid.vue'
import { SAMPLE_PUZZLE } from './domain/samplePuzzle'
import { emptyBoard } from './domain/types'
import { findViolations } from './domain/validate'

// The skeleton renders a fixed puzzle read-only. Digit entry (the player) and
// cage drawing (the editor) are the first two tickets through the factory.
const board = emptyBoard(SAMPLE_PUZZLE)
const violations = computed(() => findViolations(SAMPLE_PUZZLE, board))
</script>

<template>
  <main class="page">
    <header>
      <h1>Tectoniq</h1>
      <p class="tagline">Help for Tectonic &amp; Suguru puzzles</p>
    </header>

    <PuzzleGrid :puzzle="SAMPLE_PUZZLE" :board="board" :violations="violations" />

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
