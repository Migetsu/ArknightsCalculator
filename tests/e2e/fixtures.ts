import { test as baseTest, expect } from '@playwright/test'

export const test = baseTest.extend({
  page: async ({ page }, use) => {
    const errorLogs: string[] = []

    // Whitelist known third-party or browser-specific harmless logs if necessary
    const isWhitelisted = (text: string): boolean => {
      // 1. Harmless browser favicon 404 in test environment
      if (text.includes('favicon.ico') && text.includes('404')) {
        return true
      }
      // 2. Intentional broken image URL used in Design System showcase (_ui.vue)
      // to demonstrate and verify AkAvatar's error fallback state
      if (text.includes('/broken-link.png') && text.includes('404')) {
        return true
      }
      // 3. Harmless Vite dev server HMR websocket / overlay errors during headless browser testing
      if (
        text.includes('[vite]') ||
        text.includes('WebSocket connection') ||
        text.includes('Failed to send error to Vite server')
      ) {
        return true
      }
      return false
    }

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text()
        if (!isWhitelisted(text)) {
          errorLogs.push(`[Console Error] ${text}`)
        }
      }
    })

    page.on('pageerror', (err) => {
      const text = err.message || String(err)
      if (!isWhitelisted(text)) {
        errorLogs.push(`[Page Error] ${text}`)
      }
    })

    // Automatically wait for Nuxt client hydration after page navigation or reload
    const originalGoto = page.goto.bind(page)
    page.goto = (async (url: string, options?: Parameters<typeof originalGoto>[1]) => {
      const response = await originalGoto(url, options)
      await page.waitForSelector('html[data-hydrated="true"]', { timeout: 15000 }).catch(() => {})
      return response
    }) as typeof page.goto

    const originalReload = page.reload.bind(page)
    page.reload = (async (options?: Parameters<typeof originalReload>[0]) => {
      const response = await originalReload(options)
      await page.waitForSelector('html[data-hydrated="true"]', { timeout: 15000 }).catch(() => {})
      return response
    }) as typeof page.reload

    await use(page)

    expect(
      errorLogs,
      `Uncaught console/page errors detected during test execution:\n${errorLogs.join('\n')}`,
    ).toEqual([])
  },
})

export { expect } from '@playwright/test'
