import { test, expect } from './fixtures'

test.describe('Farming Efficiency Page (FRM-07)', () => {
  test('empty state renders when no plans or deficit exist', async ({ page }) => {
    await page.goto('/farming')
    await page.waitForLoadState('domcontentloaded')

    await expect(page.locator('.farming-page__empty-box')).toBeVisible()
    await expect(page.locator('.farming-page__schedule-card')).toBeVisible()

    // Week day buttons exist
    const dayButtons = page.locator('.farming-page__day-btn')
    await expect(dayButtons).toHaveCount(7)

    // Attribution footer exists
    const footer = page.locator('.farming-page__footer')
    await expect(footer).toBeVisible()
    await expect(footer).toContainText('Penguin Statistics')
  })

  test('navigates from planner to farming and calculates optimal stages', async ({ page }) => {
    test.setTimeout(60000)
    // 1. Setup plan in planner
    await page.goto('/planner')
    await page.waitForLoadState('domcontentloaded')

    // Ensure planner has an operator plan
    const planCards = page.locator('.planner-sidebar__plan-card')
    if ((await planCards.count()) === 0) {
      const addOpBtn = page.getByRole('button', { name: /Add operator/i }).first()
      await addOpBtn.click()
      await expect(page.locator('.op-modal')).toBeVisible()
      await page.locator('.op-modal__item').first().click()
      await expect(page.locator('.op-modal')).not.toBeVisible()
    }

    // Go to Materials Tab
    await page.getByRole('tab', { name: /Materials/i }).click()
    await expect(page.locator('.planner-materials')).toBeVisible()

    // Click "Find farming stages for missing items" button
    const findFarmingBtn = page.locator('.planner-materials__farming-btn').first()
    if (await findFarmingBtn.isVisible()) {
      await findFarmingBtn.click()
      await page.waitForURL('**/farming**')
    } else {
      await page.goto('/farming')
    }

    await page.waitForLoadState('domcontentloaded')

    // 2. On /farming: Check recommended stages and total cost
    await expect(page.locator('.farming-page__stages-card, .farming-page__empty-box')).toBeVisible()

    if (await page.locator('.farming-page__stages-card').isVisible()) {
      await expect(page.locator('.farming-page__stage-row').first()).toBeVisible()
      await expect(page.locator('.farming-page__cost-card')).toBeVisible()
      await expect(page.locator('.farming-page__cost-val')).toBeVisible()

      // Verify Mobile layout order: Total Cost above Suggested Farming Stages
      await page.setViewportSize({ width: 375, height: 812 })
      const costCard = page.locator('.farming-page__cost-card')
      const stagesCard = page.locator('.farming-page__stages-card')
      const costBoxMobile = await costCard.boundingBox()
      const stagesBoxMobile = await stagesCard.boundingBox()
      expect(costBoxMobile).not.toBeNull()
      expect(stagesBoxMobile).not.toBeNull()
      expect(costBoxMobile!.y).toBeLessThan(stagesBoxMobile!.y)

      // Verify Desktop layout order: Stages card on the left, Total Cost on the right
      await page.setViewportSize({ width: 1280, height: 800 })
      const costBoxDesktop = await costCard.boundingBox()
      const stagesBoxDesktop = await stagesCard.boundingBox()
      expect(costBoxDesktop).not.toBeNull()
      expect(stagesBoxDesktop).not.toBeNull()
      expect(stagesBoxDesktop!.x).toBeLessThan(costBoxDesktop!.x)
    }

    // 3. Switch day in supply schedule
    const wedBtn = page.locator('.farming-page__day-btn').nth(2) // Wednesday (Day 3)
    await wedBtn.click()
    await expect(wedBtn).toHaveClass(/farming-page__day-btn--active/)
    await expect(page.locator('.farming-page__schedule-item').first()).toBeVisible()

    // 4. Switch server toggle
    const cnToggle = page.locator('.ak-segmented__btn').filter({ hasText: /CN/i }).first()
    if (await cnToggle.isVisible()) {
      await cnToggle.click()
      await page.waitForTimeout(500)
      await expect(cnToggle).toHaveClass(/ak-segmented__btn--active/)
    }
  })
})
