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
