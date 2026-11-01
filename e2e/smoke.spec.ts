import { expect, test } from '@playwright/test'

test.describe('walking skeleton', () => {
  test('renders the sample puzzle', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByRole('heading', { name: 'Tectoniq' })).toBeVisible()
    await expect(page.getByTestId('puzzle-grid')).toBeVisible()
    await expect(page.getByTestId('cell')).toHaveCount(64)
  })

  test('shows the givens and leaves the rest blank', async ({ page }) => {
    await page.goto('/')

    // The sample carries eight clues.
    const filled = page.locator('[data-testid="cell"]:not(:empty)')
    await expect(filled).toHaveCount(8)
    await expect(page.locator('[data-cell="3"]')).toHaveText('2')
  })

  test('marks no violations on a legal board', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByTestId('violation-marker')).toHaveCount(0)
  })
})
