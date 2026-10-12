import { test, expect } from './fixtures'

test.describe('Smoke tests', () => {
  test('home page loads and displays dashboard header', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.dashboard-page__title')).toBeVisible()
    await expect(page.locator('.layout-default__brand-title')).toHaveText('ARKCALC')
  })
})
