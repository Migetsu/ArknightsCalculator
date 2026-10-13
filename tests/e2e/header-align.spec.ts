import { test, expect } from '@playwright/test'

test.describe('Header navigation & right actions alignment', () => {
  test('aligns Settings link and Sync button on 1440px viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const header = page.locator('.ak-header')
    await expect(header).toBeVisible()

    const settingsLink = page.locator('.ak-header__settings-link')
    const syncBtn = page.locator('.ak-header__sync-btn')

    await expect(settingsLink).toBeVisible()
    await expect(syncBtn).toBeVisible()

    const settingsBox = await settingsLink.boundingBox()
    const syncBox = await syncBtn.boundingBox()

    expect(settingsBox).not.toBeNull()
    expect(syncBox).not.toBeNull()

    if (settingsBox && syncBox) {
      // Both elements have height 36px
      expect(Math.round(settingsBox.height)).toBe(36)
      expect(Math.round(syncBox.height)).toBe(36)
      // Vertically centered on the same Y coordinate
      expect(Math.abs(settingsBox.y - syncBox.y)).toBeLessThanOrEqual(1.5)
    }

    await header.screenshot({ path: 'docs/screenshots/header-1440.png' })
  })

  test('aligns Settings link and Sync button on 1024px viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 })
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const header = page.locator('.ak-header')
    await expect(header).toBeVisible()

    const settingsLink = page.locator('.ak-header__settings-link')
    const syncBtn = page.locator('.ak-header__sync-btn')

    await expect(settingsLink).toBeVisible()
    await expect(syncBtn).toBeVisible()

    const settingsBox = await settingsLink.boundingBox()
    const syncBox = await syncBtn.boundingBox()

    expect(settingsBox).not.toBeNull()
    expect(syncBox).not.toBeNull()

    if (settingsBox && syncBox) {
      expect(Math.round(settingsBox.height)).toBe(36)
      expect(Math.round(syncBox.height)).toBe(36)
      expect(Math.abs(settingsBox.y - syncBox.y)).toBeLessThanOrEqual(1.5)
    }

    await header.screenshot({ path: 'docs/screenshots/header-1024.png' })
  })

  test('renders sync button inside drawer on 360px viewport', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 })
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const burger = page.locator('.ak-header__burger')
    await expect(burger).toBeVisible()
    await burger.click()

    const drawer = page.locator('.ak-drawer')
    await expect(drawer).toBeVisible()

    const drawerSyncBtn = page.locator('.ak-header__drawer-sync-btn')
    await expect(drawerSyncBtn).toBeVisible()

    await page.screenshot({ path: 'docs/screenshots/header-drawer-360.png' })
  })
})
