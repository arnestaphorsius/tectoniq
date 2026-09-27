<script setup lang="ts">
import { computed, onBeforeUnmount, ref, shallowRef } from 'vue'
import {
  DEFAULT_GRID_SIZE,
  emptyLayout,
  MAX_GRID_SIZE,
  MIN_GRID_SIZE,
  SIZE_PRESETS,
  sizeProblem,
  withCells,
} from '@/domain/cages'
import { cageEdges, cellCount } from '@/domain/grid'
import { MAX_CAGE_SIZE, type Puzzle } from '@/domain/types'
import { validatePuzzle, type PuzzleProblem } from '@/domain/validate'

const props = defineProps<{ initialPuzzle?: Puzzle | undefined }>()

/**
 * The editor owns the puzzle while it is mounted and emits every version of it, so
 * the composition root can hand the last one back when this component is mounted
 * again. `initialPuzzle` seeds it once and is deliberately not watched: a prop that
 * wrote back into the grid mid-drag would fight the drag for control of it.
 */
const emit = defineEmits<{ change: [Puzzle] }>()

const puzzle = shallowRef<Puzzle>(
  props.initialPuzzle ?? emptyLayout(DEFAULT_GRID_SIZE, DEFAULT_GRID_SIZE),
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

/**
 * The verdict from the last check, or `null` if nobody has asked for one. Holding
 * the domain's own problems rather than a rendered sentence keeps the message and
 * the cell markers two views of a single fact.
 */
const result = ref<PuzzleProblem[] | null>(null)

function check() {
  result.value = validatePuzzle(puzzle.value)
}

/** The cells of the first `cell-without-cage` problem, or null if there is none. */
function cellsWithoutCage(problems: readonly PuzzleProblem[] | null): readonly number[] | null {
  for (const problem of problems ?? []) {
    if (problem.kind === 'cell-without-cage') return problem.cells
  }
  return null
}

const hasProblems = computed(() => (result.value?.length ?? 0) > 0)

/** The preset the grid is currently at, if it is square and one of them. */
const currentPreset = computed(() =>
  puzzle.value.width === puzzle.value.height ? puzzle.value.width : null,
)

/**
 * Nothing drawn and nothing asked yet: the one moment the screen has to say how it
 * works, because a blank grid on its own gives no clue that it wants dragging.
 */
const untouched = computed(
  () => result.value === null && puzzle.value.cages.every((cage) => cage === null),
)

/**
 * The cell the current drag started on, or `null` when nobody is dragging. The
 * start cell is always in the cage being drawn, so it is the one stable handle on
 * that cage: `withCells` renumbers cages on every move, so a cage id held from
 * pointer-down would come to name some other cage — typically what is left of one
 * the drag took a cell from.
 */
const dragStart = ref<number | null>(null)

/**
 * The cage the current drag is drawing, so it can be tinted while it grows. Read
 * back from the committed layout rather than from `path`, so a cell `withCells`
 * refused is never shown as taken.
 */
const drawing = computed(() =>
  dragStart.value === null ? null : (puzzle.value.cages[dragStart.value] ?? null),
)

/**
 * The cells to mark — none of them when the whole grid is blank.
 *
 * A grid nobody has started is not a mistake to point at, and painting every cell
 * of a 12×12 red would be noise rather than help; the message says it on its own.
 * Holes in a mostly-drawn grid are the opposite case, and finding them by eye is
 * exactly the chore worth removing.
 */
const undrawnCells = computed(() => {
  const missing = cellsWithoutCage(result.value)
  if (missing === null || missing.length === cellCount(puzzle.value)) return new Set<number>()
  return new Set(missing)
})

/**
 * What the check found, in words.
 *
 * The passing sentence says *complete*, never *valid* or *solvable*. A layout can
 * pass every structural check and still have no solution — `validate.test.ts` keeps
 * a `TWO_BY_TWO` fixture that does exactly that — and the editor places no givens
 * besides, so nothing here may imply the puzzle has been checked for playability.
 */
const message = computed(() => {
  const problems = result.value
  if (problems === null) return ''

  const missing = cellsWithoutCage(problems)
  if (missing !== null) {
    if (missing.length === cellCount(puzzle.value)) {
      return 'Nothing is drawn yet. Drag across cells to draw a cage.'
    }
    const subject = missing.length === 1 ? '1 cell is' : `${missing.length} cells are`
    return `${subject} not in a cage yet. Drag across them to draw one.`
  }
  // Unreachable through the UI — `withCells` caps a cage at five and splits any
  // remainder, and a refused size never reaches the grid. Stated generically rather
  // than in five bespoke sentences, because saying nothing would let a future
  // regression show the passing message over a broken layout.
  if (problems.length > 0) {
    return 'The layout is broken in a way the editor should not allow. Choose a size to start over.'
  }
  return `The layout is complete. Every cell is in a cage of 1 to ${MAX_CAGE_SIZE} connected cells.`
})

function commit(next: Puzzle) {
  puzzle.value = next
  // A verdict describes the layout it was computed from, so it cannot outlive one.
  // Clearing here rather than in each caller is what makes a stale verdict
  // impossible: every path that changes the layout — a drag, a preset, Apply —
  // comes through `commit`. A refused size does not, and rightly leaves a standing
  // verdict alone, because the layout did not change.
  result.value = null
  emit('change', next)
}

/** Every size change starts the layout over — the ticket asks for no prompt. */
function resize(width: number, height: number) {
  refusal.value = null
  widthField.value = width
  heightField.value = height
  commit(emptyLayout(width, height))
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
  dragStart.value = cell
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
  dragStart.value = null
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
      <div class="presets" role="group" aria-label="Grid size">
        <button
          v-for="side in SIZE_PRESETS"
          :key="side"
          type="button"
          class="control"
          :class="{ current: currentPreset === side }"
          :aria-current="currentPreset === side ? 'true' : undefined"
          data-testid="preset"
          :data-preset="side"
          @click="resize(side, side)"
        >
          {{ side }}×{{ side }}
        </button>
      </div>

      <div class="custom">
        <label>
          Width
          <input
            v-model="widthField"
            class="control"
            data-testid="width"
            type="number"
            inputmode="numeric"
            :min="MIN_GRID_SIZE"
            :max="MAX_GRID_SIZE"
            :aria-invalid="refusal ? 'true' : undefined"
            :aria-describedby="refusal ? 'size-refusal' : undefined"
            @keydown.enter="applySize"
          />
        </label>
        <label>
          Height
          <input
            v-model="heightField"
            class="control"
            data-testid="height"
            type="number"
            inputmode="numeric"
            :min="MIN_GRID_SIZE"
            :max="MAX_GRID_SIZE"
            :aria-invalid="refusal ? 'true' : undefined"
            :aria-describedby="refusal ? 'size-refusal' : undefined"
            @keydown.enter="applySize"
          />
        </label>
        <button type="button" class="control" data-testid="apply-size" @click="applySize">
          Apply
        </button>
      </div>

      <p v-if="refusal" id="size-refusal" class="refusal" data-testid="size-message" role="alert">
        {{ refusal }}
      </p>
    </div>

    <div class="work">
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
            :class="[
              entry.edges,
              { drawing: drawing !== null && puzzle.cages[entry.cell] === drawing },
            ]"
            data-testid="cell"
            :data-cell="entry.cell"
            role="gridcell"
          >
            <!--
              Hidden from assistive tech on purpose, unlike the play grid's marker:
              the result line below already states how many cells are left, and a
              screenful of live regions would talk over it.
            -->
            <span
              v-if="undrawnCells.has(entry.cell)"
              class="marker"
              data-testid="unassigned-marker"
              aria-hidden="true"
            />
          </div>
        </div>
      </div>

      <div class="validation">
        <p v-if="untouched" class="hint" data-testid="editor-hint">
          Drag across cells to draw a cage.
        </p>
        <button type="button" class="control" data-testid="check-layout" @click="check">
          Check the layout
        </button>
        <p
          class="result"
          :class="{ bad: hasProblems }"
          data-testid="validation-message"
          role="status"
        >
          {{ message }}
        </p>
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

/* Presets and the custom fields are two ways to do one thing, so they sit on one
   line where there is room for it, and wrap to two where there is not. The
   refusal spans the row beneath, under the fields it is about. */
.sizing {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: var(--space-sm) var(--space-lg);
}

/* Joined, so three presets read as one choice rather than three buttons. The
   shared edge is drawn once; a hovered or focused preset lifts over its
   neighbours so its whole border shows. */
.presets {
  display: flex;
}

.presets .control {
  position: relative;
  font-variant-numeric: tabular-nums;
}

.presets .control + .control {
  margin-left: -1px;
}

.presets .control:hover,
.presets .control:focus-visible {
  z-index: 1;
}

/* The current size, marked the way the screen switcher marks the current screen:
   weight 600 and a 2px ink rule along the bottom, drawn inside the button so the
   group's geometry does not move. */
.presets .control.current {
  font-weight: 600;
  border-color: var(--ink);
  z-index: 1;
}

.presets .control.current::after {
  content: '';
  position: absolute;
  inset: auto 0 0;
  height: 2px;
  background: var(--ink);
}

.custom {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

label {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  font-size: 0.9rem;
}

/* The label is set small; the digit it labels is not. */
input.control {
  width: 3rem;
  font-size: 1rem;
}

.refusal {
  flex-basis: 100%;
  margin: 0;
  color: var(--bad);
  font-size: 0.9rem;
  text-align: center;
  text-wrap: balance;
}

.hint {
  margin: 0;
  font-size: 0.9rem;
  opacity: 0.7;
}

/* Capped at `--grid-max`, same as the play grid; see PuzzleGrid for why the cap
   sits on the frame rather than in the clamp. */
.grid-frame {
  container-type: inline-size;
  width: 100%;
  max-width: var(--grid-max);
  overflow-x: auto;
}

/* The same fluid cell as the play grid, to the character: a cage should be the
   size while you draw it that it will be while you play it. */
.grid {
  --cell: clamp(var(--cell-floor), (100cqi - 4px) / var(--cols), var(--cell-max));

  display: grid;
  grid-template-columns: repeat(var(--cols), var(--cell));
  grid-auto-rows: var(--cell);
  width: max-content;
  margin-inline: auto;
  border: 2px solid var(--cage-rule);
  background: var(--paper);
  /* Without this a touch drag scrolls the page instead of drawing a cage. */
  touch-action: none;
  cursor: crosshair;
  user-select: none;
}

/* The grid and what it says about itself, held together by the step the system
   reserves for exactly that — the same pairing the play screen uses. */
.work {
  width: 100%;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  justify-items: center;
  gap: var(--space-sm);
}

.validation {
  display: grid;
  justify-items: center;
  gap: var(--space-xs);
}

/*
 * One region, two states. A problem is Violation Red; a pass is Ink, never green —
 * this system has exactly two chromatic colours and neither of them is a success
 * colour. The two states differ in wording as well, so the message reads correctly
 * in greyscale and with no colour at all.
 *
 * Rendered always and empty until a check runs, unlike `.refusal` above. A polite
 * live region has to exist in the DOM before its content changes to be announced;
 * `role="alert"` is announced on insertion, which is why the refusal may be `v-if`'d
 * and this may not. An empty paragraph generates no line box, so nothing shifts.
 */
.result {
  margin: 0;
  font-size: 0.9rem;
  text-align: center;
  text-wrap: balance;
}

.result.bad {
  color: var(--bad);
}

.cell {
  position: relative;
  border: 1px solid var(--rule);
}

/* The cage under the pointer, tinted while it is drawn so the drag shows exactly
   what it has collected. Ink, not a hue: nothing is wrong and nobody wrote a digit. */
.cell.drawing {
  background: var(--wash);
}

/* The play grid's corner triangle, reused so that "this cell is named by a problem"
   looks the same on both screens. Sized from `--cell` for the same reason. */
.marker {
  --size: max(0.5rem, calc(var(--cell) / 4.3));

  position: absolute;
  top: 0;
  right: 0;
  width: 0;
  height: 0;
  border-top: var(--size) solid var(--bad);
  border-left: var(--size) solid transparent;
  /* The drag hit-test would resolve through this span anyway, since `closest`
     walks up — but a marker has no business being a drag target. */
  pointer-events: none;
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
