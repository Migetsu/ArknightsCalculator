import { test, expect } from './fixtures'

test.describe('I18n localization & language selection', () => {
  test('serves English by default and does not render language switcher in header', async ({
    page,
  }) => {
    // 1. Visit root page (default locale EN)
    await page.goto('/')
    await expect(page.locator('.dashboard-page__title')).toBeVisible()
    await expect(page.locator('.layout-default__disclaimer')).toContainText(
      'Arknights is a registered trademark',
    )
    await expect(page.locator('html')).toHaveAttribute('lang', /^en/)

    // 2. Language switcher is removed from navigation header
    await expect(page.locator('.ak-header .language-switcher')).toHaveCount(0)

    // 3. Direct visit to Russian localized route works seamlessly
    await page.goto('/ru')
    await expect(page.locator('.layout-default__disclaimer')).toContainText(
      'Arknights является зарегистрированным товарным знаком',
    )
    await expect(page.locator('html')).toHaveAttribute('lang', /^ru/)
    await expect(page.locator('.ak-header .language-switcher')).toHaveCount(0)
  })

  test('switches language between English and Russian via /settings page', async ({ page }) => {
    // 1. Navigate to Settings page in English
    await page.goto('/settings')
    await expect(page.locator('.settings-page__title')).toHaveText('Settings')
    await expect(page.locator('html')).toHaveAttribute('lang', /^en/)

    // 2. Click Русский button in Settings
    const ruButton = page.locator('.settings-page__toggle-btn', { hasText: 'Русский' })
    await ruButton.click()

    // 3. Page navigates to /ru/settings and switches UI to Russian
    await expect(page).toHaveURL(/\/ru\/settings$/)
    await expect(page.locator('.settings-page__title')).toHaveText('Настройки')
    await expect(page.locator('html')).toHaveAttribute('lang', /^ru/)

    // 4. Click English button in Settings to return to English
    const enButton = page.locator('.settings-page__toggle-btn', { hasText: 'English' })
    await enButton.click()
    await expect(page).toHaveURL(/\/settings$/)
    await expect(page.locator('.settings-page__title')).toHaveText('Settings')
    await expect(page.locator('html')).toHaveAttribute('lang', /^en/)
  })
})
