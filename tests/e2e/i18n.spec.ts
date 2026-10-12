import { test, expect } from './fixtures'

test.describe('I18n localization & default English locale', () => {
  test('serves English by default and does not render language switcher in header', async ({
    page,
  }) => {
    // 1. Visit root page (default locale EN)
    await page.goto('/')
    await expect(page.locator('.dashboard-page__title')).toHaveText('DASHBOARD // OVERVIEW')
    await expect(page.locator('.layout-default__disclaimer')).toContainText(
      'Arknights is a registered trademark',
    )
    await expect(page.locator('html')).toHaveAttribute('lang', /^en/)

    // 2. Language switcher is removed from navigation header
    await expect(page.locator('.layout-default__header .language-switcher')).toHaveCount(0)

    // 3. Direct visit to Russian localized route works seamlessly
    await page.goto('/ru')
    await expect(page.locator('.dashboard-page__subtitle')).toContainText(
      'Центральный командный терминал Rhodes Island',
    )
    await expect(page.locator('.layout-default__disclaimer')).toContainText(
      'Arknights является зарегистрированным товарным знаком',
    )
    await expect(page.locator('html')).toHaveAttribute('lang', /^ru/)
    await expect(page.locator('.layout-default__header .language-switcher')).toHaveCount(0)
  })
})
