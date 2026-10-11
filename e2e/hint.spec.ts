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
