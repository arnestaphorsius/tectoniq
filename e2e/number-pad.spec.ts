import { expect, test, type Page } from '@playwright/test'

/**
 * Playing by pointer alone. The component tests already prove what each key does;
 * what only a real browser can show is that a click on the pad leaves real focus in
 * the grid, so the keyboard carries on where the mouse left off.
 */

const cell = (page: Page, index: number) => page.locator(`[data-cell="${index}"]`)
const key = (page: Page, digit: number) => page.locator(`[data-digit="${digit}"]`)

test.describe('number pad', () => {
  test('enters and erases a digit with the mouse alone', async ({ page }) => {
    await page.goto('/')

    await cell(page, 0).click()
    await key(page, 2).click()
    await expect(cell(page, 0)).toHaveText('2')

    await page.getByTestId('pad-erase').click()
    await expect(cell(page, 0)).toHaveText('')
  })

  test('after a pad press the arrow keys still move the selection', async ({ page }) => {
    await page.goto('/')

    await cell(page, 0).click()
    await key(page, 1).click()
    await expect(cell(page, 0)).toBeFocused()

    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('2')

    await expect(cell(page, 1)).toBeFocused()
    await expect(cell(page, 1)).toHaveText('2')
  })

  /**
   * On a short phone screen the pad is below the fold. Handing focus back to the
   * selected cell must not scroll the page up to it, or every tap would move the
   * pad out from under the player's thumb.
   */
  test('a pad tap does not scroll the page back to the grid', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 360 })
    await page.goto('/')

    await cell(page, 0).click()
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
    const scrolled = await page.evaluate(() => window.scrollY)
    expect(scrolled).toBeGreaterThan(0)
    await expect(cell(page, 0)).not.toBeInViewport()

    await key(page, 2).click()

    await expect(cell(page, 0)).toHaveText('2')
    await expect(cell(page, 0)).toBeFocused()
    expect(await page.evaluate(() => window.scrollY)).toBe(scrolled)
  })

  test('with focus on the pad, the keyboard still plays the grid', async ({ page }) => {
    await page.goto('/')

    await cell(page, 0).click()
    // Past the mode toggle's two buttons to the first digit.
    for (let tab = 0; tab < 3; tab += 1) await page.keyboard.press('Tab')
    await expect(key(page, 1)).toBeFocused()

    await page.keyboard.press('Enter')
    await expect(cell(page, 0)).toHaveText('1')

    await page.keyboard.press('3')
    await expect(cell(page, 0)).toHaveText('3')
    await expect(key(page, 1)).toBeFocused()

    await page.keyboard.press('ArrowRight')
    await expect(cell(page, 1)).toBeFocused()
  })

  /**
   * The Pad Beside Rule's breakpoint is a literal in a media query, because custom
   * properties do not work there, while `--measure-play` is summed from the grid's
   * and the pad's own sizes. This catches the two drifting apart: the breakpoint must
   * clear the measure by a classic 17px scrollbar, or the page scrolls sideways just
   * above it on Windows.
   */
  test('the pad breakpoint clears the play measure plus a scrollbar', async ({ page }) => {
    await page.goto('/')

    const { measure, breakpoints } = await page.evaluate(() => {
      const probe = document.createElement('div')
      probe.style.width = 'var(--measure-play)'
      document.body.append(probe)
      const measure = probe.getBoundingClientRect().width
      probe.remove()

      // A `rem` in a media query is the initial font size, 16px, not the page's.
      const breakpoints = Array.from(document.styleSheets)
        .flatMap((sheet) => Array.from(sheet.cssRules))
        .filter((rule): rule is CSSMediaRule => rule instanceof CSSMediaRule)
        .map((rule) => /min-width:\s*([\d.]+)rem/.exec(rule.conditionText)?.[1])
        .filter((rem) => rem !== undefined)
        .map((rem) => Number(rem) * 16)
      return { measure, breakpoints }
    })

    expect(measure).toBe(1040)
    expect(breakpoints).toHaveLength(1)
    expect((breakpoints[0] ?? 0) - measure).toBeGreaterThanOrEqual(17)
  })

  /** The Cell Floor Rule's audit, with the pad under the grid where it is tightest. */
  test('the play screen never scrolls sideways, even at 320px', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 720 })
    await page.goto('/')
    await expect(page.getByTestId('number-pad')).toBeVisible()

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    )
    expect(overflow).toBe(0)
  })
})
