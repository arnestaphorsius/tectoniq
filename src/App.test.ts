// @vitest-environment happy-dom
import { enableAutoUnmount, mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vite-plus/test'
import App from './App.vue'

enableAutoUnmount(afterEach)

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
