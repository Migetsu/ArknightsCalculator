import { test, expect } from './fixtures'

test.describe('PWA Install and Detection', () => {
  test('displays install button upon beforeinstallprompt and triggers prompt on click', async ({
    page,
  }) => {
    await page.goto('/')

    // Initially, no prompt event has fired so the install button is not present
    await expect(page.locator('.ak-install-app__button')).toHaveCount(0)

    // Simulate beforeinstallprompt event on window
    await page.evaluate(() => {
      const event = new Event('beforeinstallprompt')
      ;(window as unknown as { __promptFired?: boolean }).__promptFired = false
      Object.assign(event, {
        prompt: async () => {
          ;(window as unknown as { __promptFired?: boolean }).__promptFired = true
        },
      })
      window.dispatchEvent(event)
    })

    // Button should now be visible with proper text
    const installButton = page.locator('.ak-install-app__button')
    await expect(installButton).toBeVisible()
    await expect(installButton).toContainText('Install app')

    // Click install button
    await installButton.click()

    // Verify prompt was called
    const wasPrompted = await page.evaluate(
      () => (window as unknown as { __promptFired?: boolean }).__promptFired,
    )
    expect(wasPrompted).toBe(true)

    // After install prompt is consumed, the button disappears
    await expect(page.locator('.ak-install-app__button')).toHaveCount(0)
  })

  test('hides install button and hints when running in standalone mode', async ({ page }) => {
    // Emulate standalone display mode
    await page.addInitScript(() => {
      const origMatchMedia = window.matchMedia
      window.matchMedia = (query: string) => {
        if (query.includes('display-mode: standalone')) {
          return {
            matches: true,
            media: query,
            onchange: null,
            addListener: () => {},
            removeListener: () => {},
            addEventListener: () => {},
            removeEventListener: () => {},
            dispatchEvent: () => false,
          } as unknown as MediaQueryList
        }
        return origMatchMedia.call(window, query)
      }
    })

    await page.goto('/')

    // Dispatch beforeinstallprompt
    await page.evaluate(() => {
      const event = new Event('beforeinstallprompt')
      Object.assign(event, { prompt: async () => {} })
      window.dispatchEvent(event)
    })

    // Neither button nor hint should be shown in standalone mode
    await expect(page.locator('.ak-install-app')).toHaveCount(0)
  })
})

test.describe('PWA iOS Safari Experience', () => {
  test.use({
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  })

  test('displays iOS manual install hint instead of install button', async ({ page }) => {
    await page.goto('/')

    // On iOS Safari, beforeinstallprompt is never fired, so instructions hint is shown
    const hint = page.locator('.ak-install-app__hint')
    await expect(hint).toBeVisible()
    await expect(hint).toContainText('iPhone/iPad')

    // Install button should not be shown
    await expect(page.locator('.ak-install-app__button')).toHaveCount(0)
  })

  test('hides iOS hint if running as installed standalone web app', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'standalone', {
        value: true,
        configurable: true,
      })
    })

    await page.goto('/')

    // In standalone iOS mode, hint must be hidden
    await expect(page.locator('.ak-install-app')).toHaveCount(0)
  })
})
