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

const markers = (page: Page) => page.getByTestId('unassigned-marker')

const verdict = (page: Page) => page.getByTestId('validation-message')

async function checkLayout(page: Page) {
  await page.getByTestId('check-layout').click()
}

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

  test('opens the editor on a 5 by 5 grid with nothing drawn', async ({ page }) => {
    await openEditor(page)

    await expect(page.getByTestId('puzzle-grid')).toHaveCount(0)
    await expect(page.getByTestId('cell')).toHaveCount(25)
    // Nothing is in a cage, so no cell is bounded on all four sides.
    await expect(alone(page)).toHaveCount(0)
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
    await expect(alone(page)).toHaveCount(0)
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
    await expect(cell(page, 0)).not.toHaveClass(/edge-right/)

    await page.locator('[data-preset="9"]').click()

    await expect(page.getByTestId('cell')).toHaveCount(81)
    // A blank grid and a drawn one look alike cell by cell, so ask the editor:
    // a reset that kept the cage would report 78 cells left, not "nothing".
    await checkLayout(page)
    await expect(verdict(page)).toContainText('Nothing is drawn yet')
  })

  test('checking an untouched grid says nothing is drawn, and marks nothing', async ({ page }) => {
    await openEditor(page)

    await checkLayout(page)

    await expect(verdict(page)).toContainText('Nothing is drawn yet')
    await expect(markers(page)).toHaveCount(0)
  })

  test('checking a part-drawn grid counts and marks the cells left out', async ({ page }) => {
    await openEditor(page)
    await dragAcross(page, [0, 1, 2])

    await checkLayout(page)

    await expect(verdict(page)).toContainText('22 cells are not in a cage yet')
    await expect(markers(page)).toHaveCount(22)
  })

  test('a verdict does not outlive the layout it read', async ({ page }) => {
    await openEditor(page)
    await checkLayout(page)
    await expect(verdict(page)).not.toBeEmpty()

    await dragAcross(page, [0, 1])

    await expect(verdict(page)).toBeEmpty()
    await expect(markers(page)).toHaveCount(0)
  })
})

test.describe('grid sizing', () => {
  /**
   * The audits DESIGN.md names under The Cell Floor Rule and The Grid Ceiling Rule.
   * They live here rather than in a component test because happy-dom does no layout
   * at all — only a real browser can measure a `clamp` against a container query.
   */
  test('no cell exceeds 80px and no grid exceeds 800px', async ({ page }) => {
    await openEditor(page)
    await page.locator('[data-preset="5"]').click()

    const small = await cell(page, 0).boundingBox()
    expect(small?.width).toBeLessThanOrEqual(80)

    // Twelve columns: the 800px cap binds first and the cell shrinks to suit.
    await page.getByTestId('width').fill('12')
    await page.getByTestId('height').fill('12')
    await page.getByTestId('apply-size').click()
    await expect(page.getByTestId('cell')).toHaveCount(144)

    const wide = await cell(page, 0).boundingBox()
    expect(wide?.width).toBeLessThanOrEqual(80)
    const grid = await page.getByTestId('editor-grid').boundingBox()
    expect(grid?.width).toBeLessThanOrEqual(800)
  })

  test('the page never scrolls sideways, even at 320px', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 720 })
    await openEditor(page)
    await page.getByTestId('width').fill('12')
    await page.getByTestId('height').fill('12')
    await page.getByTestId('apply-size').click()
    await expect(page.getByTestId('cell')).toHaveCount(144)

    // The frame scrolls; the document must not.
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    )
    expect(overflow).toBe(0)
  })
})
