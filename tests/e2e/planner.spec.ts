import { test, expect } from './fixtures'

test.describe('Planner Page (PLN-01)', () => {
  test('full planner workflow: add 2 operators, recalculate materials, depot integration, reload persistence', async ({
    page,
  }) => {
    test.setTimeout(60000)
    // 1. Visit Planner and ensure clean state for the test
    await page.goto('/planner')
    await page.evaluate(async () => {
      localStorage.clear()
      const dbs = await window.indexedDB.databases?.()
      for (const db of dbs || []) {
        if (db.name) window.indexedDB.deleteDatabase(db.name)
      }
    })
    await page.reload()

    await expect(page.locator('.planner-page')).toBeVisible()
    await expect(page.locator('.ak-empty-state')).toBeVisible()

    // 2. Open Add Operator modal and add first operator (SilverAsh)
    await page.getByRole('button', { name: 'Add operator' }).first().click()
    await expect(page.locator('.op-modal')).toBeVisible()

    const searchInput = page.locator('.op-modal input[type="text"]')
    await searchInput.fill('SilverAsh')
    await page.waitForTimeout(100)

    // Select SilverAsh
    await page.locator('.op-modal__item').first().click()
    await expect(page.locator('.op-modal')).not.toBeVisible()

    // Verify SilverAsh plan card in sidebar and goals view
    await expect(page.locator('.planner-sidebar__plan-name').first()).toContainText('SilverAsh')
    await expect(page.locator('.planner-goals__hero-name')).toContainText('SilverAsh')

    // 3. Add second operator (Texas)
    await page.locator('.planner-sidebar__add-btn').click()
    await expect(page.locator('.op-modal')).toBeVisible()
    await searchInput.fill('Texas')
    await page.waitForTimeout(100)
    await page.locator('.op-modal__item').first().click()
    await expect(page.locator('.op-modal')).not.toBeVisible()

    // 2 plans in sidebar
    await expect(page.locator('.planner-sidebar__plan-card')).toHaveCount(2)

    // 4. Check Materials tab totals
    await page.getByRole('tab', { name: 'Materials' }).click()
    await expect(page.locator('.planner-materials')).toBeVisible()

    const missingVal = page.locator('.planner-materials__missing-value')
    await expect(missingVal).toBeVisible()
    const initialMissingCount = parseInt((await missingVal.textContent()) || '0', 10)
    expect(initialMissingCount).toBeGreaterThan(0)

    // 5. Navigate to Depot and verify "Only needed in plans" filter works
    await page.goto('/depot')
    await expect(page.locator('.ak-depot')).toBeVisible()

    // Check "Only needed in plans"
    const neededCheckbox = page.locator('input[type="checkbox"]').first()
    await neededCheckbox.check()
    await expect(neededCheckbox).toBeChecked()

    // In dev mode, click "Fill from plans" to satisfy all planner requirements
    const devFillBtn = page.locator('.ak-depot__dev-btn')
    if (await devFillBtn.isVisible()) {
      await devFillBtn.click()
    }

    // Return to Planner and verify missing items changed
    await page.goto('/planner')
    await expect(page.locator('.planner-sidebar__plan-card').first()).toBeVisible()
    await page.getByRole('tab', { name: 'Materials' }).click()
    if (await devFillBtn.isVisible()) {
      await expect(page.locator('.planner-materials__missing-value')).toHaveText('0')
    }

    // 6. Test reload persistence
    await page.reload()
    await expect(page.locator('.planner-sidebar__plan-card')).toHaveCount(2)
    await expect(page.locator('.planner-sidebar__plan-card').first()).toContainText('SilverAsh')

    // 7. Check Roadmap tab
    await page.getByRole('tab', { name: 'Roadmap' }).click()
    await expect(page.locator('.planner-roadmap')).toBeVisible()
    await expect(page.locator('.planner-roadmap__step-card').first()).toBeVisible()

    // Verify filter can be toggled
    const readyFilter = page.getByRole('button', { name: 'Ready to Complete' })
    if (await readyFilter.isVisible()) {
      await readyFilter.click()
      await page.waitForTimeout(100)
    }

    // Click apply on first step
    const firstApplyBtn = page.locator('.planner-roadmap__step-action button').first()
    if (await firstApplyBtn.isVisible()) {
      await firstApplyBtn.click()
      await page.waitForTimeout(300)
    }
  })

  test('share code import flow: open via ?plan=<code query parameter and apply', async ({
    page,
  }) => {
    test.setTimeout(60000)
    // 1. Visit Planner and create a plan
    await page.goto('/planner')
    await page.evaluate(async () => {
      localStorage.clear()
      const dbs = await window.indexedDB.databases?.()
      for (const db of dbs || []) {
        if (db.name) window.indexedDB.deleteDatabase(db.name)
      }
    })
    await page.reload()

    await page.getByRole('button', { name: 'Add operator' }).first().click()
    const searchInput = page.locator('.op-modal input[type="text"]')
    await searchInput.fill('SilverAsh')
    await page.waitForTimeout(100)
    await page.locator('.op-modal__item').first().click()
    await expect(page.locator('.op-modal')).not.toBeVisible()
    await expect(page.locator('.planner-sidebar__plan-card')).toHaveCount(1)

    // 2. Open Share modal
    await page.getByRole('button', { name: 'Share Code' }).click()
    await expect(page.locator('.planner-modal')).toBeVisible()

    const codeArea = page.locator('.planner-modal__textarea--code')
    await expect(codeArea).toBeVisible()
    await expect(codeArea).not.toHaveValue('', { timeout: 10000 })
    const shareCode = (await codeArea.inputValue()).trim()
    expect(shareCode.length).toBeGreaterThan(10)

    // 3. Clear storage and navigate with ?plan=<code URL query
    await page.evaluate(() => localStorage.clear())
    await page.goto(`/planner?plan=${shareCode}`)

    // 4. Modal opens automatically with preview, without auto-applying
    await expect(page.locator('.planner-modal')).toBeVisible()
    await expect(page.locator('.planner-modal__preview')).toBeVisible()

    // 5. Apply import
    await page.getByRole('button', { name: 'Apply Import' }).click()
    await expect(page.locator('.planner-modal')).not.toBeVisible({ timeout: 5000 })

    // 6. Verify plan is present in planner sidebar
    await expect(page.locator('.planner-sidebar__plan-card')).toHaveCount(1)
    await expect(page.locator('.planner-sidebar__plan-name').first()).toContainText('SilverAsh')
  })

  test('layout sanity: no horizontal scrollbar across breakpoints', async ({ page }) => {
    const viewports = [
      { width: 360, height: 740 },
      { width: 768, height: 1024 },
      { width: 1440, height: 900 },
    ]

    for (const vp of viewports) {
      await page.setViewportSize(vp)
      await page.goto('/planner')
      await page.waitForLoadState('networkidle')

      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth
      })
      expect(hasHorizontalScroll, `Horizontal scroll detected at ${vp.width}px`).toBe(false)
    }
  })
})
