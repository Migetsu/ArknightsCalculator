import { test, expect } from '@playwright/test'

test.describe('I18n language switching', () => {
  test('switches between EN and RU, updates URL and preserves selection', async ({ page }) => {
    // 1. Visit root page (default locale EN)
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('.page-home__title')).toHaveText('Arknights Companion')
    await expect(page.locator('.layout-default__brand')).toHaveText('Arknights Companion')

    const ruButton = page.locator('.language-switcher__btn', { hasText: 'RU' })
    const enButton = page.locator('.language-switcher__btn', { hasText: 'EN' })

    await expect(enButton).toHaveAttribute('lang', 'en')
    await expect(enButton).toHaveAttribute('hreflang', 'en')
    await expect(enButton).toHaveAttribute('aria-current', 'true')
    await expect(ruButton).toHaveAttribute('lang', 'ru')
    await expect(ruButton).toHaveAttribute('hreflang', 'ru')
    await expect(ruButton).not.toHaveAttribute('aria-current')

    // 2. Click RU to switch locale
    await ruButton.click()
    await expect(page).toHaveURL(/\/ru/)
    await expect(page.locator('.page-home__title')).toHaveText('Компаньон Arknights')
    await expect(page.locator('.layout-default__brand')).toHaveText('Компаньон Arknights')
    await expect(ruButton).toHaveAttribute('aria-current', 'true')
    await expect(enButton).not.toHaveAttribute('aria-current')

    // 3. Reload page and verify language selection persists
    await page.reload()
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/\/ru/)
    await expect(page.locator('.page-home__title')).toHaveText('Компаньон Arknights')
    await expect(ruButton).toHaveAttribute('aria-current', 'true')

    // 4. Switch back to EN
    await enButton.click()
    await expect(page).not.toHaveURL(/\/ru/)
    await expect(page.locator('.page-home__title')).toHaveText('Arknights Companion')
    await expect(page.locator('.layout-default__brand')).toHaveText('Arknights Companion')
    await expect(page.locator('.language-switcher__btn', { hasText: 'EN' })).toHaveAttribute(
      'aria-current',
      'true',
    )
    await expect(page.locator('.language-switcher__btn', { hasText: 'RU' })).not.toHaveAttribute(
      'aria-current',
    )
  })
})
