import { expect, test, type CDPSession, type Page } from '@playwright/test'

/**
 * Drawing a cage with a finger. A touch pointer is implicitly captured by the cell
 * it lands on, so unless the editor hands the capture back, every later move reports
 * that first cell and the cage never grows. Only real touch input takes the capture,
 * and Playwright's touchscreen can tap but not drag, so the touches go in through
 * the Chrome DevTools Protocol — which also confines this spec to Chromium.
 */

const cell = (page: Page, index: number) => page.locator(`[data-cell="${index}"]`)

async function centre(page: Page, index: number) {
  const box = await cell(page, index).boundingBox()
  if (box === null) throw new Error(`cell ${index} is not laid out`)
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

/** Puts a finger down on the first cell, slides it across the rest, and lifts it. */
async function swipeAcross(page: Page, cdp: CDPSession, path: readonly number[]) {
  const [start, ...rest] = path
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [await centre(page, start as number)],
  })
  for (const index of rest) {
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [await centre(page, index)],
    })
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
}

test.describe('drawing by touch', () => {
  test.skip(
    ({ browserName }) => browserName !== 'chromium',
    'drives touch via the Chrome DevTools Protocol, which only Chromium has',
  )

  test('a finger dragged across three cells draws one cage', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('open-editor').click()
    await expect(page.getByTestId('editor-grid')).toBeVisible()
    const cdp = await page.context().newCDPSession(page)

    await swipeAcross(page, cdp, [0, 1, 2])

    await expect(cell(page, 0)).not.toHaveClass(/edge-right/)
    await expect(cell(page, 1)).not.toHaveClass(/edge-right/)
    await expect(cell(page, 2)).toHaveClass(/edge-right/)
  })

  test('a finger drag does not scroll the page', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 500 })
    await page.goto('/')
    await page.getByTestId('open-editor').click()
    await page.locator('[data-preset="9"]').click()
    const cdp = await page.context().newCDPSession(page)
    await cell(page, 0).scrollIntoViewIfNeeded()
    const before = await page.evaluate(() => window.scrollY)

    // Straight down a column — the direction a page would scroll in.
    await swipeAcross(page, cdp, [0, 9, 18])

    await expect(cell(page, 0)).not.toHaveClass(/edge-bottom/)
    await expect(cell(page, 9)).not.toHaveClass(/edge-bottom/)
    expect(await page.evaluate(() => window.scrollY)).toBe(before)
  })
})
