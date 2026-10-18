import { test, expect } from './fixtures'

test.describe('I18n localization (English only)', () => {
  test('serves English exclusively and does not render language switcher', async ({ page }) => {
    // 1. Visit root page (default locale EN)
    await page.goto('/')
    await expect(page.locator('.dashboard-page__title')).toBeVisible()
    await expect(page.locator('.layout-default__disclaimer')).toContainText(
      'Arknights is a registered trademark',
    )
    await expect(page.locator('html')).toHaveAttribute('lang', /^en/)

    // 2. Language switcher is not present anywhere in navigation
    await expect(page.locator('.ak-header .language-switcher')).toHaveCount(0)
  })

  test('settings page operates in English without language switcher section', async ({ page }) => {
    // 1. Navigate to Settings page in English
    await page.goto('/settings')
    await expect(page.locator('.settings-page__title')).toHaveText('Settings')
    await expect(page.locator('html')).toHaveAttribute('lang', /^en/)

    // 2. Ensure language toggle section is removed
    await expect(page.locator('.settings-page__toggle-btn', { hasText: 'Русский' })).toHaveCount(0)
    await expect(page.locator('.settings-page__toggle-btn', { hasText: 'English' })).toHaveCount(0)
  })
})
