<script setup lang="ts">
import { computed, onBeforeUnmount, ref, shallowRef } from 'vue'
import {
  DEFAULT_GRID_SIZE,
  MAX_GRID_SIZE,
  MIN_GRID_SIZE,
  oneCellPerCage,
  SIZE_PRESETS,
  sizeProblem,
  withCells,
} from '@/domain/cages'
import { cageEdges } from '@/domain/grid'
import type { Puzzle } from '@/domain/types'

const props = defineProps<{ initialPuzzle?: Puzzle | undefined }>()

/**
 * The editor owns the puzzle while it is mounted and emits every version of it, so
 * the composition root can hand the last one back when this component is mounted
 * again. `initialPuzzle` seeds it once and is deliberately not watched: a prop that
 * wrote back into the grid mid-drag would fight the drag for control of it.
 */
const emit = defineEmits<{ change: [Puzzle] }>()

const puzzle = shallowRef<Puzzle>(
  props.initialPuzzle ?? oneCellPerCage(DEFAULT_GRID_SIZE, DEFAULT_GRID_SIZE),
)

// `v-model` on a number input casts for us, and hands back '' for a blank or
// unparseable field — so these hold whichever of the two the field currently is.
const widthField = ref<number | string>(puzzle.value.width)
const heightField = ref<number | string>(puzzle.value.height)
const refusal = ref<string | null>(null)

const REFUSAL = `Width and height must be whole numbers from ${MIN_GRID_SIZE} to ${MAX_GRID_SIZE}.`

const cells = computed(() =>
  puzzle.value.cages.map((_, cell) => ({ cell, edges: cageEdges(puzzle.value, cell) })),
)

function commit(next: Puzzle) {
  puzzle.value = next
  emit('change', next)
}

/** Every size change starts the layout over — the ticket asks for no prompt. */
function resize(width: number, height: number) {
  refusal.value = null
  widthField.value = width
  heightField.value = height
  commit(oneCellPerCage(width, height))
}

function applySize() {
  const width = entered(widthField.value)
  const height = entered(heightField.value)
  // The null checks are what narrow the type; `sizeProblem` refuses null in its own
  // right, so a blank field never reaches `resize` either way.
  if (width === null || height === null || sizeProblem(width, height) !== null) {
    refusal.value = REFUSAL
    return
  }
  resize(width, height)
}

/** A blank field is a missing size, not a zero — `Number('')` would say otherwise. */
function entered(raw: number | string): number | null {
  if (typeof raw === 'number') return Number.isNaN(raw) ? null : raw
  return raw.trim() === '' ? null : Number(raw)
}

/**
 * The drag recomputes from an untouched snapshot on every move rather than editing
 * what it drew last time, so the cage on screen is always exactly `withCells(base,
 * path)` and a refused cell leaves nothing behind to undo.
 */
let base: Puzzle | null = null
let path: number[] = []

function onPointerDown(event: PointerEvent) {
  const cell = cellOf(event)
  if (cell === null) return
  event.preventDefault()
  releaseImplicitCapture(event)
  base = puzzle.value
  path = [cell]
  commit(withCells(base, path))
  document.addEventListener('pointerup', endDrag)
  document.addEventListener('pointercancel', endDrag)
}

function onPointerMove(event: PointerEvent) {
  if (base === null) return
  const cell = cellOf(event)
  if (cell === null || path[path.length - 1] === cell) return
  path = [...path, cell]
  commit(withCells(base, path))
}

/** A drag keeps whatever it collected: there is no undo, and none is implied. */
function endDrag() {
  base = null
  path = []
  document.removeEventListener('pointerup', endDrag)
  document.removeEventListener('pointercancel', endDrag)
}

function cellOf(event: Event): number | null {
  const target = event.target
  if (!(target instanceof Element)) return null
  const found = target.closest('[data-cell]')?.getAttribute('data-cell')
  return found == null ? null : Number(found)
}

/**
 * A touch pointer is implicitly captured by the element it lands on, which would
 * make every later move report that first cell and leave the drag unable to grow.
 * Releasing the capture puts the cell under the finger back into `event.target`.
 */
function releaseImplicitCapture(event: PointerEvent) {
  const target = event.target
  if (!(target instanceof Element) || typeof target.hasPointerCapture !== 'function') return
  if (target.hasPointerCapture(event.pointerId)) target.releasePointerCapture(event.pointerId)
}

onBeforeUnmount(endDrag)
</script>

<template>
  <section class="editor" data-testid="puzzle-editor">
    <div class="sizing">
      <div class="row">
        <button
          v-for="side in SIZE_PRESETS"
          :key="side"
          type="button"
          data-testid="preset"
          :data-preset="side"
          @click="resize(side, side)"
        >
          {{ side }}×{{ side }}
        </button>
      </div>

      <div class="row">
        <label>
          Width
          <input
            v-model="widthField"
            data-testid="width"
            type="number"
            inputmode="numeric"
            :min="MIN_GRID_SIZE"
            :max="MAX_GRID_SIZE"
          />
        </label>
        <label>
          Height
          <input
            v-model="heightField"
            data-testid="height"
            type="number"
            inputmode="numeric"
            :min="MIN_GRID_SIZE"
            :max="MAX_GRID_SIZE"
          />
        </label>
        <button type="button" data-testid="apply-size" @click="applySize">Apply</button>
      </div>

      <p v-if="refusal" class="refusal" data-testid="size-message" role="alert">{{ refusal }}</p>
    </div>

    <!-- The frame is the query container for the cell size; see PuzzleGrid. -->
    <div class="grid-frame">
      <div
        class="grid"
        data-testid="editor-grid"
        :style="{ '--cols': puzzle.width }"
        :data-width="puzzle.width"
        role="grid"
        :aria-label="`${puzzle.width} by ${puzzle.height} cage layout`"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
      >
        <div
          v-for="entry in cells"
          :key="entry.cell"
          class="cell"
          :class="entry.edges"
          data-testid="cell"
          :data-cell="entry.cell"
          role="gridcell"
        />
      </div>
    </div>
  </section>
</template>

<style scoped>
.editor {
  width: 100%;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  justify-items: center;
  gap: var(--space-lg);
}

/* Presets and the custom fields are two ways to do one thing, so they read as
   one group: bound tightly to each other, and set well apart from the grid. */
.sizing {
  display: grid;
  justify-items: center;
  gap: var(--space-xs);
}

.row {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  flex-wrap: wrap;
  justify-content: center;
}

label {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.9rem;
}

input {
  width: 4rem;
  padding: var(--space-2xs);
  font: inherit;
}

button {
  padding: 0.35rem var(--space-sm);
  font: inherit;
  cursor: pointer;
}

.refusal {
  margin: 0;
  color: var(--bad);
  font-size: 0.9rem;
}

.grid-frame {
  container-type: inline-size;
  width: 100%;
  overflow-x: auto;
}

/* Same fluid cell as the play grid, drawn smaller: a 12-wide layout has to stay
   drawable, so the editor's ceiling is lower while the floor is shared. */
.grid {
  --cell: clamp(var(--cell-floor), (100cqi - 4px) / var(--cols), 2.25rem);

  display: grid;
  grid-template-columns: repeat(var(--cols), var(--cell));
  grid-auto-rows: var(--cell);
  width: max-content;
  margin-inline: auto;
  border: 2px solid var(--cage-rule);
  background: var(--paper);
  /* Without this a touch drag scrolls the page instead of drawing a cage. */
  touch-action: none;
  user-select: none;
}

.cell {
  border: 1px solid var(--rule);
}

/* Cage outlines sit on top of the light interior rules, as on the play grid. */
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
