import { expect, test, type Page } from '@playwright/test'

/**
 * The creation flow in a real browser. These repeat checks the component tests
 * already make, on purpose: only a real layout can be dragged across with a real
 * mouse, and that is the part a mounted component cannot prove.
 *
 * The play screen keeps its own coverage in `smoke.spec.ts`; nothing here stands in
 * for it, and the round trip looks at the sample only far enough to know the screen
 * really changed.
 */

const cell = (page: Page, index: number) => page.locator(`[data-cell="${index}"]`)

/** Cells drawn as a cage of one — bounded on all four sides. */
const alone = (page: Page) =>
  page.locator('[data-testid="cell"].edge-top.edge-right.edge-bottom.edge-left')

async function centre(page: Page, index: number) {
  const box = await cell(page, index).boundingBox()
  if (box === null) throw new Error(`cell ${index} is not laid out`)
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

/** Presses on the first cell, drags across the rest, and releases. */
async function dragAcross(page: Page, path: readonly number[]) {
  const [start, ...rest] = path
  const from = await centre(page, start as number)
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  for (const index of rest) {
    const to = await centre(page, index)
    await page.mouse.move(to.x, to.y)
  }
  await page.mouse.up()
}

async function openEditor(page: Page) {
  await page.goto('/')
  await page.getByTestId('open-editor').click()
  await expect(page.getByTestId('editor-grid')).toBeVisible()
}

test.describe('creating a puzzle', () => {
  test('loads on the play screen with a way into the editor', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByRole('heading', { name: 'Tectoniq' })).toBeVisible()
    await expect(page.getByTestId('cell')).toHaveCount(20)
    await expect(page.getByTestId('open-editor')).toBeVisible()
  })

  test('opens the editor on a 5 by 5 grid of one-cell cages', async ({ page }) => {
    await openEditor(page)

    await expect(page.getByTestId('puzzle-grid')).toHaveCount(0)
    await expect(page.getByTestId('cell')).toHaveCount(25)
    await expect(alone(page)).toHaveCount(25)
  })

  test('draws a three-cell cage by dragging the mouse', async ({ page }) => {
    await openEditor(page)

    await dragAcross(page, [0, 1, 2])

    // The two borders inside the cage are gone, and the one at its end is not.
    await expect(cell(page, 0)).not.toHaveClass(/edge-right/)
    await expect(cell(page, 1)).not.toHaveClass(/edge-left/)
    await expect(cell(page, 1)).not.toHaveClass(/edge-right/)
    await expect(cell(page, 2)).not.toHaveClass(/edge-left/)
    await expect(cell(page, 2)).toHaveClass(/edge-right/)
    await expect(alone(page)).toHaveCount(22)
  })

  test('the drawn cage survives a trip to the play screen', async ({ page }) => {
    await openEditor(page)
    await dragAcross(page, [0, 1, 2])

    await page.getByTestId('open-play').click()
    await expect(page.getByTestId('cell')).toHaveCount(20)
    await page.getByTestId('open-editor').click()

    await expect(page.getByTestId('cell')).toHaveCount(25)
    await expect(cell(page, 0)).not.toHaveClass(/edge-right/)
    await expect(cell(page, 1)).not.toHaveClass(/edge-right/)
  })

  test('a preset resets the grid and discards the drawn cage', async ({ page }) => {
    await openEditor(page)
    await dragAcross(page, [0, 1, 2])
    await expect(alone(page)).toHaveCount(22)

    await page.locator('[data-preset="9"]').click()

    await expect(page.getByTestId('cell')).toHaveCount(81)
    await expect(alone(page)).toHaveCount(81)
  })
})
