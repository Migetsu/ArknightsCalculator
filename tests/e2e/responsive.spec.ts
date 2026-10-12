import { test, expect } from './fixtures'

const viewports = [
  { name: '1440', width: 1440, height: 900 },
  { name: '768', width: 768, height: 1024 },
  { name: '360', width: 360, height: 740 },
]

test.describe('Rhodes Island Terminal Design V2 Responsive & States', () => {
  for (const vp of viewports) {
    test(`renders Dashboard Overview on ${vp.name}px viewport and takes screenshot`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height })
      await page.goto('/')
      await page.waitForLoadState('networkidle')

      await expect(page.locator('.dashboard-page__title')).toBeVisible()
      await expect(page.locator('.dashboard-page__stats-grid')).toBeVisible()
      await expect(page.locator('.dashboard-page__panels-grid')).toBeVisible()

      await page.screenshot({
        path: `test-results/dashboard-${vp.name}.png`,
        fullPage: true,
      })
    })

    test(`renders and interacts with Sync Account Modal on ${vp.name}px viewport`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height })
      await page.goto('/')
      await page.waitForLoadState('networkidle')

      // Click SYNC in header
      const syncBtn = page.locator('.layout-default__sync-btn')
      await expect(syncBtn).toBeVisible()
      await syncBtn.click()

      const modal = page.locator('.ak-modal')
      await expect(modal).toBeVisible()
      await expect(page.locator('.sync-modal')).toBeVisible()
      await page.waitForTimeout(200)

      // Capture modal screenshot
      await page.screenshot({
        path: `test-results/modal-${vp.name}.png`,
      })

      // Test Escape key closes modal
      await page.keyboard.press('Escape')
      await expect(modal).toBeHidden()
    })

    test(`renders and interacts with Navigation Drawer on ${vp.name}px viewport`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height })
      await page.goto('/')
      await page.waitForLoadState('networkidle')

      // Click MENU in header
      const menuBtn = page.locator('.layout-default__burger')
      await expect(menuBtn).toBeVisible()
      await menuBtn.click()

      const drawer = page.locator('.ak-drawer')
      await expect(drawer).toBeVisible()
      await expect(page.locator('.layout-default__user-card')).toBeVisible()
      await expect(page.locator('.layout-default__nav-item').first()).toBeVisible()
      await page.waitForTimeout(250)

      // Capture drawer screenshot
      await page.screenshot({
        path: `test-results/drawer-${vp.name}.png`,
      })

      // Test Escape key closes drawer
      await page.keyboard.press('Escape')
      await expect(drawer).toBeHidden()
    })

    test(`renders Design System Showcase on ${vp.name}px or verifies exclusion in CI`, async ({
      page,
    }) => {
      if (process.env.CI) {
        const response = await page.goto('/_ui')
        expect(response?.status()).toBe(404)
        return
      }

      await page.setViewportSize({ width: vp.width, height: vp.height })
      await page.goto('/_ui')
      await page.waitForLoadState('networkidle')

      await expect(page.locator('.page-ui__title')).toBeVisible()
      await expect(page.locator('.ak-button--primary').first()).toBeVisible()
      await expect(page.locator('.ak-badge').first()).toBeVisible()
      await expect(page.locator('.ak-stat').first()).toBeVisible()

      await page.screenshot({
        path: `test-results/showcase-${vp.name}.png`,
        fullPage: true,
      })
    })
  }
})
