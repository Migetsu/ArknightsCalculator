import { test, expect } from './fixtures'

test.describe('Recruitment Matrix Page (RCR-03)', () => {
  test('renders page header, tags selector, and initial empty state', async ({ page }) => {
    await page.goto('/recruit')
    await page.waitForLoadState('domcontentloaded')

    // Page header and module code
    const header = page.locator('.ak-page-header')
    await expect(header).toBeVisible()
    await expect(header).toContainText('RCR-03')
    await expect(header).toContainText('RECRUIT')

    // Selector panel exists with tag groups
    await expect(page.locator('.recruit-page__selector-panel')).toBeVisible()
    await expect(page.locator('.recruit-page__group')).toHaveCount(4)

    // Initial empty state when 0 tags selected
    await expect(page.locator('.recruit-page__state-box')).toBeVisible()
    await expect(page.locator('.recruit-page__counter-value')).toContainText('0 / 5')
  })

  test('selecting tags calculates combinations and displays guaranteed tiers', async ({ page }) => {
    await page.goto('/recruit')
    await page.waitForLoadState('domcontentloaded')

    // Find and click 'Top Operator' tag button
    const topOpBtn = page.locator('.recruit-page__tag-btn', { hasText: 'Top Operator' })
    await expect(topOpBtn).toBeVisible()
    await topOpBtn.click()

    // Counter updates to 1 / 5
    await expect(page.locator('.recruit-page__counter-value')).toContainText('1 / 5')

    // Combo card appears with 6★ guarantee
    const comboCards = page.locator('.recruit-page__combo-card')
    await expect(comboCards.first()).toBeVisible()
    await expect(page.locator('.recruit-page__tier-badge--6_star').first()).toBeVisible()

    // Add DPS tag
    const dpsBtn = page.locator('.recruit-page__tag-btn', { hasText: 'DPS' })
    await dpsBtn.click()
    await expect(page.locator('.recruit-page__counter-value')).toContainText('2 / 5')

    // Top Operator + DPS combination appears
    const topDpsCard = page
      .locator('.recruit-page__combo-card', { hasText: 'Top Operator' })
      .filter({ hasText: 'DPS' })
    await expect(topDpsCard.first()).toBeVisible()

    // Reset tags
    const resetBtn = page.locator('.recruit-page__reset-btn')
    await expect(resetBtn).toBeEnabled()
    await resetBtn.click()

    // Counter resets and empty state returns
    await expect(page.locator('.recruit-page__counter-value')).toContainText('0 / 5')
    await expect(page.locator('.recruit-page__state-box')).toBeVisible()
  })

  test('no horizontal scroll on 360px viewport', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 })
    await page.goto('/recruit')
    await page.waitForLoadState('domcontentloaded')

    // Select tags to render results
    const topOpBtn = page.locator('.recruit-page__tag-btn', { hasText: 'Top Operator' })
    await topOpBtn.click()
    const dpsBtn = page.locator('.recruit-page__tag-btn', { hasText: 'DPS' })
    await dpsBtn.click()

    await expect(page.locator('.recruit-page__combo-card').first()).toBeVisible()

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth)
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1)
  })

  test('navigating with query param pre-selects tags and computes combinations', async ({
    page,
  }) => {
    await page.goto('/recruit?tags=DPS')
    await page.waitForLoadState('domcontentloaded')

    await expect(page.locator('.recruit-page__counter-value')).toContainText('1 / 5')
    const dpsBtn = page.locator('.recruit-page__tag-btn', { hasText: 'DPS' })
    await expect(dpsBtn).toHaveClass(/recruit-page__tag-btn--active/)
    await expect(page.locator('.recruit-page__combo-card').first()).toBeVisible()
  })

  test('query param with > 5 tags triggers AkAlert warning and limits to 5', async ({ page }) => {
    await page.goto('/recruit?tags=DPS,Support,Robot,Guard,Sniper,Vanguard')
    await page.waitForLoadState('domcontentloaded')

    await expect(page.locator('.recruit-page__counter-value')).toContainText('5 / 5')
    const alert = page.locator('.recruit-page__alert')
    await expect(alert).toBeVisible()
    await expect(alert).toContainText('TAG LIMIT EXCEEDED')
  })
})
