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

    await use(page)

    expect(
      errorLogs,
      `Uncaught console/page errors detected during test execution:\n${errorLogs.join('\n')}`,
    ).toEqual([])
  },
})

export { expect } from '@playwright/test'
