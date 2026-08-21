<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { cageAt, coordOf, indexOf } from '@/domain/grid'
import { isSelectable, nextSelection, type Direction } from '@/domain/selection'
import { isDigit, type Board, type Digit, type Puzzle } from '@/domain/types'
import { valueAt, type Violation } from '@/domain/validate'

const props = defineProps<{
  puzzle: Puzzle
  board: Board
  violations: readonly Violation[]
}>()

/**
 * The grid owns the selection because selection is view state — which cell the
 * keyboard is pointed at — while the board is domain state owned by the caller.
 * Digits therefore leave as an event rather than being written here.
 */
const emit = defineEmits<{
  entry: [cell: number, digit: Digit | null]
}>()

const selected = ref<number | null>(null)
const root = ref<HTMLElement | null>(null)

const ARROW_DIRECTIONS: Readonly<Record<string, Direction>> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
}

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
  props.puzzle.cages.map((_, cell) => {
    const isGiven = props.puzzle.givens[cell] != null
    return {
      cell,
      value: valueAt(props.puzzle, props.board, cell),
      isGiven,
      // A given is never marked: the player cannot act on it, and the ticket asks
      // for the marker only where a digit was entered.
      isOffending: offendingCells.value.has(cell) && !isGiven,
      isSelected: selected.value === cell,
      edges: cageEdges(cell),
    }
  }),
)

/** Clicking a given is a no-op — the previous selection survives it. */
function select(cell: number) {
  if (isSelectable(props.puzzle, cell)) selected.value = cell
}

function onKeydown(event: KeyboardEvent) {
  const cell = selected.value
  if (cell === null) return

  const direction = ARROW_DIRECTIONS[event.key]
  if (direction) {
    event.preventDefault()
    selected.value = nextSelection(props.puzzle, cell, direction)
    return
  }

  if (event.key === 'Escape') {
    event.preventDefault()
    selected.value = null
    return
  }

  if (event.key === 'Backspace' || event.key === 'Delete') {
    event.preventDefault()
    emit('entry', cell, null)
    return
  }

  const digit = Number(event.key)
  if (event.key.length === 1 && isDigit(digit)) {
    event.preventDefault()
    emit('entry', cell, digit)
  }
}

/** A click anywhere outside the grid drops the selection. */
function onDocumentClick(event: MouseEvent) {
  const target = event.target
  if (target instanceof Node && root.value?.contains(target)) return
  selected.value = null
}

onMounted(() => document.addEventListener('click', onDocumentClick))
onBeforeUnmount(() => document.removeEventListener('click', onDocumentClick))

// Selection is focus, so move the real focus with it.
watch(selected, (cell) => {
  if (cell === null) return
  root.value?.querySelector<HTMLElement>(`[data-cell="${cell}"]`)?.focus()
})
</script>

<template>
  <div
    ref="root"
    class="grid"
    data-testid="puzzle-grid"
    :style="{ '--cols': puzzle.width }"
    role="grid"
    :aria-label="`${puzzle.width} by ${puzzle.height} Tectonic puzzle`"
    @keydown="onKeydown"
  >
    <div
      v-for="cell in cells"
      :key="cell.cell"
      class="cell"
      :class="[cell.edges, { given: cell.isGiven, selected: cell.isSelected }]"
      data-testid="cell"
      :data-cell="cell.cell"
      role="gridcell"
      :aria-selected="cell.isSelected ? 'true' : undefined"
      :tabindex="cell.isGiven ? undefined : cell.isSelected ? 0 : -1"
      @click="select(cell.cell)"
    >
      {{ cell.value ?? '' }}
      <span
        v-if="cell.isOffending"
        class="marker"
        data-testid="violation-marker"
        role="status"
        aria-label="breaks a rule"
      />
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
  position: relative;
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

.cell.selected {
  outline: 3px solid var(--entry);
  outline-offset: -3px;
}

/*
 * The violation marker. A right triangle in the top-right corner, rather than
 * recolouring the digit — a red digit reads as a styling choice and says nothing
 * about which cell to look at.
 */
.marker {
  position: absolute;
  top: 0;
  right: 0;
  width: 0;
  height: 0;
  border-top: 0.7rem solid var(--bad);
  border-left: 0.7rem solid transparent;
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
