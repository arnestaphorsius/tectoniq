import { expect, test } from '@playwright/test'

test.describe('staged hint', () => {
  test('walks to the first digit, fills it in, asks again', async ({ page }) => {
    await page.goto('/')
    const button = page.getByTestId('hint-advance')
    const target = page.locator('.hint-target')

    await button.click()
    await expect(target).toHaveAttribute('data-cell', '17')
    await expect(button).toHaveText('Why?')

    await button.click()
    await expect(page.getByTestId('hint-strategy')).toHaveText('Full Block')
    await expect(page.locator('[data-cell="17"]')).toHaveText('')

    await page.getByTestId('hint-fill').click()
    await expect(page.locator('[data-cell="17"]')).toHaveText('1')
    await expect(target).toHaveCount(0)

    // The next hint is Unique's 1 at cell 15, found on the board with 17 filled.
    await page.getByTestId('hint-advance').click()
    await expect(target).toHaveAttribute('data-cell', '15')
  })

  test('the button stays in one place through every stage', async ({ page }) => {
    await page.goto('/')
    const button = page.locator('[data-testid="hint-advance"], [data-testid="hint-fill"]')

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
  test("walks the sample's Naked Pairs B hint and fills in 4", async ({ page }) => {
    await page.goto('/')
    // Where the five start strategies get stuck on the sample.
    for (const [cell, digit] of [
      [13, 4],
      [14, 5],
      [15, 1],
      [16, 3],
      [17, 1],
      [18, 2],
    ]) {
      await page.locator(`[data-cell="${cell}"]`).click()
      await page.keyboard.press(String(digit))
    }
    const button = page.getByTestId('hint-advance')
    const marked = (mark: string) => page.locator(`.hint-${mark}`)
    const five = page.locator('[data-cell="5"]')

    await button.click()
    await expect(marked('target')).toHaveAttribute('data-cell', '5')
    await expect(page.getByTestId('hint-explanation')).toHaveCount(0)
    await expect(five).toHaveText('')

    await button.click()
    await expect(page.getByTestId('hint-strategy')).toHaveText('Touching Pair')
    await expect(marked('reason')).toHaveCount(2)
    await expect(page.locator('[data-cell="8"]')).toHaveClass(/hint-reason/)
    await expect(page.locator('[data-cell="9"]')).toHaveClass(/hint-reason/)
    await expect(marked('losing')).toHaveCount(1)
    await expect(five).toHaveClass(/hint-losing/)
    await expect(five).toHaveClass(/hint-target/)
    await expect(five).toHaveText('')

    await button.click()
    await expect(page.getByTestId('hint-strategy')).toHaveText('Naked Single')
    await expect(page.locator('[data-cell="4"]')).toHaveClass(/hint-reason/)
    await expect(page.locator('[data-cell="10"]')).toHaveClass(/hint-reason/)
    await expect(marked('losing')).toHaveCount(0)
    await expect(five).toHaveText('')

    await page.getByTestId('hint-fill').click()
    await expect(five).toHaveText('4')
    await expect(page.getByTestId('violation-marker')).toHaveCount(0)
  })
})
