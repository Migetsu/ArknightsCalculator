import { test, expect } from './fixtures'

const VIEWPORTS = [360, 768, 1024, 1440, 1920]
const PAGES = [
  { path: '/', locale: 'en' },
  { path: '/ru', locale: 'ru' },
]

test.describe('Layout Sanity & Responsiveness', () => {
  for (const { path, locale } of PAGES) {
    for (const width of VIEWPORTS) {
      test(`verifies zero horizontal overflow and no raw i18n keys on ${locale.toUpperCase()} (${width}px)`, async ({
        page,
      }) => {
        await page.setViewportSize({ width, height: 900 })
        await page.goto(path)
        await page.waitForLoadState('networkidle')

        // 1. Verify no horizontal scrollbar (scrollWidth <= clientWidth)
        const overflowCheck = await page.evaluate(() => {
          const docEl = document.documentElement
          const scrollWidth = docEl.scrollWidth
          const clientWidth = docEl.clientWidth
          const overflowingElements: string[] = []

          if (scrollWidth > clientWidth) {
            const allElements = Array.from(document.querySelectorAll('*'))
            for (const el of allElements) {
              const r = el.getBoundingClientRect()
              if (r.right > clientWidth + 0.5 && r.width > 0) {
                overflowingElements.push(
                  `<${el.tagName.toLowerCase()}> class="${el.className}" right=${Math.round(r.right)} (overflow: ${Math.round(r.right - clientWidth)}px)`,
                )
              }
            }
          }

          return {
            hasOverflow: scrollWidth > clientWidth,
            scrollWidth,
            clientWidth,
            overflowingElements,
          }
        })

        expect(
          overflowCheck.hasOverflow,
          `Horizontal scroll detected on viewport ${width}px (${locale}):\n` +
            `scrollWidth (${overflowCheck.scrollWidth}px) > clientWidth (${overflowCheck.clientWidth}px).\n` +
            `Overflowing elements:\n${overflowCheck.overflowingElements.join('\n')}`,
        ).toBe(false)

        // 2. Scan visible text nodes for unrendered i18n keys
        const rawKeys = await page.evaluate(() => {
          const rawKeyPattern = /\b[a-z]+(?:\.[a-zA-Z0-9]+){1,}\b/g
          const ignoredTokens = new Set([
            'example.com',
            'vercel.app',
            'arkcalc.vercel.app',
            'v4.12',
            'LV.1',
          ])

          const textWalker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
            acceptNode(node) {
              const parent = node.parentElement
              if (!parent) return NodeFilter.FILTER_REJECT
              const tag = parent.tagName.toLowerCase()
              if (['script', 'style', 'noscript', 'template'].includes(tag)) {
                return NodeFilter.FILTER_REJECT
              }
              const style = window.getComputedStyle(parent)
              if (
                style.display === 'none' ||
                style.visibility === 'hidden' ||
                style.opacity === '0'
              ) {
                return NodeFilter.FILTER_REJECT
              }
              return NodeFilter.FILTER_ACCEPT
            },
          })

          const suspiciousKeys: string[] = []
          let currentNode = textWalker.nextNode()
          while (currentNode) {
            const content = currentNode.textContent ?? ''
            const matches = content.match(rawKeyPattern)
            if (matches) {
              for (const match of matches) {
                if (!ignoredTokens.has(match) && !/^\d+\.\d+$/.test(match)) {
                  suspiciousKeys.push(match)
                }
              }
            }
            currentNode = textWalker.nextNode()
          }

          return suspiciousKeys
        })

        expect(rawKeys, `Raw i18n keys found in visible DOM at ${path} (${width}px)`).toEqual([])

        // 3. Save screenshot to test-results/
        await page.screenshot({
          path: `test-results/dashboard-${locale}-${width}.png`,
          fullPage: true,
        })
      })
    }
  }

  test('validates Drawer and Doctor card layout in EN and RU', async ({ page }) => {
    for (const locale of ['en', 'ru']) {
      await page.setViewportSize({ width: 360, height: 800 })
      await page.goto(locale === 'en' ? '/' : '/ru')
      await page.waitForLoadState('networkidle')

      // Open drawer
      await page.locator('.layout-default__burger').click()
      const drawer = page.locator('.ak-drawer__panel')
      await expect(drawer).toBeVisible()

      // Verify Doctor row elements do not collide or overflow drawer width
      const userCardCheck = await page.evaluate(() => {
        const drawerPanel = document.querySelector('.ak-drawer__panel')
        const userCard = document.querySelector('.layout-default__user-card')
        const level = document.querySelector('.layout-default__user-level')
        const syncBtn = document.querySelector('.layout-default__user-sync-btn')

        if (!drawerPanel || !userCard || !level || !syncBtn) {
          return { exists: false, collides: false }
        }

        const cardRect = userCard.getBoundingClientRect()
        const levelRect = level.getBoundingClientRect()
        const syncRect = syncBtn.getBoundingClientRect()

        // Check horizontal collision between level and sync button
        const collides = levelRect.right > syncRect.left

        return {
          exists: true,
          collides,
          cardWidth: cardRect.width,
          drawerWidth: drawerPanel.getBoundingClientRect().width,
        }
      })

      expect(userCardCheck.exists).toBe(true)
      expect(
        userCardCheck.collides,
        `Doctor level collided with Sync button in ${locale} drawer`,
      ).toBe(false)

      await page.screenshot({
        path: `test-results/drawer-${locale}.png`,
      })

      // Close drawer
      await page.locator('.ak-drawer__close').click()
      await expect(drawer).not.toBeVisible()
    }
  })

  test('validates Sync Account Modal layout in EN and RU', async ({ page }) => {
    for (const locale of ['en', 'ru']) {
      await page.setViewportSize({ width: 768, height: 900 })
      await page.goto(locale === 'en' ? '/' : '/ru')
      await page.waitForLoadState('networkidle')

      // Open modal via header Sync button
      await page.locator('.layout-default__sync-btn').click()
      const modal = page.locator('.ak-modal__panel')
      await expect(modal).toBeVisible()

      // Verify no horizontal overflow inside modal
      const modalOverflow = await page.evaluate(() => {
        const panel = document.querySelector('.ak-modal__panel')
        if (!panel) return false
        return panel.scrollWidth > panel.clientWidth
      })

      expect(modalOverflow, `Modal content overflowed in ${locale}`).toBe(false)

      await page.screenshot({
        path: `test-results/modal-${locale}.png`,
      })

      // Close modal
      await page.locator('.ak-modal__close').click()
      await expect(modal).not.toBeVisible()
    }
  })
})
