import { test, expect } from '@playwright/test'

test.describe('Smoke tests', () => {
  test('home page loads and displays header', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.page-home__title')).toHaveText('Arknights Companion')
  })
})
