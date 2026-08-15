<script setup lang="ts">
import { computed } from 'vue'
import { cageAt, coordOf, indexOf } from '@/domain/grid'
import type { Board, Puzzle } from '@/domain/types'
import { valueAt, type Violation } from '@/domain/validate'

const props = defineProps<{
  puzzle: Puzzle
  board: Board
  violations: readonly Violation[]
}>()

/** Cells named by any violation, so they can be marked in the grid. */
const offendingCells = computed(() => {
  const cells = new Set<number>()
  for (const violation of props.violations) {
    if (violation.kind === 'value-exceeds-cage') cells.add(violation.cell)
    else for (const cell of violation.cells) cells.add(cell)
  }
  return cells
})

/**
 * A cage boundary is any edge where the neighbour sits in a different cage, or
 * where the grid ends. Drawing per-cell keeps this independent of cage shape.
 */
function cageEdges(cell: number) {
  const { row, col } = coordOf(props.puzzle, cell)
  const own = cageAt(props.puzzle, cell)
  const differs = (dRow: number, dCol: number): boolean => {
    const next = { row: row + dRow, col: col + dCol }
    if (
      next.row < 0 ||
      next.row >= props.puzzle.height ||
      next.col < 0 ||
      next.col >= props.puzzle.width
    ) {
      return true
    }
    return cageAt(props.puzzle, indexOf(props.puzzle, next)) !== own
  }
  return {
    'edge-top': differs(-1, 0),
    'edge-right': differs(0, 1),
    'edge-bottom': differs(1, 0),
    'edge-left': differs(0, -1),
  }
}

const cells = computed(() =>
  props.puzzle.cages.map((_, cell) => ({
    cell,
    value: valueAt(props.puzzle, props.board, cell),
    isGiven: props.puzzle.givens[cell] != null,
    isOffending: offendingCells.value.has(cell),
    edges: cageEdges(cell),
  })),
)
</script>

<template>
  <div
    class="grid"
    data-testid="puzzle-grid"
    :style="{ '--cols': puzzle.width }"
    role="grid"
    :aria-label="`${puzzle.width} by ${puzzle.height} Tectonic puzzle`"
  >
    <div
      v-for="cell in cells"
      :key="cell.cell"
      class="cell"
      :class="[cell.edges, { given: cell.isGiven, offending: cell.isOffending }]"
      data-testid="cell"
      :data-cell="cell.cell"
      role="gridcell"
    >
      {{ cell.value ?? '' }}
    </div>
  </div>
</template>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: repeat(var(--cols), 1fr);
  border: 2px solid var(--cage-rule);
  background: var(--paper);
}

.cell {
  width: 3rem;
  height: 3rem;
  display: grid;
  place-items: center;
  font-size: 1.25rem;
  font-variant-numeric: tabular-nums;
  color: var(--entry);
  border: 1px solid var(--rule);
}

.cell.given {
  color: var(--given);
  font-weight: 600;
}

.cell.offending {
  color: var(--bad);
}

/* Cage outlines sit on top of the light interior rules. */
.cell.edge-top {
  border-top: 2px solid var(--cage-rule);
}
.cell.edge-right {
  border-right: 2px solid var(--cage-rule);
}
.cell.edge-bottom {
  border-bottom: 2px solid var(--cage-rule);
}
.cell.edge-left {
  border-left: 2px solid var(--cage-rule);
}
</style>
