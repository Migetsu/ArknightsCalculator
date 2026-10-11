import { test, expect } from '@playwright/test'

test.describe('Responsive layout and mobile drawer navigation', () => {
  test('renders desktop navigation on 1440px viewport and takes screenshot', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Desktop nav must be visible
    const desktopNav = page.locator('.layout-default__desktop-nav')
    await expect(desktopNav).toBeVisible()

    // Burger button must be hidden on desktop
    const burgerBtn = page.locator('.layout-default__burger')
    await expect(burgerBtn).toBeHidden()

    // Capture screenshot on 1440px
    await page.screenshot({ path: 'test-results/desktop-1440.png', fullPage: true })
  })

  test('handles mobile drawer navigation on 360px viewport', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 })
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Desktop nav must be hidden on mobile
    const desktopNav = page.locator('.layout-default__desktop-nav')
    await expect(desktopNav).toBeHidden()

    // Burger button must be visible with proper ARIA attributes
    const burgerBtn = page.locator('.layout-default__burger')
    await expect(burgerBtn).toBeVisible()
    await expect(burgerBtn).toHaveAttribute('aria-expanded', 'false')
    await expect(burgerBtn).toHaveAttribute('aria-controls', 'mobile-navigation')

    // Open mobile menu
    await burgerBtn.click()
    await expect(burgerBtn).toHaveAttribute('aria-expanded', 'true')

    const mobileMenu = page.locator('.layout-default__mobile-menu')
    await expect(mobileMenu).toHaveClass(/layout-default__mobile-menu--open/)
    await expect(page.locator('.layout-default__mobile-nav-link').first()).toBeVisible()
    await page.waitForTimeout(300)

    // Capture open mobile drawer screenshot on 360px
    await page.screenshot({ path: 'test-results/mobile-360-menu.png' })

    // Test Escape key closes menu and returns focus
    await page.keyboard.press('Escape')
    await expect(burgerBtn).toHaveAttribute('aria-expanded', 'false')
    await expect(burgerBtn).toBeFocused()

    // Test overlay click closes menu
    await burgerBtn.click()
    await expect(burgerBtn).toHaveAttribute('aria-expanded', 'true')

    const overlay = page.locator('.layout-default__mobile-overlay')
    await expect(overlay).toBeVisible()
    await overlay.click({ position: { x: 10, y: 10 } })

    await expect(burgerBtn).toHaveAttribute('aria-expanded', 'false')
    await expect(mobileMenu).not.toHaveClass(/layout-default__mobile-menu--open/)
    await page.waitForTimeout(300)

    // Capture closed mobile viewport screenshot
    await page.screenshot({ path: 'test-results/mobile-360.png', fullPage: true })
  })

  test('renders design system showcase in dev or verifies exclusion in production', async ({
    page,
  }) => {
    const response = await page.goto('/_ui')
    await page.waitForLoadState('networkidle')

    // In production builds (e.g. CI running build & preview), _ui route is excluded and returns 404
    if (process.env.CI) {
      expect(response?.status()).toBe(404)
      return
    }

    await expect(page.locator('.page-ui__title')).toBeVisible()
    await expect(page.locator('.ak-button--primary').first()).toBeVisible()
    await expect(page.locator('.ak-panel').first()).toBeVisible()
    await expect(page.locator('.ak-tabs').first()).toBeVisible()
    await expect(page.locator('.ak-input').first()).toBeVisible()

    await page.screenshot({ path: 'test-results/ui-showcase.png', fullPage: true })
  })
})
