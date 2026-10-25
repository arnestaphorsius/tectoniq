<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { cageEdges } from '@/domain/puzzle/grid'
import type { HintMarks } from './hintView'
import { markedNote, toggledNote, type EntryMode, type Notes } from '@/domain/input/notes'
import { isWritable, nextSelection, toggledEntry, type Direction } from '@/domain/input/selection'
import { isDigit, type Board, type Digit, type Puzzle } from '@/domain/puzzle/types'
import { valueAt, type Violation } from '@/domain/puzzle/validate'

const props = withDefaults(
  defineProps<{
    puzzle: Puzzle
    board: Board
    violations: readonly Violation[]
    marks?: HintMarks
    /** The candidates the player has marked; none when left out. */
    notes?: Notes
  }>(),
  { marks: () => ({}), notes: () => [] },
)

/**
 * Digits and candidates leave as events rather than being written here, because
 * the board and the notes are domain state owned by the caller.
 */
const emit = defineEmits<{
  entry: [cell: number, digit: Digit | null]
  notes: [cell: number, digits: readonly Digit[]]
}>()

/** Whether a digit is written or marked as a candidate. Space switches it. */
const mode = defineModel<EntryMode>('mode', { default: 'normal' })

/**
 * Which cell the keyboard is pointed at. The caller can bind it, so that a number
 * pad outside the grid can write to the same cell; unbound, the grid keeps it.
 * Dropping the selection on a click elsewhere is the caller's job, because only the
 * caller knows what else on the page counts as part of the grid.
 */
const selected = defineModel<number | null>('selected', { default: null })
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
    const value = valueAt(props.puzzle, props.board, cell)
    return {
      cell,
      value,
      // A digit covers the cell's candidates: they are kept, but not drawn under it.
      notes: value === null ? (props.notes[cell] ?? []) : [],
      isGiven,
      // Givens are marked too. The marker says "this digit is part of a broken
      // rule", not "fix this cell" — seeing both ends of a conflict is what tells
      // the player what their own digit collided with.
      isOffending: offendingCells.value.has(cell),
      isSelected: selected.value === cell,
      hint: {
        'hint-target': props.marks.target === cell,
        'hint-reason': props.marks.reasons?.includes(cell) === true,
        'hint-losing': props.marks.losing?.includes(cell) === true,
        'hint-dead': props.marks.dead?.includes(cell) === true,
      },
      edges: cageEdges(props.puzzle, cell),
    }
  }),
)

/** Any cell can be selected, givens included — arrow keys have to cross them. */
function select(cell: number) {
  selected.value = cell
}

/**
 * Whether a key event is a shortcut chord: Ctrl, Alt or Meta held. Those belong to
 * the system or the browser — Ctrl and Space switches input source on many systems,
 * Ctrl and 1 switches tab — so Space and the digits leave them alone. AltGr is not
 * a chord: it types characters, and Windows reports it as Ctrl and Alt together,
 * so the two together are read as AltGr. `getModifierState('AltGraph')` would say so
 * more directly, but browsers disagree about it — Firefox on macOS reports Option
 * as AltGraph. The arrow keys and the clears are not affected, and keep working
 * with any modifier as they always have.
 */
function isChord(event: KeyboardEvent): boolean {
  return event.metaKey || event.ctrlKey !== event.altKey
}

function onKeydown(event: KeyboardEvent) {
  // Space switches mode once per press. Holding it would otherwise flip the mode
  // back and forth with every repeat; the repeats are still kept from scrolling the
  // page. Space with Shift or any chord is left to the system.
  if (event.key === ' ') {
    if (event.shiftKey || isChord(event)) return
    event.preventDefault()
    if (!event.repeat) mode.value = mode.value === 'normal' ? 'candidate' : 'normal'
    return
  }

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

  const pressed = keyFor(event)
  if (pressed === undefined || !isWritable(props.puzzle, cell)) return
  event.preventDefault()
  // One press per press. A held digit would otherwise toggle its digit or its
  // candidate on and off with every repeat, and a held Backspace would take the
  // digit out and then the candidates kept under it.
  if (!event.repeat) press(pressed.key, pressed.asNote)
}

/**
 * What a key event presses: a digit, or `null` for a clear, and whether a digit is
 * marked as a candidate whatever the mode. Undefined for any other key.
 *
 * Shift and a digit marks a candidate. With Shift held, a layout whose digits are
 * unshifted types a symbol (`!` for 1 on US English), so the physical key says which
 * digit was meant. A layout that needs Shift to type a digit at all (French AZERTY)
 * still types the digit, and the first branch takes it as an ordinary press there;
 * such a player switches mode with Space instead. A digit in a chord is a shortcut,
 * not a press, so Ctrl, Shift and 1 is still the shortcut it was meant to be. A
 * clear takes any modifier, as it always has.
 */
function keyFor(event: KeyboardEvent): { key: Digit | null; asNote: boolean } | undefined {
  if (event.key === 'Backspace' || event.key === 'Delete') return { key: null, asNote: false }
  if (isChord(event)) return undefined

  const typed = Number(event.key)
  if (event.key.length === 1 && isDigit(typed)) return { key: typed, asNote: false }

  const physical = Number(/^(?:Digit|Numpad)(\d)$/.exec(event.code)?.[1])
  return event.shiftKey && isDigit(physical) ? { key: physical, asNote: true } : undefined
}

/**
 * Presses `key` on the selected cell — a digit, or `null` to clear it — exactly as
 * the keyboard does. The keyboard and the number pad both come through here, so the
 * two can never disagree.
 *
 * In Normal mode a digit is written, and pressing it twice takes it back. In
 * Candidate mode, or with `asNote`, it is marked or unmarked as a candidate instead.
 * On a cell holding a digit, a candidate replaces the digit: the digit comes out,
 * the candidates kept under it show again, and the one pressed is marked among them
 * — marked, not toggled, so the press always ends with it showing. A clear takes the
 * digit out too, which shows the cell's candidates again; from a cell with no
 * digit, it takes the candidates out.
 *
 * A given holds the selection but never takes a digit, so the write is refused here
 * rather than at the board — the ticket's "cannot alter a given".
 */
function press(key: Digit | null, asNote = false) {
  const cell = selected.value
  if (cell === null || !isWritable(props.puzzle, cell)) return
  const value = valueAt(props.puzzle, props.board, cell)

  if (key === null) {
    if (value !== null) emit('entry', cell, null)
    else if ((props.notes[cell] ?? []).length > 0) emit('notes', cell, [])
  } else if (asNote || mode.value === 'candidate') {
    if (value === null) {
      emit('notes', cell, toggledNote(props.notes, cell, key))
    } else {
      emit('entry', cell, null)
      emit('notes', cell, markedNote(props.notes, cell, key))
    }
  } else {
    emit('entry', cell, toggledEntry(props.puzzle, props.board, cell, key))
  }
}

/**
 * Puts real focus on the selected cell. Moving the selection scrolls the cell into
 * view, which a grid scrolling inside its frame needs; handing focus back after a
 * press elsewhere passes `preventScroll`, or each tap on a pad below the grid would
 * scroll a phone back up to it.
 */
function focusSelected(options: FocusOptions = {}) {
  const cell = selected.value
  if (cell !== null) root.value?.querySelector<HTMLElement>(`[data-cell="${cell}"]`)?.focus(options)
}

/** Whether `node` is part of the grid, for a caller deciding what a click hit. */
function contains(node: Node): boolean {
  return root.value?.contains(node) ?? false
}

/**
 * The grid's own key handling, for a caller whose controls stand in for the grid —
 * the number pad passes on the keys it does not use itself, so the keyboard keeps
 * working while focus is on one of its keys.
 */
const handleKey = onKeydown

defineExpose({ press, focusSelected, contains, handleKey })

// Selection is focus, so move the real focus with it — including on the way out.
// Only a cell of this grid is ever blurred: a click that lands on something else
// focusable has already moved focus there, and stealing it back would be wrong.
watch(selected, (cell) => {
  if (cell === null) {
    const active = document.activeElement
    if (active instanceof HTMLElement && root.value?.contains(active)) active.blur()
    return
  }
  focusSelected()
})
</script>

<template>
  <!--
    The frame is the query container the cell size is measured against, and the
    only thing that ever scrolls. Without it a wide grid widened the document and
    dragged the whole page off-centre.
  -->
  <div class="grid-frame" :style="{ '--cols': puzzle.width }">
    <div
      ref="root"
      class="grid"
      data-testid="puzzle-grid"
      role="grid"
      :aria-label="`${puzzle.width} by ${puzzle.height} Tectonic puzzle`"
      @keydown="onKeydown"
    >
      <div
        v-for="cell in cells"
        :key="cell.cell"
        class="cell"
        :class="[cell.edges, cell.hint, { given: cell.isGiven, selected: cell.isSelected }]"
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
        <!--
          Each candidate has a fixed place, like the five on a die, so the eye always
          looks in the same spot for the same digit. The places are drawn for the
          eye only; a screen reader is told the candidates in one phrase instead.
        -->
        <span v-if="cell.notes.length > 0" class="notes die" data-testid="candidates">
          <span class="sr-only">candidates {{ cell.notes.join(', ') }}</span>
          <span
            v-for="note in cell.notes"
            :key="note"
            class="note"
            :data-note="note"
            aria-hidden="true"
            >{{ note }}</span
          >
        </span>
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
/* `--grid-max` is what caps the puzzle at 800px: `100cqi` below is this frame's
   inline size, so capping the frame makes the ceiling bind through the arithmetic
   that is already there, and the thing that scrolls stays the thing that centres.

   A caller that knows the frame's column is exactly `--grid-max` wide can set
   `--grid-fit: 1` to fit the frame to the grid instead of filling the column — the
   play screen does, so the number pad sits beside the grid rather than at the far
   edge of an 800px column. `--fitted` is the cell's own clamp, evaluated for that
   column, so the frame and the cells it holds cannot disagree. `--grid-fit` is a
   number rather than a keyword because CSS has no conditional: it scales a
   `min-width`, which is 0 by default and `--fitted` when set. It is a minimum and
   not the width because a percentage width in an `auto` column counts as no width
   while the column is sized — and a size container's own content counts for
   nothing either, so the column would collapse under the grid. The minimum is
   capped at `--grid-max` too, because a minimum beats `max-width`: past the column
   count where the cell floor binds, the frame would otherwise grow and push the
   page sideways instead of scrolling. */
.grid-frame {
  --fitted: calc(
    var(--cols) * clamp(var(--cell-floor), (var(--grid-max) - 4px) / var(--cols), var(--cell-max)) +
      4px
  );

  container-type: inline-size;
  width: 100%;
  min-width: calc(var(--grid-fit, 0) * min(var(--fitted), var(--grid-max)));
  max-width: var(--grid-max);
  overflow-x: auto;
}

/*
 * The cell is a function of the space the frame offers and the column count: it
 * fills the column up to `--cell-max`, then shrinks to `--cell-floor` before the
 * frame starts scrolling. The 4px is the grid's own 2px frame on each side.
 */
.grid {
  --cell: clamp(var(--cell-floor), (100cqi - 4px) / var(--cols), var(--cell-max));

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
 * Hint marks are fills, never outlines, so they cannot be mistaken for the selection
 * (an inset outline) or the violation marker (a corner triangle), and a cell can
 * carry the selection and a mark at once. The target is the strongest tint and
 * gets an inner ring as well, so it still stands apart from the reasons in
 * greyscale. A dead cell is washed with the colour that means "wrong".
 *
 * A cell losing digits to an elimination is crossed out with a single diagonal
 * stroke instead: a pattern, not a fill, so it reads apart from the reasons in
 * greyscale too. It sits on `background-image` while the fills sit on
 * `background-color`, so a target that is also losing digits shows both.
 */
.cell.hint-reason {
  background-color: color-mix(in srgb, var(--hint) 16%, var(--paper));
}

.cell.hint-target {
  background-color: color-mix(in srgb, var(--hint) 34%, var(--paper));
  box-shadow: inset 0 0 0 2px var(--hint);
}

.cell.hint-losing {
  background-image: linear-gradient(
    to top right,
    transparent calc(50% - 1.5px),
    color-mix(in srgb, var(--ink) 55%, transparent) calc(50% - 1.5px),
    color-mix(in srgb, var(--ink) 55%, transparent) calc(50% + 1.5px),
    transparent calc(50% + 1.5px)
  );
}

.cell.hint-dead {
  background-color: color-mix(in srgb, var(--bad) 22%, var(--paper));
}

/*
 * Candidates sit in the places of the five on a die, from the shared `.die` rule in
 * `style.css` that the number pad uses too. They are the player's hand, so they are
 * Entry Blue, at a size tied to the cell like the digit. They have nothing in
 * common with the violation marker's corner: a cell with candidates holds no digit,
 * so no rule can be broken there.
 */
.notes {
  position: absolute;
  inset: 0;
  place-items: center;
  padding: calc(var(--cell) / 14);
  font-size: max(0.5rem, calc(var(--cell) / 4.6));
  line-height: 1;
  color: var(--entry);
  font-weight: 400;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
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
