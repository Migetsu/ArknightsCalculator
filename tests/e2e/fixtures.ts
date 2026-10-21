import { test as baseTest, expect } from '@playwright/test'

export const test = baseTest.extend({
  page: async ({ page }, use) => {
    const errorLogs: string[] = []

    // Whitelist known third-party or browser-specific harmless logs if necessary
    const isWhitelisted = (text: string, url = ''): boolean => {
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
      // 4. Intentional 404 response check for excluded showcase route (_ui.vue) in CI production mode
      if (text.includes('/_ui') && text.includes('404')) {
        return true
      }
      // 5. Expected 4xx from the Yostar sync proxy: sync-modal.spec.ts deliberately
      // exercises the rejected-code state, and Chromium logs every non-2xx resource.
      if (url.includes('/api/yostar/') && text.includes('Failed to load resource')) {
        return true
      }
      return false
    }

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text()
        if (!isWhitelisted(text, msg.location().url)) {
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

    const waitForHydration = async () => {
      await page
        .waitForFunction(
          () => {
            const nuxtEl = document.querySelector('#__nuxt') as unknown as {
              __vue_app__?: unknown
            } | null
            const nuxtApp = (
              window as unknown as { useNuxtApp?: () => { isHydrating?: boolean } }
            ).useNuxtApp?.()
            return Boolean(nuxtEl?.__vue_app__ && (!nuxtApp || !nuxtApp.isHydrating))
          },
          undefined,
          { timeout: 15000 },
        )
        .catch(() => {})
    }

    // Automatically wait for Nuxt client hydration purely via public DOM markers
    const originalGoto = page.goto.bind(page)
    page.goto = (async (url: string, options?: Parameters<typeof originalGoto>[1]) => {
      const response = await originalGoto(url, options)
      await waitForHydration()
      return response
    }) as typeof page.goto

    const originalReload = page.reload.bind(page)
    page.reload = (async (options?: Parameters<typeof originalReload>[0]) => {
      const response = await originalReload(options)
      await waitForHydration()
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
