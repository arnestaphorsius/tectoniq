// @vitest-environment happy-dom
import { enableAutoUnmount, mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vite-plus/test'
import { SAMPLE_PUZZLE } from '@/domain/puzzle/samplePuzzle'
import { emptyNotes, withNotes, type EntryMode, type Notes } from '@/domain/input/notes'
import { emptyBoard, type Board, type Puzzle } from '@/domain/puzzle/types'
import { findViolations, type Violation } from '@/domain/puzzle/validate'
import PuzzleGrid from './PuzzleGrid.vue'

enableAutoUnmount(afterEach)

/**
 * A single column, so left and right have nowhere to go. `SAMPLE_PUZZLE` has no
 * one-cell line, which is why AC-26 needs its own fixture.
 */
// prettier-ignore
const ONE_WIDE: Puzzle = {
  width: 1,
  height: 3,
  cages: [
    0,
    0,
    0,
  ],
  givens: [
    null,
    null,
    null,
  ],
}

function mountGrid(
  options: {
    puzzle?: Puzzle
    board?: Board
    violations?: readonly Violation[]
    notes?: Notes
    mode?: EntryMode
  } = {},
) {
  const puzzle = options.puzzle ?? SAMPLE_PUZZLE
  return mount(PuzzleGrid, {
    props: {
      puzzle,
      board: options.board ?? emptyBoard(puzzle),
      violations: options.violations ?? [],
      notes: options.notes ?? emptyNotes(puzzle),
      mode: options.mode ?? 'normal',
    },
    attachTo: document.body,
  })
}

function cell(wrapper: VueWrapper, index: number) {
  return wrapper.get(`[data-cell="${index}"]`)
}

/** The index of the selected cell, or null when nothing is selected. */
function selectedCell(wrapper: VueWrapper): number | null {
  const found = wrapper.findAll('[aria-selected="true"]')
  if (found.length === 0) return null
  if (found.length > 1) throw new Error(`${found.length} cells are selected at once`)
  return Number(found[0]?.attributes('data-cell'))
}

/** Selects `index` by clicking, then sends `key` to it. */
async function pressOn(wrapper: VueWrapper, index: number, key: string) {
  await cell(wrapper, index).trigger('click')
  await cell(wrapper, index).trigger('keydown', { key })
}

describe('selection', () => {
  it('clicking an empty cell selects it and sets aria-selected', async () => {
    const wrapper = mountGrid()
    await cell(wrapper, 0).trigger('click')

    expect(cell(wrapper, 0).attributes('aria-selected')).toBe('true')
    expect(cell(wrapper, 0).classes()).toContain('selected')
    expect(selectedCell(wrapper)).toBe(0)
  })

  it('clicking another cell moves the selection', async () => {
    const wrapper = mountGrid()
    await cell(wrapper, 0).trigger('click')
    await cell(wrapper, 1).trigger('click')

    expect(selectedCell(wrapper)).toBe(1)
    expect(cell(wrapper, 0).attributes('aria-selected')).toBeUndefined()
  })

  it('clicking a given selects it', async () => {
    const wrapper = mountGrid()
    await cell(wrapper, 0).trigger('click')
    await cell(wrapper, 4).trigger('click')

    expect(cell(wrapper, 4).attributes('aria-selected')).toBe('true')
    expect(selectedCell(wrapper)).toBe(4)
  })

  it('Escape clears the selection', async () => {
    const wrapper = mountGrid()
    await cell(wrapper, 0).trigger('click')
    expect(wrapper.element.contains(document.activeElement)).toBe(true)

    await cell(wrapper, 0).trigger('keydown', { key: 'Escape' })

    expect(selectedCell(wrapper)).toBeNull()
    // Selection is focus, so losing one has to lose the other.
    expect(wrapper.element.contains(document.activeElement)).toBe(false)
  })
})

describe('digit entry', () => {
  it('the cell stays selected after entry', async () => {
    const wrapper = mountGrid()
    await pressOn(wrapper, 0, '4')

    expect(wrapper.emitted('entry')).toEqual([[0, 4]])
    expect(selectedCell(wrapper)).toBe(0)
  })
})

describe('arrow keys', () => {
  const moves: readonly { name: string; from: number; key: string; to: number }[] = [
    { name: 'ArrowRight moves from cell 0 to cell 1', from: 0, key: 'ArrowRight', to: 1 },
    { name: 'ArrowLeft moves from cell 1 to cell 0', from: 1, key: 'ArrowLeft', to: 0 },
    { name: 'ArrowDown moves from cell 13 to cell 17', from: 13, key: 'ArrowDown', to: 17 },
    { name: 'ArrowUp moves from cell 5 to cell 1', from: 5, key: 'ArrowUp', to: 1 },
    { name: 'ArrowDown lands on given cell 4, from cell 0', from: 0, key: 'ArrowDown', to: 4 },
    { name: 'ArrowUp lands on given cell 10, from cell 14', from: 14, key: 'ArrowUp', to: 10 },
    { name: 'ArrowDown moves off given cell 4 to cell 8', from: 4, key: 'ArrowDown', to: 8 },
    {
      name: 'ArrowRight wraps within the row, from cell 3 to cell 0',
      from: 3,
      key: 'ArrowRight',
      to: 0,
    },
    {
      name: 'ArrowLeft wraps within the row, from cell 0 to cell 3',
      from: 0,
      key: 'ArrowLeft',
      to: 3,
    },
    {
      name: 'ArrowUp wraps within the column, from cell 1 to cell 17',
      from: 1,
      key: 'ArrowUp',
      to: 17,
    },
    {
      name: 'ArrowLeft wraps onto given cell 19, from cell 16',
      from: 16,
      key: 'ArrowLeft',
      to: 19,
    },
  ]

  for (const move of moves) {
    it(move.name, async () => {
      const wrapper = mountGrid()
      await pressOn(wrapper, move.from, move.key)

      expect(selectedCell(wrapper)).toBe(move.to)
    })
  }

  it('an arrow key with nothing selected does nothing', async () => {
    const wrapper = mountGrid()
    for (const key of ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']) {
      await wrapper.get('[data-testid="puzzle-grid"]').trigger('keydown', { key })
      expect(selectedCell(wrapper)).toBeNull()
    }
  })

  it('a one-cell line keeps the selection', async () => {
    const wrapper = mountGrid({ puzzle: ONE_WIDE })
    for (const key of ['ArrowLeft', 'ArrowRight']) {
      await pressOn(wrapper, 1, key)
      expect(selectedCell(wrapper)).toBe(1)
    }
  })
})

describe('givens', () => {
  it('a selected given refuses a digit and a clear', async () => {
    const wrapper = mountGrid()
    await pressOn(wrapper, 4, '1')
    await cell(wrapper, 4).trigger('keydown', { key: 'Backspace' })
    await cell(wrapper, 4).trigger('keydown', { key: 'Delete' })

    expect(selectedCell(wrapper)).toBe(4)
    expect(wrapper.emitted('entry')).toBeUndefined()
  })
})

describe('violation marker', () => {
  /** Cell 0 holding a 3 touches the given 3 at cell 4, so both are named. */
  const board: Board = emptyBoard(SAMPLE_PUZZLE).map((_, index) => (index === 0 ? 3 : null))
  const violations = findViolations(SAMPLE_PUZZLE, board)

  it('the marker carries role=status', () => {
    const wrapper = mountGrid({ board, violations })
    const marker = cell(wrapper, 0).get('[data-testid="violation-marker"]')

    expect(marker.attributes('role')).toBe('status')
  })

  it('an offending digit is not coloured red', () => {
    const wrapper = mountGrid({ board, violations })

    // `offending` was the class that reddened the digit. The marker replaces it,
    // so no cell may carry it in any state of the board.
    for (const rendered of wrapper.findAll('[data-testid="cell"]')) {
      expect(rendered.classes()).not.toContain('offending')
    }
    expect(cell(wrapper, 0).text()).toBe('3')
  })

  it('a given named by a violation shows the marker too', () => {
    const wrapper = mountGrid({ board, violations })

    expect(violations).toContainEqual({
      kind: 'touching-duplicate',
      value: 3,
      cells: [0, 4],
    })
    expect(cell(wrapper, 0).find('[data-testid="violation-marker"]').exists()).toBe(true)
    expect(cell(wrapper, 4).find('[data-testid="violation-marker"]').exists()).toBe(true)
  })

  it('a cell no violation names shows no marker', () => {
    const wrapper = mountGrid({ board, violations })

    // Cell 7 is a given the sample leaves legal, so nothing marks it.
    expect(cell(wrapper, 7).find('[data-testid="violation-marker"]').exists()).toBe(false)
    expect(wrapper.findAll('[data-testid="violation-marker"]')).toHaveLength(2)
  })
})

describe('candidates', () => {
  /** Notes with `digits` marked in cell 0 of the sample. */
  const marked = (...digits: Parameters<typeof withNotes>[2]) =>
    withNotes(emptyNotes(SAMPLE_PUZZLE), 0, digits)

  /** The candidates drawn in a cell, in the order they appear. */
  function drawn(wrapper: VueWrapper, index: number): string[] {
    return cell(wrapper, index)
      .findAll('[data-note]')
      .map((note) => note.attributes('data-note') ?? '')
  }

  it('draws each candidate in its own place, and names them in one phrase', () => {
    const wrapper = mountGrid({ notes: marked(1, 3, 5) })

    expect(drawn(wrapper, 0)).toEqual(['1', '3', '5'])
    expect(cell(wrapper, 0).get('.sr-only').text()).toBe('candidates 1, 3, 5')
    for (const note of cell(wrapper, 0).findAll('[data-note]')) {
      expect(note.attributes('aria-hidden')).toBe('true')
    }
  })

  it('draws no candidates under a digit', () => {
    const board = emptyBoard(SAMPLE_PUZZLE).map((_, index) => (index === 0 ? 2 : null))
    const wrapper = mountGrid({ board, notes: marked(1, 3) })

    expect(cell(wrapper, 0).find('[data-testid="candidates"]').exists()).toBe(false)
  })

  it('an empty cell with no candidates still matches :empty', () => {
    const wrapper = mountGrid()

    // `:empty` ignores comments, such as the anchors Vue leaves for each `v-if`; an
    // element or a stray text node would stop it matching.
    expect(cell(wrapper, 0).element.children).toHaveLength(0)
    expect(cell(wrapper, 0).element.textContent).toBe('')
  })

  it('in Candidate mode a digit marks a candidate rather than writing it', async () => {
    const wrapper = mountGrid({ notes: marked(1), mode: 'candidate' })

    await pressOn(wrapper, 0, '3')

    expect(wrapper.emitted('notes')).toEqual([[0, [1, 3]]])
    expect(wrapper.emitted('entry')).toBeUndefined()
  })

  it('in Candidate mode a marked digit is unmarked', async () => {
    const wrapper = mountGrid({ notes: marked(1, 3), mode: 'candidate' })

    await pressOn(wrapper, 0, '3')

    expect(wrapper.emitted('notes')).toEqual([[0, [1]]])
  })

  it('Shift and a digit marks a candidate in Normal mode, by the physical key', async () => {
    const wrapper = mountGrid()
    await cell(wrapper, 0).trigger('click')

    // US English: Shift and 2 types "@".
    await cell(wrapper, 0).trigger('keydown', { key: '@', code: 'Digit2', shiftKey: true })

    expect(wrapper.emitted('notes')).toEqual([[0, [2]]])
    expect(wrapper.emitted('entry')).toBeUndefined()
  })

  it('a layout that needs Shift to type a digit still writes the digit', async () => {
    const wrapper = mountGrid()
    await cell(wrapper, 0).trigger('click')

    // French AZERTY: the digits are on Shift.
    await cell(wrapper, 0).trigger('keydown', { key: '2', code: 'Digit2', shiftKey: true })

    expect(wrapper.emitted('entry')).toEqual([[0, 2]])
    expect(wrapper.emitted('notes')).toBeUndefined()
  })

  it('Shift with a symbol key marks nothing', async () => {
    const wrapper = mountGrid()
    await cell(wrapper, 0).trigger('click')

    await cell(wrapper, 0).trigger('keydown', { key: '(', code: 'Digit9', shiftKey: true })

    expect(wrapper.emitted('notes')).toBeUndefined()
    expect(wrapper.emitted('entry')).toBeUndefined()
  })

  it('a candidate replaces the digit a cell holds, among the kept candidates', async () => {
    const board = emptyBoard(SAMPLE_PUZZLE).map((_, index) => (index === 0 ? 2 : null))
    const wrapper = mountGrid({ board, notes: marked(1, 4), mode: 'candidate' })

    await pressOn(wrapper, 0, '3')

    expect(wrapper.emitted('entry')).toEqual([[0, null]])
    expect(wrapper.emitted('notes')).toEqual([[0, [1, 3, 4]]])
  })

  it('a candidate the same as the digit replaces it too', async () => {
    const board = emptyBoard(SAMPLE_PUZZLE).map((_, index) => (index === 0 ? 2 : null))
    const wrapper = mountGrid({ board, mode: 'candidate' })

    await pressOn(wrapper, 0, '2')

    expect(wrapper.emitted('entry')).toEqual([[0, null]])
    expect(wrapper.emitted('notes')).toEqual([[0, [2]]])
  })

  it('replacing a digit marks a kept candidate rather than toggling it off', async () => {
    const board = emptyBoard(SAMPLE_PUZZLE).map((_, index) => (index === 0 ? 2 : null))
    const wrapper = mountGrid({ board, notes: marked(1, 4), mode: 'candidate' })

    await pressOn(wrapper, 0, '4')

    expect(wrapper.emitted('notes')).toEqual([[0, [1, 4]]])
  })

  it('Shift and a digit replaces a digit in Normal mode too', async () => {
    const board = emptyBoard(SAMPLE_PUZZLE).map((_, index) => (index === 0 ? 2 : null))
    const wrapper = mountGrid({ board })
    await cell(wrapper, 0).trigger('click')

    await cell(wrapper, 0).trigger('keydown', { key: '#', code: 'Digit3', shiftKey: true })

    expect(wrapper.emitted('entry')).toEqual([[0, null]])
    expect(wrapper.emitted('notes')).toEqual([[0, [3]]])
  })

  it('a given takes no candidates', async () => {
    const wrapper = mountGrid({ mode: 'candidate' })

    // Cell 4 is the sample's given 3.
    await pressOn(wrapper, 4, '1')

    expect(wrapper.emitted('notes')).toBeUndefined()
  })

  it('a clear on a cell with no digit takes its candidates out', async () => {
    const wrapper = mountGrid({ notes: marked(1, 3) })

    await pressOn(wrapper, 0, 'Backspace')

    expect(wrapper.emitted('notes')).toEqual([[0, []]])
    expect(wrapper.emitted('entry')).toBeUndefined()
  })

  it('a clear on a cell with a digit takes only the digit out', async () => {
    const board = emptyBoard(SAMPLE_PUZZLE).map((_, index) => (index === 0 ? 2 : null))
    const wrapper = mountGrid({ board, notes: marked(1, 3) })

    await pressOn(wrapper, 0, 'Delete')

    expect(wrapper.emitted('entry')).toEqual([[0, null]])
    expect(wrapper.emitted('notes')).toBeUndefined()
  })

  it('a clear on an empty cell with no candidates emits nothing', async () => {
    const wrapper = mountGrid()

    await pressOn(wrapper, 0, 'Backspace')

    expect(wrapper.emitted('entry')).toBeUndefined()
    expect(wrapper.emitted('notes')).toBeUndefined()
  })

  it('holding Space switches the mode once, and keeps the page from scrolling', async () => {
    const wrapper = mountGrid()
    await cell(wrapper, 0).trigger('click')
    const repeat = new KeyboardEvent('keydown', {
      key: ' ',
      repeat: true,
      bubbles: true,
      cancelable: true,
    })

    await cell(wrapper, 0).trigger('keydown', { key: ' ' })
    cell(wrapper, 0).element.dispatchEvent(repeat)

    expect(wrapper.emitted('update:mode')).toEqual([['candidate']])
    expect(repeat.defaultPrevented).toBe(true)
  })

  it.each(['ctrlKey', 'shiftKey', 'altKey', 'metaKey'] as const)(
    'Space with %s is left to the system',
    async (modifier) => {
      const wrapper = mountGrid()
      await cell(wrapper, 0).trigger('click')
      const chord = new KeyboardEvent('keydown', {
        key: ' ',
        [modifier]: true,
        bubbles: true,
        cancelable: true,
      })

      cell(wrapper, 0).element.dispatchEvent(chord)

      expect(wrapper.emitted('update:mode')).toBeUndefined()
      expect(chord.defaultPrevented).toBe(false)
    },
  )

  it.each([
    ['Ctrl, Shift and 1', { key: '!', code: 'Digit1', ctrlKey: true, shiftKey: true }],
    ['Alt, Shift and 1', { key: '!', code: 'Digit1', altKey: true, shiftKey: true }],
    ['Meta, Shift and 1', { key: '!', code: 'Digit1', metaKey: true, shiftKey: true }],
    ['Ctrl and 1', { key: '1', code: 'Digit1', ctrlKey: true }],
    ['Meta and 1', { key: '1', code: 'Digit1', metaKey: true }],
  ])('%s is a shortcut, and neither writes nor marks', async (_, init) => {
    const wrapper = mountGrid()
    await cell(wrapper, 0).trigger('click')
    const chord = new KeyboardEvent('keydown', { ...init, bubbles: true, cancelable: true })

    cell(wrapper, 0).element.dispatchEvent(chord)

    expect(wrapper.emitted('notes')).toBeUndefined()
    expect(wrapper.emitted('entry')).toBeUndefined()
    expect(chord.defaultPrevented).toBe(false)
  })

  it('AltGr, which Windows reports as Ctrl and Alt, is not a shortcut', async () => {
    const wrapper = mountGrid()
    await cell(wrapper, 0).trigger('click')

    await cell(wrapper, 0).trigger('keydown', {
      key: '2',
      code: 'Digit2',
      ctrlKey: true,
      altKey: true,
    })

    expect(wrapper.emitted('entry')).toEqual([[0, 2]])
  })

  it.each(['ctrlKey', 'altKey', 'metaKey', 'shiftKey'] as const)(
    'Backspace with %s still clears, as it always has',
    async (modifier) => {
      const board = emptyBoard(SAMPLE_PUZZLE).map((_, index) => (index === 0 ? 2 : null))
      const wrapper = mountGrid({ board })
      await cell(wrapper, 0).trigger('click')

      await cell(wrapper, 0).trigger('keydown', { key: 'Backspace', [modifier]: true })

      expect(wrapper.emitted('entry')).toEqual([[0, null]])
    },
  )

  it.each(['ctrlKey', 'altKey', 'metaKey'] as const)(
    'an arrow key with %s still moves the selection, as it always has',
    async (modifier) => {
      const wrapper = mountGrid()
      await cell(wrapper, 0).trigger('click')

      await cell(wrapper, 0).trigger('keydown', { key: 'ArrowRight', [modifier]: true })

      expect(selectedCell(wrapper)).toBe(1)
    },
  )

  describe('a held key presses once', () => {
    /** A keydown, then one repeat of it, as a held key sends. */
    async function hold(wrapper: VueWrapper, init: KeyboardEventInit) {
      await cell(wrapper, 0).trigger('keydown', init)
      await cell(wrapper, 0).trigger('keydown', { ...init, repeat: true })
    }

    it('a digit in Candidate mode marks once', async () => {
      const wrapper = mountGrid({ mode: 'candidate' })
      await cell(wrapper, 0).trigger('click')

      await hold(wrapper, { key: '3' })

      expect(wrapper.emitted('notes')).toEqual([[0, [3]]])
    })

    it('Shift and a digit marks once', async () => {
      const wrapper = mountGrid()
      await cell(wrapper, 0).trigger('click')

      await hold(wrapper, { key: '#', code: 'Digit3', shiftKey: true })

      expect(wrapper.emitted('notes')).toEqual([[0, [3]]])
    })

    it('a digit in Normal mode writes once', async () => {
      const wrapper = mountGrid()
      await cell(wrapper, 0).trigger('click')

      await hold(wrapper, { key: '3' })

      expect(wrapper.emitted('entry')).toEqual([[0, 3]])
    })

    it('Backspace clears the digit and leaves the candidates under it', async () => {
      const board = emptyBoard(SAMPLE_PUZZLE).map((_, index) => (index === 0 ? 2 : null))
      const wrapper = mountGrid({ board, notes: marked(1, 3) })
      await cell(wrapper, 0).trigger('click')

      await hold(wrapper, { key: 'Backspace' })

      expect(wrapper.emitted('entry')).toEqual([[0, null]])
      expect(wrapper.emitted('notes')).toBeUndefined()
    })

    it('a repeat is still kept from doing what the browser would do with it', () => {
      const wrapper = mountGrid()
      void cell(wrapper, 0).trigger('click')
      const repeat = new KeyboardEvent('keydown', {
        key: 'Backspace',
        repeat: true,
        bubbles: true,
        cancelable: true,
      })

      cell(wrapper, 0).element.dispatchEvent(repeat)

      expect(repeat.defaultPrevented).toBe(true)
    })

    it('an arrow key held still moves on every repeat', async () => {
      const wrapper = mountGrid()
      await cell(wrapper, 0).trigger('click')

      await hold(wrapper, { key: 'ArrowRight' })

      expect(selectedCell(wrapper)).toBe(2)
    })
  })

  it('Space switches the mode both ways', async () => {
    const normal = mountGrid({ mode: 'normal' })
    const candidate = mountGrid({ mode: 'candidate' })

    await pressOn(normal, 0, ' ')
    await pressOn(candidate, 0, ' ')

    expect(normal.emitted('update:mode')).toEqual([['candidate']])
    expect(candidate.emitted('update:mode')).toEqual([['normal']])
  })
})
