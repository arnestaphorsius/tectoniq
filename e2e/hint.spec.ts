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
  test("walks the sample's Naked Pairs B hint and fills in 3", async ({ page }) => {
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
    const button = page.getByTestId('hint-advance')
    const marked = (mark: string) => page.locator(`.hint-${mark}`)
    const target = page.locator('[data-cell="14"]')

    await button.click()
    await expect(marked('target')).toHaveAttribute('data-cell', '14')
    await expect(page.getByTestId('hint-explanation')).toHaveCount(0)
    await expect(target).toHaveText('')

    await button.click()
    await expect(page.getByTestId('hint-strategy')).toHaveText('Touching Pair')
    await expect(marked('reason')).toHaveCount(2)
    await expect(page.locator('[data-cell="22"]')).toHaveClass(/hint-reason/)
    await expect(page.locator('[data-cell="23"]')).toHaveClass(/hint-reason/)
    // Cell 30 touches both as well, and loses the same two digits.
    await expect(marked('losing')).toHaveCount(2)
    await expect(page.locator('[data-cell="30"]')).toHaveClass(/hint-losing/)
    await expect(target).toHaveClass(/hint-losing/)
    await expect(target).toHaveClass(/hint-target/)
    await expect(target).toHaveText('')

    await button.click()
    await expect(page.getByTestId('hint-strategy')).toHaveText('Naked Single')
    await expect(page.locator('[data-cell="7"]')).toHaveClass(/hint-reason/)
    await expect(page.locator('[data-cell="13"]')).toHaveClass(/hint-reason/)
    await expect(page.locator('[data-cell="15"]')).toHaveClass(/hint-reason/)
    await expect(marked('losing')).toHaveCount(0)
    await expect(target).toHaveText('')

    await page.getByTestId('hint-fill').click()
    await expect(target).toHaveText('3')
    await expect(page.getByTestId('violation-marker')).toHaveCount(0)
  })
})
