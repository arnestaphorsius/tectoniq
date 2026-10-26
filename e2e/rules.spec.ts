import { expect, test, type Page } from '@playwright/test'

/**
 * The rules as a player meets them, in a real browser: a broken rule is marked the
 * moment it is broken and unmarked the moment it is mended, a given stands whatever
 * is pressed on it, and a board played to the end is recognised as solved. The
 * component tests prove each rule in isolation; this is the one place the whole
 * loop runs from a real keyboard and a real pointer.
 */

const cell = (page: Page, index: number) => page.locator(`[data-cell="${index}"]`)
const markers = (page: Page) => page.getByTestId('violation-marker')
const marked = (page: Page, index: number) => cell(page, index).getByTestId('violation-marker')

/**
 * The sample's solution, written out rather than imported: the e2e project is type
 * checked on its own, and `src/` is not part of it. `null` is a given.
 */
// prettier-ignore
const SOLUTION: readonly (number | null)[] = [
  1,    2,    3,    4,
  null, 4,    1,    null,
  1,    2,    null, null,
  null, 4,    5,    1,
  3,    1,    2,    null,
]

/** Types the solution into every open cell, one click and one key each. */
async function solve(page: Page) {
  for (const [index, digit] of SOLUTION.entries()) {
    if (digit === null) continue
    await cell(page, index).click()
    await page.keyboard.press(String(digit))
  }
}

test.describe('the rules', () => {
  test('a digit touching its twin is marked, with the given it collided with', async ({ page }) => {
    await page.goto('/')

    // Cell 0 touches the given 3 at cell 4 — diagonally would do too, this is above.
    await cell(page, 0).click()
    await page.keyboard.press('3')

    await expect(marked(page, 0)).toHaveCount(1)
    await expect(marked(page, 4)).toHaveCount(1)
    await expect(markers(page)).toHaveCount(2)
  })

  test('a diagonal twin breaks the rule too', async ({ page }) => {
    await page.goto('/')

    // Cell 14 meets the given 2 at cell 11 only at a corner, and is in another cage,
    // so rule 3 is the only rule this can break.
    await cell(page, 14).click()
    await page.keyboard.press('2')

    await expect(marked(page, 14)).toHaveCount(1)
    await expect(marked(page, 11)).toHaveCount(1)
  })

  test('mending the clash takes every marker away', async ({ page }) => {
    await page.goto('/')
    await cell(page, 0).click()
    await page.keyboard.press('3')
    await expect(markers(page)).toHaveCount(2)

    await page.keyboard.press('1')

    await expect(markers(page)).toHaveCount(0)
    await expect(cell(page, 0)).toHaveText('1')
  })

  test('a digit too big for its cage is marked', async ({ page }) => {
    await page.goto('/')

    // Cell 17 is a cage of one, so only 1 fits.
    await cell(page, 17).click()
    await page.keyboard.press('2')

    await expect(marked(page, 17)).toHaveCount(1)
  })

  test('a given stands whatever is pressed on it, by keyboard or by pad', async ({
    page,
    browserName,
  }) => {
    // The grid ignores a clear on a given without preventing it, and WebKit's default
    // for Backspace is to go back a page — taking the board with it.
    test.fixme(browserName === 'webkit', 'Backspace on a given navigates back in WebKit')
    await page.goto('/')
    await cell(page, 4).click()

    await page.keyboard.press('1')
    await page.keyboard.press('Backspace')
    await page.keyboard.press('Delete')
    await page.keyboard.press('Shift+Digit2')
    await page.locator('[data-digit="5"]').click()
    await page.getByTestId('pad-erase').click()

    await expect(cell(page, 4)).toHaveText('3')
    await expect(cell(page, 4).locator('[data-note]')).toHaveCount(0)
  })
})

test.describe('solving', () => {
  test('playing the sample to the end leaves nothing to hint at', async ({ page }) => {
    await page.goto('/')
    const hint = page.getByTestId('hint-advance')
    await expect(hint).toBeEnabled()

    await solve(page)

    await expect(markers(page)).toHaveCount(0)
    await expect(hint).toBeDisabled()
  })

  test('taking a digit out of a solved board offers a hint again', async ({ page }) => {
    await page.goto('/')
    await solve(page)
    await expect(page.getByTestId('hint-advance')).toBeDisabled()

    await cell(page, 0).click()
    await page.keyboard.press('Backspace')

    await expect(page.getByTestId('hint-advance')).toBeEnabled()
  })
})
