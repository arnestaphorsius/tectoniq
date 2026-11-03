import { expect, test } from '@playwright/test'

test.describe('staged hint', () => {
  test('walks to the first digit, fills it in, asks again', async ({ page }) => {
    await page.goto('/')
    const button = page.getByTestId('hint-advance')
    const target = page.locator('.hint-target')

    await button.click()
    await expect(target).toHaveAttribute('data-cell', '0')
    await expect(button).toHaveText('Why?')

    await button.click()
    await expect(page.getByTestId('hint-strategy')).toHaveText('Full Block')
    await expect(page.locator('[data-cell="0"]')).toHaveText('')

    await page.getByTestId('hint-fill').click()
    await expect(page.locator('[data-cell="0"]')).toHaveText('1')
    await expect(target).toHaveCount(0)

    // The next hint is Full Block's 1 at cell 56, the other one-cell cage.
    await page.getByTestId('hint-advance').click()
    await expect(target).toHaveAttribute('data-cell', '56')
  })

  test('the button stays in one place through every stage', async ({ page }) => {
    await page.goto('/')
    const button = page.locator('[data-testid="hint-advance"], [data-testid="hint-fill"]')
    // The box is measured against the viewport, so the click's own scroll must not count.
    await button.scrollIntoViewIfNeeded()

    const idle = await button.boundingBox()
    await button.click()
    await expect(button).toHaveText('Why?')
    const stage1 = await button.boundingBox()
    await button.click()
    await expect(button).toHaveText('Fill in')
    const stage2 = await button.boundingBox()

    expect(idle).not.toBeNull()
    expect(stage1).toEqual(idle)
    expect(stage2).toEqual(idle)
  })
})

test.describe('elimination lead-up', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    // The sample's first three hints, which need no elimination.
    for (const [cell, digit] of [
      [0, 1],
      [56, 1],
      [7, 5],
    ]) {
      await page.locator(`[data-cell="${cell}"]`).click()
      await page.keyboard.press(String(digit))
    }
  })

  test("walks the sample's Naked Pairs B hint and fills in 3", async ({ page }) => {
    const button = page.getByTestId('hint-advance')
    const marked = (mark: string) => page.locator(`.hint-${mark}`)
    const target = page.locator('[data-cell="14"]')
    /** The hint's candidates in a cell: those still possible, or those crossed out. */
    const hinted = (index: number, struck: boolean) =>
      page
        .locator(`[data-cell="${index}"] [data-testid="hint-candidates"] [data-note]`)
        .and(page.locator(struck ? '.struck' : ':not(.struck)'))

    await button.click()
    await expect(marked('target')).toHaveAttribute('data-cell', '14')
    await expect(page.getByTestId('hint-explanation')).toHaveCount(0)
    await expect(page.getByTestId('hint-candidates')).toHaveCount(0)
    await expect(target).toHaveText('')

    await button.click()
    await expect(page.getByTestId('hint-strategy')).toHaveText('Touching Pair')
    await expect(marked('reason')).toHaveCount(2)
    await expect(page.locator('[data-cell="22"]')).toHaveClass(/hint-reason/)
    await expect(page.locator('[data-cell="23"]')).toHaveClass(/hint-reason/)
    await expect(target).toHaveClass(/hint-target/)
    // The pair shows the two digits it holds, and they are crossed out of the target
    // and of cell 30, which touches both as well.
    await expect(hinted(22, false)).toHaveText(['1', '2'])
    await expect(hinted(23, false)).toHaveText(['1', '2'])
    await expect(hinted(14, true)).toHaveText(['1', '2'])
    await expect(hinted(30, true)).toHaveText(['1', '2'])
    await expect(page.getByTestId('hint-candidates')).toHaveCount(4)
    await expect(target.locator('.digit')).toHaveCount(0)

    await button.click()
    await expect(page.getByTestId('hint-strategy')).toHaveText('Naked Single')
    await expect(page.locator('[data-cell="7"]')).toHaveClass(/hint-reason/)
    await expect(page.locator('[data-cell="13"]')).toHaveClass(/hint-reason/)
    await expect(page.locator('[data-cell="15"]')).toHaveClass(/hint-reason/)
    // Only what the pair crossed out stays, so the 3 is still the player's to find.
    await expect(page.getByTestId('hint-candidates')).toHaveCount(1)
    await expect(hinted(14, true)).toHaveText(['1', '2'])
    await expect(hinted(14, false)).toHaveCount(0)
    await expect(target.locator('.digit')).toHaveCount(0)

    await page.getByTestId('hint-fill').click()
    await expect(target).toHaveText('3')
    await expect(page.getByTestId('hint-candidates')).toHaveCount(0)
    await expect(page.getByTestId('violation-marker')).toHaveCount(0)
  })

  test("a candidate marked where the hint draws shows in the player's hand", async ({ page }) => {
    const target = page.locator('[data-cell="14"]')
    await page.getByTestId('hint-advance').click()
    await page.getByTestId('hint-advance').click()
    await expect(target.getByTestId('hint-candidates')).toHaveCount(1)

    await target.click()
    await page.keyboard.press('Shift+Digit3')

    await expect(target.getByTestId('hint-candidates')).toHaveCount(0)
    await expect(target.locator('[data-testid="candidates"] [data-note]')).toHaveText(['3'])
    await expect(page.getByTestId('hint-strategy')).toHaveText('Touching Pair')
  })
})
