import { expect, test, type Page } from '@playwright/test'

/**
 * Marking candidates in a real browser. The component tests prove what each press
 * does; these prove what only real input can: that Shift and a digit arrives as the
 * physical key the grid reads, and that Space on a focused pad key switches mode
 * rather than pressing the key, which a browser does on the key's release.
 */

const cell = (page: Page, index: number) => page.locator(`[data-cell="${index}"]`)
const key = (page: Page, digit: number) => page.locator(`[data-digit="${digit}"]`)
const drawn = (page: Page, index: number) => cell(page, index).locator('[data-note]')

test.describe('candidates', () => {
  test('marks candidates with the mouse alone, and keeps them under a digit', async ({ page }) => {
    await page.goto('/')

    await cell(page, 0).click()
    await page.locator('[data-mode="candidate"]').click()
    await key(page, 3).click()
    await key(page, 1).click()
    await expect(drawn(page, 0)).toHaveText(['1', '3'])

    await page.locator('[data-mode="normal"]').click()
    await key(page, 2).click()
    await expect(cell(page, 0)).toHaveText('2')
    await expect(drawn(page, 0)).toHaveCount(0)

    await page.getByTestId('pad-erase').click()
    await expect(drawn(page, 0)).toHaveText(['1', '3'])
  })

  test('Shift and a digit marks a candidate without leaving Normal mode', async ({ page }) => {
    await page.goto('/')

    await cell(page, 0).click()
    await page.keyboard.press('Shift+Digit2')
    await page.keyboard.press('Shift+Digit4')

    await expect(drawn(page, 0)).toHaveText(['2', '4'])
    await expect(page.locator('[data-mode="normal"]')).toHaveAttribute('aria-pressed', 'true')
  })

  test('holding Space switches the mode once', async ({ page }) => {
    await page.goto('/')
    await cell(page, 0).click()

    // A second keydown of a key already held is a repeat, as when Space is held.
    // Two, not three: three flips land on the same mode as one, so would pass anyway.
    await page.keyboard.down('Space')
    await page.keyboard.down('Space')
    await page.keyboard.up('Space')

    await expect(page.locator('[data-mode="candidate"]')).toHaveAttribute('aria-pressed', 'true')
  })

  test('Ctrl, Shift and a digit marks nothing', async ({ page }) => {
    await page.goto('/')
    await cell(page, 0).click()

    await page.keyboard.press('Control+Shift+Digit1')

    await expect(drawn(page, 0)).toHaveCount(0)
    await expect(cell(page, 0)).toHaveText('')
  })

  test('Space on a focused pad key switches mode and presses nothing', async ({ page }) => {
    await page.goto('/')

    await cell(page, 0).click()
    await page.keyboard.press('Tab')
    await expect(page.locator('[data-mode="normal"]')).toBeFocused()
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    await expect(key(page, 1)).toBeFocused()

    await page.keyboard.press('Space')

    await expect(page.locator('[data-mode="candidate"]')).toHaveAttribute('aria-pressed', 'true')
    await expect(cell(page, 0)).toHaveText('')

    await page.keyboard.press('Enter')
    await expect(drawn(page, 0)).toHaveText(['1'])
  })
})
