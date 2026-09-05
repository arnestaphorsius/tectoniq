<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { cageEdges } from '@/domain/grid'
import { isWritable, nextSelection, toggledEntry, type Direction } from '@/domain/selection'
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

const cells = computed(() =>
  props.puzzle.cages.map((_, cell) => {
    const isGiven = props.puzzle.givens[cell] != null
    return {
      cell,
      value: valueAt(props.puzzle, props.board, cell),
      isGiven,
      // Givens are marked too. The marker says "this digit is part of a broken
      // rule", not "fix this cell" — seeing both ends of a conflict is what tells
      // the player what their own digit collided with.
      isOffending: offendingCells.value.has(cell),
      isSelected: selected.value === cell,
      edges: cageEdges(props.puzzle, cell),
    }
  }),
)

/** Any cell can be selected, givens included — arrow keys have to cross them. */
function select(cell: number) {
  selected.value = cell
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

  // A given holds the selection but never takes a digit, so every write below is
  // refused here rather than at the board — the ticket's "cannot alter a given".
  if (!isWritable(props.puzzle, cell)) return

  if (event.key === 'Backspace' || event.key === 'Delete') {
    event.preventDefault()
    emit('entry', cell, null)
    return
  }

  const digit = Number(event.key)
  if (event.key.length === 1 && isDigit(digit)) {
    event.preventDefault()
    emit('entry', cell, toggledEntry(props.puzzle, props.board, cell, digit))
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

// Selection is focus, so move the real focus with it — including on the way out.
// Only a cell of this grid is ever blurred: a click that lands on something else
// focusable has already moved focus there, and stealing it back would be wrong.
watch(selected, (cell) => {
  if (cell === null) {
    const active = document.activeElement
    if (active instanceof HTMLElement && root.value?.contains(active)) active.blur()
    return
  }
  root.value?.querySelector<HTMLElement>(`[data-cell="${cell}"]`)?.focus()
})
</script>

<template>
  <!--
    The frame is the query container the cell size is measured against, and the
    only thing that ever scrolls. Without it a wide grid widened the document and
    dragged the whole page off-centre.
  -->
  <div class="grid-frame">
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
        :tabindex="cell.isSelected ? 0 : -1"
        @click="select(cell.cell)"
      >
        <!--
        The digit is an element rather than bare text so that an empty cell has no
        child nodes at all. Bare text next to the marker leaves a whitespace node
        behind, which makes every cell match `:not(:empty)`.
      -->
        <span v-if="cell.value !== null" class="digit">{{ cell.value }}</span>
        <span
          v-if="cell.isOffending"
          class="marker"
          data-testid="violation-marker"
          role="status"
          aria-label="breaks a rule"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.grid-frame {
  container-type: inline-size;
  width: 100%;
  overflow-x: auto;
}

/*
 * The cell is a function of the space the frame offers and the column count: it
 * fills the column up to 3rem, then shrinks to `--cell-floor` before the frame
 * starts scrolling. The 4px is the grid's own 2px frame on each side.
 */
.grid {
  --cell: clamp(var(--cell-floor), (100cqi - 4px) / var(--cols), 3rem);

  display: grid;
  grid-template-columns: repeat(var(--cols), var(--cell));
  grid-auto-rows: var(--cell);
  width: max-content;
  margin-inline: auto;
  border: 2px solid var(--cage-rule);
  background: var(--paper);
}

.cell {
  position: relative;
  display: grid;
  place-items: center;
  /* Tied to the cell so a digit keeps its proportion as the grid narrows. */
  font-size: max(0.9rem, calc(var(--cell) / 2.4));
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
 * about which cell to look at. It scales with the cell for the same reason the
 * digit does, and stops at 0.5rem so it stays findable in a narrow grid.
 */
.marker {
  --size: max(0.5rem, calc(var(--cell) / 4.3));

  position: absolute;
  top: 0;
  right: 0;
  width: 0;
  height: 0;
  border-top: var(--size) solid var(--bad);
  border-left: var(--size) solid transparent;
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
