<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import HintPanel from './components/HintPanel.vue'
import { lastStage, marksFor, type HintView } from './components/hintView'
import NumberPad from './components/NumberPad.vue'
import PuzzleEditor from './components/PuzzleEditor.vue'
import PuzzleGrid from './components/PuzzleGrid.vue'
import { findHint } from '@/domain/hints/hint'
import { SAMPLE_PUZZLE } from '@/domain/puzzle/samplePuzzle'
import { withEntry } from '@/domain/input/selection'
import { emptyBoard, type Board, type Digit, type Puzzle } from '@/domain/puzzle/types'
import { findViolations, isSolved } from '@/domain/puzzle/validate'

const board = ref<Board>(emptyBoard(SAMPLE_PUZZLE))
const violations = computed(() => findViolations(SAMPLE_PUZZLE, board.value))

/**
 * The selected cell is held here rather than in the grid, because the number pad
 * writes to it too. The keyboard still goes through the grid.
 */
const selected = ref<number | null>(null)

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
watch(screen, () => (selected.value = null))

function onEntry(cell: number, digit: Digit | null) {
  board.value = withEntry(board.value, cell, digit)
}

/**
 * The pad writes through the grid, so a pad key is the same key on the keyboard —
 * pressing twice included, and doing nothing with no cell selected or on a given.
 */
const grid = ref<InstanceType<typeof PuzzleGrid> | null>(null)
const padArea = ref<HTMLElement | null>(null)

/**
 * A pointer press on a pad key focuses the key, which would leave the arrow keys
 * with nothing to move. Focus goes back to the selected cell — but only for a
 * pointer (`detail` counts its clicks; a key press activating the button reports
 * 0), so someone who tabbed to the pad keeps their place on it. Focus is handed
 * back rather than never taken, because preventing the `mousedown` that takes it
 * also stops Firefox from showing the key as pressed.
 */
function onPadClick(event: MouseEvent) {
  if (event.detail > 0) grid.value?.focusSelected({ preventScroll: true })
}

/**
 * With focus on a pad key, the keyboard still plays the grid: digits, Backspace,
 * the arrow keys and Escape go to the grid's own handler, so a key does the same
 * wherever focus is. An arrow key moves the selection, and focus follows it into the
 * grid. Enter, Space and Tab are not the grid's and stay with the pad, which is how
 * its keys are pressed and left.
 */
function onPadKeydown(event: KeyboardEvent) {
  grid.value?.handleKey(event)
}

/**
 * A click anywhere but the grid or the pad drops the selection. The pad is spared
 * because pressing it is how a pointer writes to the selected cell.
 */
function onDocumentClick(event: MouseEvent) {
  const target = event.target
  if (!(target instanceof Node)) return
  if (grid.value?.contains(target) || padArea.value?.contains(target)) return
  selected.value = null
}

onMounted(() => document.addEventListener('click', onDocumentClick))
onBeforeUnmount(() => document.removeEventListener('click', onDocumentClick))

function advanceHint() {
  const current = hint.value
  if (current?.result.kind === 'hint' && current.stage < lastStage(current.result)) {
    hint.value = { ...current, stage: current.stage + 1 }
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
  <main class="page" :class="{ playing: screen === 'play' }">
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
      <div class="area-grid">
        <PuzzleGrid
          ref="grid"
          v-model:selected="selected"
          :puzzle="SAMPLE_PUZZLE"
          :board="board"
          :violations="violations"
          :marks="marksFor(hint)"
          @entry="onEntry"
        />
      </div>

      <div ref="padArea" class="area-pad" @click="onPadClick" @keydown="onPadKeydown">
        <NumberPad @digit="(digit) => grid?.press(digit)" @erase="grid?.press(null)" />
      </div>

      <div class="area-hint">
        <HintPanel
          :view="hint"
          :solved="solved"
          @advance="advanceHint"
          @fill="fillHint"
          @close="hint = null"
        />
      </div>
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

/* Room for the pad beside the grid, added to the grid's 800px rather than taken out. */
.page.playing {
  max-width: var(--measure-play);
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

/*
 * The hint panel acts on the grid, so it is held close to it. On a narrow screen
 * the pad sits between them, under the grid where a thumb can reach it.
 */
.work {
  width: 100%;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  justify-items: center;
  gap: var(--space-sm);
}

/* Stretched, so the grid's frame has a definite width to measure its cells against. */
.area-grid,
.area-hint {
  justify-self: stretch;
  display: grid;
  justify-items: center;
}

/*
 * The Pad Beside Rule (DESIGN.md): from 66.5rem the pad moves to the right of the
 * grid. That is `--measure-play` — the narrowest page where the grid still gets its
 * full 800px beside the pad — plus 1.5rem, because a media query measures the
 * viewport including a classic scrollbar (17px on Windows) that the page cannot
 * use. Custom properties do not work in a media query, so this literal has to be
 * kept in step by hand; `e2e/number-pad.spec.ts` fails when it falls behind. This
 * is the codebase's one width media query.
 *
 * The page is then exactly `--measure-play` wide, so the grid's column is always
 * `--grid-max`, which is what lets the grid fit its frame to itself. The hint gives
 * no width to its column, so a long sentence cannot widen it and push the grid and
 * pad sideways.
 */
@media (min-width: 66.5rem) {
  .work {
    --pad-columns: 3;
    --pad-key: var(--pad-key-beside);
    --grid-fit: 1;

    grid-template-columns: auto auto;
    grid-template-areas:
      'grid pad'
      'hint .';
    justify-content: center;
    align-items: start;
    column-gap: var(--pad-gap);
  }

  .area-grid {
    grid-area: grid;
  }

  .area-pad {
    grid-area: pad;
  }

  .area-hint {
    grid-area: hint;
    width: 0;
    min-width: 100%;
  }
}
</style>
