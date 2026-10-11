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
    await expect(button).toHaveText('Show digit')

    await button.click()
    await expect(page.getByTestId('hint-digit')).toContainText('1')

    await page.getByTestId('hint-fill').click()
    await expect(page.locator('[data-cell="17"]')).toHaveText('1')
    await expect(target).toHaveCount(0)

    // The next hint is Unique's 1 at cell 15, found on the board with 17 filled.
    await page.getByTestId('hint-advance').click()
    await expect(target).toHaveAttribute('data-cell', '15')
  })
})
