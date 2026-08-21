// @vitest-environment happy-dom
import { enableAutoUnmount, mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vite-plus/test'
import { SAMPLE_PUZZLE } from '@/domain/samplePuzzle'
import { emptyBoard, type Board, type Puzzle } from '@/domain/types'
import { findViolations, type Violation } from '@/domain/validate'
import PuzzleGrid from './PuzzleGrid.vue'

enableAutoUnmount(afterEach)

/**
 * A puzzle whose row 1 and column 1 each hold exactly one non-given cell — cell 4 —
 * so arrow movement from there has nowhere legal to land. `SAMPLE_PUZZLE` has no
 * such line, which is why AC-26 needs its own fixture.
 */
// prettier-ignore
const BOXED_IN: Puzzle = {
  width: 3,
  height: 3,
  cages: [
    0, 0, 1,
    0, 1, 1,
    2, 2, 2,
  ],
  givens: [
    null, 1,    null,
    2,    null, 3,
    null, 1,    null,
  ],
}

function mountGrid(
  options: { puzzle?: Puzzle; board?: Board; violations?: readonly Violation[] } = {},
) {
  const puzzle = options.puzzle ?? SAMPLE_PUZZLE
  return mount(PuzzleGrid, {
    props: {
      puzzle,
      board: options.board ?? emptyBoard(puzzle),
      violations: options.violations ?? [],
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

  it('clicking a given is a no-op and keeps the selection', async () => {
    const wrapper = mountGrid()
    await cell(wrapper, 0).trigger('click')
    await cell(wrapper, 4).trigger('click')

    expect(cell(wrapper, 4).attributes('aria-selected')).toBeUndefined()
    expect(selectedCell(wrapper)).toBe(0)
  })

  it('Escape clears the selection', async () => {
    const wrapper = mountGrid()
    await pressOn(wrapper, 0, 'Escape')

    expect(selectedCell(wrapper)).toBeNull()
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
    { name: 'ArrowDown skips given cell 4, landing on cell 8', from: 0, key: 'ArrowDown', to: 8 },
    { name: 'ArrowUp skips given cell 10, landing on cell 6', from: 14, key: 'ArrowUp', to: 6 },
    {
      name: 'ArrowDown skips two givens, from cell 3 to cell 15',
      from: 3,
      key: 'ArrowDown',
      to: 15,
    },
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
      name: 'ArrowRight skips given cell 19 and wraps to cell 16',
      from: 18,
      key: 'ArrowRight',
      to: 16,
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

  it('the only non-given cell in its line keeps the selection', async () => {
    const wrapper = mountGrid({ puzzle: BOXED_IN })
    for (const key of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']) {
      await pressOn(wrapper, 4, key)
      expect(selectedCell(wrapper)).toBe(4)
    }
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

  it('a given named by a violation shows no marker', () => {
    const wrapper = mountGrid({ board, violations })

    expect(violations).toContainEqual({
      kind: 'touching-duplicate',
      value: 3,
      cells: [0, 4],
    })
    expect(cell(wrapper, 0).find('[data-testid="violation-marker"]').exists()).toBe(true)
    expect(cell(wrapper, 4).find('[data-testid="violation-marker"]').exists()).toBe(false)
  })
})
