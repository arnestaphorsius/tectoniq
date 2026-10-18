// @vitest-environment happy-dom
import { enableAutoUnmount, mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vite-plus/test'
import App from './App.vue'
import { findHint, type HintResult } from './domain/hint'
import { SAMPLE_PUZZLE, SAMPLE_SOLUTION } from './domain/samplePuzzle'

/**
 * The real `findHint`, wrapped so a test can hand the app a result no sample board
 * gives: with the pair strategies, every legal board of the sample has a hint.
 */
vi.mock('./domain/hint', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./domain/hint')>()
  return { ...actual, findHint: vi.fn(actual.findHint) }
})

enableAutoUnmount(afterEach)
afterEach(() => vi.mocked(findHint).mockReset())

/** The next hint asked for comes back as `result`, whatever the board. */
function nextHintIs(result: HintResult) {
  vi.mocked(findHint).mockReturnValueOnce(result)
}

function mountApp() {
  return mount(App, { attachTo: document.body })
}

function cell(wrapper: VueWrapper, index: number) {
  return wrapper.get(`[data-cell="${index}"]`)
}

/** The digit rendered in every cell, so a test can assert nothing moved. */
function digits(wrapper: VueWrapper): string[] {
  return wrapper.findAll('[data-testid="cell"]').map((found) => found.text())
}

function hasMarker(wrapper: VueWrapper, index: number): boolean {
  return cell(wrapper, index).find('[data-testid="violation-marker"]').exists()
}

/** Selects `index` by clicking, then sends `key` to it. */
async function pressOn(wrapper: VueWrapper, index: number, key: string) {
  await cell(wrapper, index).trigger('click')
  await cell(wrapper, index).trigger('keydown', { key })
}

describe('selection', () => {
  it('a click outside the grid clears the selection', async () => {
    const wrapper = mountApp()
    await cell(wrapper, 0).trigger('click')
    expect(cell(wrapper, 0).attributes('aria-selected')).toBe('true')

    await wrapper.get('h1').trigger('click')

    expect(wrapper.findAll('[aria-selected="true"]')).toHaveLength(0)
  })
})

describe('digit entry', () => {
  it('a digit key with nothing selected changes nothing', async () => {
    const wrapper = mountApp()
    const before = digits(wrapper)

    await wrapper.get('[data-testid="puzzle-grid"]').trigger('keydown', { key: '4' })

    expect(digits(wrapper)).toEqual(before)
  })

  it('writes 1..5 into the selected cell', async () => {
    for (const digit of ['1', '2', '3', '4', '5']) {
      const wrapper = mountApp()
      await pressOn(wrapper, 0, digit)

      expect(cell(wrapper, 0).text()).toBe(digit)
      wrapper.unmount()
    }
  })

  it('ignores keys outside 1..5', async () => {
    const wrapper = mountApp()
    const before = digits(wrapper)

    for (const key of ['0', '6', '9', 'a']) {
      await pressOn(wrapper, 0, key)
      expect(digits(wrapper)).toEqual(before)
    }
  })

  it('replaces the digit already in the cell', async () => {
    const wrapper = mountApp()
    await pressOn(wrapper, 0, '4')
    expect(cell(wrapper, 0).text()).toBe('4')

    await cell(wrapper, 0).trigger('keydown', { key: '2' })

    expect(cell(wrapper, 0).text()).toBe('2')
  })

  it('pressing the digit already in the cell clears it', async () => {
    const wrapper = mountApp()
    await pressOn(wrapper, 0, '2')
    expect(cell(wrapper, 0).text()).toBe('2')

    await cell(wrapper, 0).trigger('keydown', { key: '2' })
    expect(cell(wrapper, 0).text()).toBe('')

    // And a third press puts it back, rather than latching the cell empty.
    await cell(wrapper, 0).trigger('keydown', { key: '2' })
    expect(cell(wrapper, 0).text()).toBe('2')
  })

  it('clears the cell on Backspace and on Delete', async () => {
    for (const key of ['Backspace', 'Delete']) {
      const wrapper = mountApp()
      await pressOn(wrapper, 0, '4')
      expect(cell(wrapper, 0).text()).toBe('4')

      await cell(wrapper, 0).trigger('keydown', { key })

      expect(cell(wrapper, 0).text()).toBe('')
      wrapper.unmount()
    }
  })

  it('clearing an already empty cell is a no-op', async () => {
    const wrapper = mountApp()
    const before = digits(wrapper)

    await pressOn(wrapper, 0, 'Backspace')

    expect(cell(wrapper, 0).text()).toBe('')
    expect(digits(wrapper)).toEqual(before)
  })
})

describe('givens', () => {
  it('a selected given ignores every keystroke that would alter it', async () => {
    const wrapper = mountApp()
    const before = digits(wrapper)

    await pressOn(wrapper, 4, '1')
    expect(cell(wrapper, 4).attributes('aria-selected')).toBe('true')

    for (const key of ['2', '5', 'Backspace', 'Delete']) {
      await cell(wrapper, 4).trigger('keydown', { key })
    }

    expect(cell(wrapper, 4).text()).toBe('3')
    expect(digits(wrapper)).toEqual(before)
  })
})

describe('violation marker', () => {
  it('a touching duplicate marks the entered cell', async () => {
    const wrapper = mountApp()

    // Cell 0 touches the given 3 at cell 4, so a 3 here breaks rule 3.
    await pressOn(wrapper, 0, '3')

    expect(hasMarker(wrapper, 0)).toBe(true)
  })

  it('a digit larger than its cage marks the cell', async () => {
    const wrapper = mountApp()

    // Cell 17 is a cage of one, which admits only the digit 1.
    await pressOn(wrapper, 17, '2')

    expect(hasMarker(wrapper, 17)).toBe(true)
  })

  it('clearing the digit removes the marker', async () => {
    const wrapper = mountApp()
    await pressOn(wrapper, 0, '3')
    expect(hasMarker(wrapper, 0)).toBe(true)

    await cell(wrapper, 0).trigger('keydown', { key: 'Backspace' })

    expect(hasMarker(wrapper, 0)).toBe(false)
  })
})

describe('screens', () => {
  /** Presses on the first cell of the editor grid, moves across the rest, releases. */
  async function drawCage(wrapper: VueWrapper, path: readonly number[]) {
    const [start, ...rest] = path
    await cell(wrapper, start as number).trigger('pointerdown')
    for (const index of rest) await cell(wrapper, index).trigger('pointermove')
    await cell(wrapper, path[path.length - 1] as number).trigger('pointerup')
  }

  const openEditor = (wrapper: VueWrapper) =>
    wrapper.get('[data-testid="open-editor"]').trigger('click')
  const openPlay = (wrapper: VueWrapper) =>
    wrapper.get('[data-testid="open-play"]').trigger('click')

  it('opens on the play screen and offers the editor', () => {
    const wrapper = mountApp()

    expect(wrapper.find('[data-testid="puzzle-grid"]').exists()).toBe(true)
    expect(wrapper.findAll('[data-testid="cell"]')).toHaveLength(20)
    expect(wrapper.find('[data-testid="open-editor"]').exists()).toBe(true)
  })

  it('opening the editor replaces the sample grid', async () => {
    const wrapper = mountApp()

    await openEditor(wrapper)

    expect(wrapper.find('[data-testid="puzzle-editor"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="puzzle-grid"]').exists()).toBe(false)
  })

  it('returning to play restores the sample and digit entry still works', async () => {
    const wrapper = mountApp()
    await openEditor(wrapper)

    await openPlay(wrapper)

    expect(wrapper.find('[data-testid="puzzle-grid"]').exists()).toBe(true)
    await pressOn(wrapper, 0, '4')
    expect(cell(wrapper, 0).text()).toBe('4')
  })

  it('drawn cages survive a round trip to the play screen', async () => {
    const wrapper = mountApp()
    await openEditor(wrapper)
    await drawCage(wrapper, [0, 1])
    expect(cell(wrapper, 0).classes('edge-right')).toBe(false)

    await openPlay(wrapper)
    await openEditor(wrapper)

    expect(cell(wrapper, 0).classes('edge-right')).toBe(false)
  })
})

describe('hint', () => {
  const advance = (wrapper: VueWrapper) => wrapper.get('[data-testid="hint-advance"]')
  const status = (wrapper: VueWrapper) => wrapper.get('[data-testid="hint-status"]')
  const marked = (wrapper: VueWrapper, mark: 'target' | 'reason' | 'losing' | 'dead') =>
    wrapper
      .findAll(`.hint-${mark}`)
      .map((found) => Number(found.attributes('data-cell')))
      .sort((a, b) => a - b)

  /** Types `entries` into the play grid, as `cell → digit`. */
  async function enter(wrapper: VueWrapper, entries: Readonly<Record<number, number>>) {
    for (const [index, digit] of Object.entries(entries)) {
      await pressOn(wrapper, Number(index), String(digit))
    }
  }

  const F_17 = { 17: 1 }
  /** Where S1–S5 get stuck; the pair strategies take it on to 5=4. */
  const F_STUCK = { 13: 4, 14: 5, 15: 1, 16: 3, 17: 1, 18: 2 }
  const F_DEAD_2 = { 13: 1, 15: 5 }
  const VIOLATION = { 5: 3 }
  const SOLVED = Object.fromEntries(
    SAMPLE_SOLUTION.flatMap((digit, index) =>
      SAMPLE_PUZZLE.givens[index] == null ? [[index, digit]] : [],
    ),
  )

  /** Asks for a hint and steps it forward to `stage`. */
  async function hintAt(wrapper: VueWrapper, stage: 1 | 2) {
    for (let step = 0; step < stage; step += 1) await advance(wrapper).trigger('click')
  }

  function expectNoHint(wrapper: VueWrapper) {
    expect(marked(wrapper, 'target')).toEqual([])
    expect(marked(wrapper, 'reason')).toEqual([])
    expect(marked(wrapper, 'dead')).toEqual([])
    expect(status(wrapper).text()).toBe('')
    expect(advance(wrapper).text()).toBe('Hint')
  }

  it('button placement; enabled, and disabled when solved', async () => {
    const wrapper = mountApp()
    const work = wrapper.get('.work')
    const grid = work.get('[data-testid="puzzle-grid"]').element
    const button = work.get('[data-testid="hint-advance"]')

    expect(work.find('[data-testid="hint-status"]').exists()).toBe(true)
    expect(grid.compareDocumentPosition(button.element) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    )
    expect(button.text()).toBe('Hint')
    expect(button.attributes('disabled')).toBeUndefined()

    await enter(wrapper, SOLVED)

    expect(advance(wrapper).attributes('disabled')).toBeDefined()
  })

  it('stage 1 marks only the target', async () => {
    const wrapper = mountApp()

    await hintAt(wrapper, 1)

    expect(marked(wrapper, 'target')).toEqual([17])
    expect(cell(wrapper, 17).classes()).not.toContain('selected')
    expect(hasMarker(wrapper, 17)).toBe(false)
    expect(marked(wrapper, 'reason')).toEqual([])
    expect(wrapper.find('[data-testid="hint-strategy"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="hint-explanation"]').exists()).toBe(false)
    expect(advance(wrapper).text()).toBe('Why?')
    expect(wrapper.find('[data-testid="hint-close"]').exists()).toBe(true)
  })

  it('stage 2 shows strategy and justifying cells, and swaps in Fill in', async () => {
    const wrapper = mountApp()
    await enter(wrapper, F_17)

    await hintAt(wrapper, 2)

    expect(wrapper.get('[data-testid="hint-strategy"]').text()).toBe('Unique')
    expect(wrapper.get('[data-testid="hint-explanation"]').text()).not.toBe('')
    expect(marked(wrapper, 'target')).toEqual([15])
    expect(marked(wrapper, 'reason')).toEqual([17])
    expect(cell(wrapper, 17).classes()).not.toContain('hint-target')
    // The digit is never shown ahead of filling it in.
    expect(cell(wrapper, 15).text()).toBe('')
    expect(wrapper.find('[data-testid="hint-fill"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="hint-advance"]').exists()).toBe(false)
  })

  it('Fill in enters the digit and discards the hint', async () => {
    const wrapper = mountApp()
    await enter(wrapper, F_17)
    const before = digits(wrapper)
    await hintAt(wrapper, 2)
    expect(digits(wrapper)).toEqual(before)

    await wrapper.get('[data-testid="hint-fill"]').trigger('click')

    expect(cell(wrapper, 15).text()).toBe('1')
    expect(wrapper.findAll('[data-testid="violation-marker"]')).toHaveLength(0)
    expectNoHint(wrapper)

    await hintAt(wrapper, 1)
    expect(advance(wrapper).text()).toBe('Why?')
    expect(wrapper.find('[data-testid="hint-strategy"]').exists()).toBe(false)
  })

  it('close discards at every stage', async () => {
    for (const stage of [1, 2] as const) {
      const wrapper = mountApp()
      const before = digits(wrapper)
      await hintAt(wrapper, stage)

      await wrapper.get('[data-testid="hint-close"]').trigger('click')

      expectNoHint(wrapper)
      expect(digits(wrapper)).toEqual(before)
      wrapper.unmount()
    }
  })

  it('a board change or screen switch discards the hint', async () => {
    const wrapper = mountApp()
    await hintAt(wrapper, 2)
    await pressOn(wrapper, 0, '4')
    expectNoHint(wrapper)

    await hintAt(wrapper, 2)
    await pressOn(wrapper, 0, 'Backspace')
    expectNoHint(wrapper)

    await hintAt(wrapper, 2)
    await wrapper.get('[data-testid="open-editor"]').trigger('click')
    await wrapper.get('[data-testid="open-play"]').trigger('click')
    expectNoHint(wrapper)
  })

  it('a violation asks to fix it first', async () => {
    const wrapper = mountApp()
    await enter(wrapper, VIOLATION)

    await advance(wrapper).trigger('click')

    expect(wrapper.get('[data-testid="hint-message"]').attributes('data-kind')).toBe('violations')
    expect(status(wrapper).text()).toMatch(/fix/i)
    expect(marked(wrapper, 'target')).toEqual([])
    expect(marked(wrapper, 'dead')).toEqual([])
  })

  it('no hint is said plainly', async () => {
    const wrapper = mountApp()
    await enter(wrapper, F_STUCK)
    nextHintIs({ kind: 'none' })

    await advance(wrapper).trigger('click')

    expect(wrapper.get('[data-testid="hint-message"]').attributes('data-kind')).toBe('none')
    expect(status(wrapper).text()).toMatch(/no hint found/i)
    expect(marked(wrapper, 'target')).toEqual([])
    expect(marked(wrapper, 'dead')).toEqual([])
  })

  it('a dead end says so and highlights every dead cell', async () => {
    const wrapper = mountApp()
    await enter(wrapper, F_DEAD_2)

    await advance(wrapper).trigger('click')

    expect(wrapper.get('[data-testid="hint-message"]').attributes('data-kind')).toBe('dead-end')
    expect(status(wrapper).text()).toMatch(/can.t be completed/i)
    expect(status(wrapper).text()).not.toMatch(/no hint found/i)
    expect(marked(wrapper, 'dead')).toEqual([14, 17])
  })

  it('messages close and clear like a hint', async () => {
    for (const entries of [VIOLATION, F_STUCK, F_DEAD_2]) {
      for (const dismiss of ['close', 'entry', 'screen'] as const) {
        const wrapper = mountApp()
        await enter(wrapper, entries)
        if (entries === F_STUCK) nextHintIs({ kind: 'none' })
        await advance(wrapper).trigger('click')
        expect(wrapper.find('[data-testid="hint-message"]').exists()).toBe(true)

        if (dismiss === 'close') await wrapper.get('[data-testid="hint-close"]').trigger('click')
        if (dismiss === 'entry') await pressOn(wrapper, 0, '4')
        if (dismiss === 'screen') {
          await wrapper.get('[data-testid="open-editor"]').trigger('click')
          await wrapper.get('[data-testid="open-play"]').trigger('click')
        }

        expectNoHint(wrapper)
        wrapper.unmount()
      }
    }
  })

  it('hint text is in a status region', async () => {
    const wrapper = mountApp()
    expect(status(wrapper).attributes('role')).toBe('status')

    await hintAt(wrapper, 2)
    for (const id of ['hint-strategy', 'hint-explanation']) {
      expect(status(wrapper).find(`[data-testid="${id}"]`).exists()).toBe(true)
    }
    await wrapper.get('[data-testid="hint-close"]').trigger('click')

    await enter(wrapper, F_STUCK)
    nextHintIs({ kind: 'none' })
    await advance(wrapper).trigger('click')
    expect(status(wrapper).find('[data-testid="hint-message"]').exists()).toBe(true)
  })

  it('an elimination gets its own stage with pair and losing cells marked', async () => {
    const wrapper = mountApp()
    await enter(wrapper, F_STUCK)

    await advance(wrapper).trigger('click')

    expect(marked(wrapper, 'target')).toEqual([5])
    expect(wrapper.find('[data-testid="hint-strategy"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="hint-explanation"]').exists()).toBe(false)
    expect(cell(wrapper, 5).text()).toBe('')

    await advance(wrapper).trigger('click')

    const strategy = wrapper.get('[data-testid="hint-strategy"]')
    expect(strategy.text()).toBe('Touching Pair')
    expect(strategy.attributes('data-step')).toBe('elimination')
    expect(wrapper.get('[data-testid="hint-explanation"]').text()).not.toBe('')
    expect(marked(wrapper, 'reason')).toEqual([8, 9])
    expect(marked(wrapper, 'losing')).toEqual([5])
    expect(marked(wrapper, 'target')).toEqual([5])
    // Two different marks, never one cell carrying both.
    expect(cell(wrapper, 5).classes()).not.toContain('hint-reason')
    expect(advance(wrapper).text()).toBe('Next')
    expect(cell(wrapper, 5).text()).toBe('')
  })

  it("after the elimination come the placement's why and Fill in", async () => {
    const wrapper = mountApp()
    await enter(wrapper, F_STUCK)
    await advance(wrapper).trigger('click')
    await advance(wrapper).trigger('click')

    await advance(wrapper).trigger('click')

    const strategy = wrapper.get('[data-testid="hint-strategy"]')
    expect(strategy.text()).toBe('Naked Single')
    expect(strategy.attributes('data-step')).toBe('placement')
    expect(wrapper.get('[data-testid="hint-explanation"]').text()).not.toBe('')
    expect(marked(wrapper, 'reason')).toEqual([4, 10])
    expect(marked(wrapper, 'losing')).toEqual([])
    expect(marked(wrapper, 'target')).toEqual([5])
    expect(wrapper.find('[data-testid="hint-fill"]').exists()).toBe(true)
    expect(cell(wrapper, 5).text()).toBe('')

    await wrapper.get('[data-testid="hint-fill"]').trigger('click')

    expect(cell(wrapper, 5).text()).toBe('4')
    expect(wrapper.findAll('[data-testid="violation-marker"]')).toHaveLength(0)
  })

  it('one press per lead-up elimination, in order', async () => {
    const elimination = (n: number, justifying: number[], losing: number) => ({
      kind: 'elimination' as const,
      strategy: `Pair ${n}`,
      removals: [{ cell: losing, digits: [1 as const] }],
      justifying,
      explanation: `Elimination ${n}.`,
    })
    nextHintIs({
      kind: 'hint',
      placement: {
        kind: 'placement',
        strategy: 'Placement',
        cell: 5,
        digit: 4,
        justifying: [4, 10],
        explanation: 'The placement.',
        reads: [{ cell: 5 }],
      },
      leadUp: [elimination(1, [0, 1], 6), elimination(2, [8, 9], 5)],
    })
    const wrapper = mountApp()

    await hintAt(wrapper, 1)
    expect(marked(wrapper, 'target')).toEqual([5])
    expect(advance(wrapper).text()).toBe('Why?')

    for (const [n, reasons, losing] of [
      [1, [0, 1], [6]],
      [2, [8, 9], [5]],
    ] as const) {
      await advance(wrapper).trigger('click')
      expect(wrapper.get('[data-testid="hint-strategy"]').text()).toBe(`Pair ${n}`)
      expect(wrapper.get('[data-testid="hint-explanation"]').text()).toBe(`Elimination ${n}.`)
      expect(marked(wrapper, 'reason')).toEqual(reasons)
      expect(marked(wrapper, 'losing')).toEqual(losing)
      expect(wrapper.find('[data-testid="hint-fill"]').exists()).toBe(false)
    }

    await advance(wrapper).trigger('click')
    expect(wrapper.get('[data-testid="hint-strategy"]').text()).toBe('Placement')
    expect(marked(wrapper, 'reason')).toEqual([4, 10])
    expect(marked(wrapper, 'losing')).toEqual([])
    expect(wrapper.find('[data-testid="hint-fill"]').exists()).toBe(true)
    expect(findHint).toHaveBeenCalledTimes(1)
  })
})
