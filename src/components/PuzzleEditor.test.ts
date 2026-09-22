// @vitest-environment happy-dom
import { enableAutoUnmount, mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vite-plus/test'
import PuzzleEditor from './PuzzleEditor.vue'

enableAutoUnmount(afterEach)

const SIDES = ['edge-top', 'edge-right', 'edge-bottom', 'edge-left'] as const

function mountEditor() {
  return mount(PuzzleEditor, { attachTo: document.body })
}

function cell(wrapper: VueWrapper, index: number) {
  return wrapper.get(`[data-cell="${index}"]`)
}

function cellCount(wrapper: VueWrapper): number {
  return wrapper.findAll('[data-testid="cell"]').length
}

/**
 * Whether the grid draws no cage boundary between two orthogonal neighbours, which
 * is how "these cells share a cage" is observable in the DOM. Cage ids are never
 * rendered, so the border is the only honest thing to assert against.
 */
function joined(wrapper: VueWrapper, a: number, b: number): boolean {
  const [low, high] = a < b ? [a, b] : [b, a]
  const horizontal = high - low === 1
  return (
    !cell(wrapper, low).classes(horizontal ? 'edge-right' : 'edge-bottom') &&
    !cell(wrapper, high).classes(horizontal ? 'edge-left' : 'edge-top')
  )
}

/** Whether a cell is a cage of its own — bounded on all four sides. */
function alone(wrapper: VueWrapper, index: number): boolean {
  return SIDES.every((side) => cell(wrapper, index).classes(side))
}

/**
 * Whether the grid draws no cage boundary anywhere inside it, which is how "nothing
 * has been drawn" is observable in the DOM.
 *
 * A blank cell cannot be told from a drawn one on its own — both carry a hairline —
 * so the assertion has to be about the borders *between* cells. A grid nobody has
 * touched has none, because every neighbour agrees it is in no cage; the moment one
 * cage exists, its boundary shows up here.
 */
function noInteriorBorders(wrapper: VueWrapper): boolean {
  const width = Number(wrapper.get('[data-testid="editor-grid"]').attributes('data-width'))
  const total = cellCount(wrapper)
  for (let index = 0; index < total; index += 1) {
    if ((index % width) + 1 < width && !joined(wrapper, index, index + 1)) return false
    if (index + width < total && !joined(wrapper, index, index + width)) return false
  }
  return true
}

/** Presses on the first cell, moves across the rest, and releases on the last. */
async function drag(wrapper: VueWrapper, path: readonly number[]) {
  await press(wrapper, path)
  await cell(wrapper, path[path.length - 1] as number).trigger('pointerup')
}

/** The same, but left mid-drag with no release. */
async function press(wrapper: VueWrapper, path: readonly number[]) {
  const [start, ...rest] = path
  await cell(wrapper, start as number).trigger('pointerdown')
  for (const index of rest) await cell(wrapper, index).trigger('pointermove')
}

async function applyCustom(wrapper: VueWrapper, width: string, height: string) {
  await wrapper.get('[data-testid="width"]').setValue(width)
  await wrapper.get('[data-testid="height"]').setValue(height)
  await wrapper.get('[data-testid="apply-size"]').trigger('click')
}

function message(wrapper: VueWrapper) {
  return wrapper.find('[data-testid="size-message"]')
}

describe('sizing', () => {
  it('opens on a 5 by 5 grid with nothing drawn', () => {
    const wrapper = mountEditor()

    expect(cellCount(wrapper)).toBe(25)
    expect(wrapper.get('[data-testid="editor-grid"]').attributes('data-width')).toBe('5')
    expect(noInteriorBorders(wrapper)).toBe(true)
  })

  it('offers the 5x5, 7x7 and 9x9 presets', () => {
    const wrapper = mountEditor()

    const presets = wrapper.findAll('[data-testid="preset"]')

    expect(presets.map((found) => found.text())).toEqual(['5×5', '7×7', '9×9'])
  })

  it('a preset renders that many cells, with nothing drawn', async () => {
    const wrapper = mountEditor()

    await wrapper.get('[data-preset="7"]').trigger('click')

    expect(cellCount(wrapper)).toBe(49)
    expect(noInteriorBorders(wrapper)).toBe(true)
  })

  it('offers width, height and an apply control', () => {
    const wrapper = mountEditor()

    expect(wrapper.find('[data-testid="width"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="height"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="apply-size"]').exists()).toBe(true)
  })

  it('applies a custom 4 by 11 grid', async () => {
    const wrapper = mountEditor()

    await applyCustom(wrapper, '4', '11')

    expect(cellCount(wrapper)).toBe(44)
    expect(wrapper.get('[data-testid="editor-grid"]').attributes('data-width')).toBe('4')
    expect(noInteriorBorders(wrapper)).toBe(true)
  })

  it('accepts 3 and 12 at both bounds', async () => {
    const wrapper = mountEditor()

    await applyCustom(wrapper, '3', '12')
    expect(cellCount(wrapper)).toBe(36)
    expect(message(wrapper).exists()).toBe(false)

    await applyCustom(wrapper, '12', '3')
    expect(cellCount(wrapper)).toBe(36)
    expect(wrapper.get('[data-testid="editor-grid"]').attributes('data-width')).toBe('12')
    expect(message(wrapper).exists()).toBe(false)
  })

  it('refuses 2, 13 and a blank field, says why, and keeps the 5 by 5', async () => {
    for (const [width, height] of [
      ['2', '5'],
      ['5', '2'],
      ['13', '5'],
      ['5', '13'],
      ['', '5'],
      ['5', ''],
    ]) {
      const wrapper = mountEditor()

      await applyCustom(wrapper, width as string, height as string)

      expect(cellCount(wrapper)).toBe(25)
      expect(noInteriorBorders(wrapper)).toBe(true)
      expect(message(wrapper).text()).toContain('3')
      expect(message(wrapper).text()).toContain('12')
      wrapper.unmount()
    }
  })

  it('an accepted size clears the refusal message', async () => {
    const wrapper = mountEditor()
    await applyCustom(wrapper, '13', '13')
    expect(message(wrapper).exists()).toBe(true)

    await applyCustom(wrapper, '6', '6')

    expect(message(wrapper).exists()).toBe(false)
  })

  it('re-applying the current size discards the drawn cages', async () => {
    const wrapper = mountEditor()
    await drag(wrapper, [0, 1, 2])
    expect(joined(wrapper, 0, 1)).toBe(true)

    // The size already showing, chosen again: still a reset, still no prompt.
    await wrapper.get('[data-preset="5"]').trigger('click')

    expect(cellCount(wrapper)).toBe(25)
    expect(noInteriorBorders(wrapper)).toBe(true)
  })
})

describe('drawing', () => {
  it('the opening grid can be drawn on before any size is chosen', async () => {
    const wrapper = mountEditor()

    await drag(wrapper, [0, 1])

    expect(joined(wrapper, 0, 1)).toBe(true)
  })

  it('a drag across three neighbours makes one cage', async () => {
    const wrapper = mountEditor()

    await drag(wrapper, [0, 1, 2])

    expect(joined(wrapper, 0, 1)).toBe(true)
    expect(joined(wrapper, 1, 2)).toBe(true)
    // And the cage is bounded where it ends.
    expect(cell(wrapper, 2).classes('edge-right')).toBe(true)
    expect(cell(wrapper, 0).classes('edge-left')).toBe(true)
  })

  it('a drag stops growing at five cells and keeps what it has', async () => {
    const wrapper = mountEditor()

    await drag(wrapper, [0, 1, 2, 3, 4, 9, 14])

    for (const [a, b] of [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
    ]) {
      expect(joined(wrapper, a as number, b as number)).toBe(true)
    }
    // The cage is bounded where it stopped growing, and the two refused cells were
    // left blank rather than made cages of their own.
    expect(joined(wrapper, 4, 9)).toBe(false)
    expect(alone(wrapper, 9)).toBe(false)
    expect(joined(wrapper, 9, 14)).toBe(true)
  })

  it('a diagonal neighbour is not collected', async () => {
    const wrapper = mountEditor()

    await drag(wrapper, [0, 6])

    // 0 became a cage of one; 6 was refused and is still in no cage at all.
    expect(alone(wrapper, 0)).toBe(true)
    expect(alone(wrapper, 6)).toBe(false)
    expect(joined(wrapper, 6, 7)).toBe(true)
  })

  it('a cell sharing no edge with the cage is not collected', async () => {
    const wrapper = mountEditor()

    await drag(wrapper, [0, 12])

    expect(alone(wrapper, 0)).toBe(true)
    expect(alone(wrapper, 12)).toBe(false)
    expect(joined(wrapper, 12, 13)).toBe(true)
  })

  it('the drag survives an ignored cell and resumes', async () => {
    const wrapper = mountEditor()

    await drag(wrapper, [0, 6, 5])

    expect(joined(wrapper, 0, 5)).toBe(true)
    // 6 is not in the cage, and is not a cage of its own either.
    expect(joined(wrapper, 5, 6)).toBe(false)
    expect(alone(wrapper, 6)).toBe(false)
  })

  it('a dragged-over cell leaves its old cage', async () => {
    const wrapper = mountEditor()
    await drag(wrapper, [0, 1, 2])

    await drag(wrapper, [7, 2])

    expect(joined(wrapper, 7, 2)).toBe(true)
    expect(joined(wrapper, 0, 1)).toBe(true)
    expect(joined(wrapper, 1, 2)).toBe(false)
  })

  it('stealing the middle cell splits the old cage in two', async () => {
    const wrapper = mountEditor()
    await drag(wrapper, [0, 1, 2])

    await drag(wrapper, [6, 1])

    expect(joined(wrapper, 6, 1)).toBe(true)
    expect(alone(wrapper, 0)).toBe(true)
    expect(alone(wrapper, 2)).toBe(true)
  })

  it('a press and release isolates a single cell', async () => {
    const wrapper = mountEditor()
    await drag(wrapper, [0, 1, 2])

    await drag(wrapper, [1])

    expect(alone(wrapper, 0)).toBe(true)
    expect(alone(wrapper, 1)).toBe(true)
    expect(alone(wrapper, 2)).toBe(true)
  })

  it('the shared border disappears during the drag, before release', async () => {
    const wrapper = mountEditor()

    await press(wrapper, [0, 1])

    expect(joined(wrapper, 0, 1)).toBe(true)
  })
})

describe('checking the layout', () => {
  function checkLayout(wrapper: VueWrapper) {
    return wrapper.get('[data-testid="check-layout"]').trigger('click')
  }

  function verdict(wrapper: VueWrapper) {
    return wrapper.get('[data-testid="validation-message"]')
  }

  function markers(wrapper: VueWrapper) {
    return wrapper.findAll('[data-testid="unassigned-marker"]')
  }

  it('offers a way to check the layout', () => {
    const wrapper = mountEditor()

    expect(wrapper.find('[data-testid="check-layout"]').exists()).toBe(true)
  })

  it('says nothing before anything has been checked', () => {
    const wrapper = mountEditor()

    // Present but empty: a polite live region has to exist before it can announce.
    expect(wrapper.find('[data-testid="validation-message"]').exists()).toBe(true)
    expect(verdict(wrapper).text()).toBe('')
  })

  it('reports an untouched grid as not started, and marks nothing', async () => {
    const wrapper = mountEditor()

    await checkLayout(wrapper)

    expect(verdict(wrapper).text()).toContain('Nothing is drawn yet')
    expect(markers(wrapper)).toHaveLength(0)
  })

  it('counts the cells left out of a cage and marks each one', async () => {
    const wrapper = mountEditor()
    await drag(wrapper, [0, 1, 2])

    await checkLayout(wrapper)

    expect(verdict(wrapper).text()).toContain('22 cells are not in a cage yet')
    expect(markers(wrapper)).toHaveLength(22)
  })

  it('marks the cells without a cage and no others', async () => {
    const wrapper = mountEditor()
    await drag(wrapper, [0, 1, 2])

    await checkLayout(wrapper)

    for (const drawn of [0, 1, 2]) {
      expect(cell(wrapper, drawn).find('[data-testid="unassigned-marker"]').exists()).toBe(false)
    }
    expect(cell(wrapper, 3).find('[data-testid="unassigned-marker"]').exists()).toBe(true)
  })

  it('says a single remaining cell in the singular', async () => {
    const wrapper = mountEditor()
    // A 3×3 partitioned but for one cell: two cages of four leave 8 over.
    await applyCustom(wrapper, '3', '3')
    await drag(wrapper, [0, 1, 2, 5])
    await drag(wrapper, [3, 4, 6, 7])

    await checkLayout(wrapper)

    expect(verdict(wrapper).text()).toContain('1 cell is not in a cage yet')
    expect(markers(wrapper)).toHaveLength(1)
  })

  it('confirms a layout in which every cell is in a cage', async () => {
    const wrapper = mountEditor()
    await applyCustom(wrapper, '3', '3')
    await drag(wrapper, [0, 1, 2, 5])
    await drag(wrapper, [3, 4, 6, 7])
    await drag(wrapper, [8])

    await checkLayout(wrapper)

    expect(verdict(wrapper).text()).toContain('The layout is complete')
    expect(markers(wrapper)).toHaveLength(0)
  })

  it('does not claim a complete layout can be solved', async () => {
    const wrapper = mountEditor()
    await applyCustom(wrapper, '3', '3')
    await drag(wrapper, [0, 1, 2, 5])
    await drag(wrapper, [3, 4, 6, 7])
    await drag(wrapper, [8])

    await checkLayout(wrapper)

    // Structural completeness is not solvability — validate.test.ts keeps a
    // TWO_BY_TWO fixture that passes every check and provably has no solution.
    // This guards the copy, so a future edit cannot quietly start over-claiming.
    expect(verdict(wrapper).text().toLowerCase()).not.toContain('solv')
    expect(verdict(wrapper).text().toLowerCase()).not.toContain('valid')
  })

  it('drops the verdict as soon as a cage is drawn', async () => {
    const wrapper = mountEditor()
    await checkLayout(wrapper)
    expect(verdict(wrapper).text()).not.toBe('')

    // Mid-drag, before any release: a verdict must not outlive the layout it read.
    await press(wrapper, [0, 1])

    expect(verdict(wrapper).text()).toBe('')
    expect(markers(wrapper)).toHaveLength(0)
  })

  it('drops the verdict when the size changes', async () => {
    const wrapper = mountEditor()
    await checkLayout(wrapper)
    expect(verdict(wrapper).text()).not.toBe('')

    await wrapper.get('[data-preset="7"]').trigger('click')

    expect(verdict(wrapper).text()).toBe('')
  })

  it('keeps a standing verdict when a size is refused', async () => {
    const wrapper = mountEditor()
    await drag(wrapper, [0, 1, 2])
    await checkLayout(wrapper)

    await applyCustom(wrapper, '13', '13')

    // The layout did not change, so what was said about it still holds.
    expect(verdict(wrapper).text()).toContain('22 cells are not in a cage yet')
  })
})
