import { test, expect } from './fixtures'
import fs from 'node:fs/promises'
import path from 'node:path'

test.describe('Audit Batch 2: DOM Asset Rendering & Visual Verification', () => {
  const viewports = [
    { width: 1440, height: 900, name: 'desktop-1440' },
    { width: 360, height: 780, name: 'mobile-360' },
  ]

  for (const vp of viewports) {
    test(`renders /operators in EN at ${vp.name} and verifies naturalWidth > 0`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height })
      await page.goto('/operators')
      await page.waitForLoadState('networkidle')

      // Ensure directory for screenshots exists
      const screenshotDir = path.resolve(process.cwd(), 'docs/screenshots')
      await fs.mkdir(screenshotDir, { recursive: true })

      // Save requested screenshot naming: operators-360.png and operators-1440.png
      const screenshotFileName = vp.width === 360 ? 'operators-360.png' : 'operators-1440.png'
      await page.screenshot({
        path: path.join(screenshotDir, screenshotFileName),
        fullPage: false,
      })

      // Check visible avatars: all loaded img elements must have naturalWidth > 0, no fallbacks
      const initialStats = await page.evaluate(() => {
        const images = Array.from(document.querySelectorAll<HTMLImageElement>('.ak-avatar__image'))
        const completedImages = images.filter((img) => img.complete)
        const validLoaded = completedImages.filter((img) => img.naturalWidth > 0)
        const fallbacks = document.querySelectorAll('.ak-avatar__fallback')
        return {
          totalImages: images.length,
          completedCount: completedImages.length,
          validLoaded: validLoaded.length,
          fallbackCount: fallbacks.length,
        }
      })

      expect(initialStats.totalImages).toBeGreaterThan(0)
      expect(initialStats.completedCount).toBeGreaterThan(0)
      // Every completed image must have naturalWidth > 0 (not broken)
      expect(initialStats.validLoaded).toBe(initialStats.completedCount)
      expect(initialStats.fallbackCount).toBe(0)
    })
  }

  test('scrolls to end of catalog, verifies naturalWidth and calculates fallback ratio in EN and RU', async ({
    page,
  }) => {
    test.setTimeout(60000)

    // 1. Audit English /operators
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/operators')
    await page.waitForLoadState('networkidle')

    // Wait for catalog cards to render
    await expect(page.locator('.ak-operator-card').first()).toBeVisible({ timeout: 15000 })

    // Scroll progressively through catalog to load all batches
    let prevCount = await page.locator('.ak-operator-card').count()
    let sameCountTries = 0

    while (sameCountTries < 6) {
      const cardsCount = await page.locator('.ak-operator-card').count()
      if (cardsCount === prevCount) {
        sameCountTries++
      } else {
        sameCountTries = 0
        prevCount = cardsCount
      }

      await page.evaluate(() => {
        const btn = document.querySelector<HTMLButtonElement>('.operators-page__load-more-btn')
        if (btn) {
          btn.click()
        }
        window.scrollTo(0, document.body.scrollHeight)
      })
      await page.waitForTimeout(100)
    }

    const enFullStats = await page.evaluate(() => {
      const cards = document.querySelectorAll('.ak-operator-card')
      const images = Array.from(document.querySelectorAll<HTMLImageElement>('.ak-avatar__image'))
      const completedImages = images.filter((img) => img.complete)
      const loadedImages = completedImages.filter((img) => img.naturalWidth > 0)
      const fallbacks = document.querySelectorAll('.ak-avatar__fallback')
      return {
        totalCards: cards.length,
        imagesCount: images.length,
        completedCount: completedImages.length,
        loadedCount: loadedImages.length,
        fallbackCount: fallbacks.length,
        fallbackRatio: cards.length > 0 ? fallbacks.length / cards.length : 0,
      }
    })

    console.log('[AUDIT EN FULL SCROLL]', JSON.stringify(enFullStats, null, 2))
    expect(enFullStats.totalCards).toBe(434) // 434 playable operators in CN unified database
    expect(enFullStats.fallbackCount).toBe(0)
    expect(enFullStats.fallbackRatio).toBe(0)
    expect(enFullStats.loadedCount).toBe(enFullStats.completedCount)

    // 2. Audit Russian /ru/operators
    await page.goto('/ru/operators')
    await page.waitForLoadState('networkidle')

    const ruInitialStats = await page.evaluate(() => {
      const images = Array.from(document.querySelectorAll<HTMLImageElement>('.ak-avatar__image'))
      const completedImages = images.filter((img) => img.complete)
      const validLoaded = completedImages.filter((img) => img.naturalWidth > 0)
      const fallbacks = document.querySelectorAll('.ak-avatar__fallback')
      return {
        totalImages: images.length,
        completedCount: completedImages.length,
        validLoaded: validLoaded.length,
        fallbackCount: fallbacks.length,
      }
    })

    expect(ruInitialStats.totalImages).toBeGreaterThan(0)
    expect(ruInitialStats.completedCount).toBeGreaterThan(0)
    expect(ruInitialStats.validLoaded).toBe(ruInitialStats.completedCount)
    expect(ruInitialStats.fallbackCount).toBe(0)
  })

  test('verifies direct access to /operators/{id} loads operator detail, not catalog', async ({
    page,
  }) => {
    test.setTimeout(60000)
    // 1. English direct visit
    await page.goto('/operators/char_003_kalts')

    // Detail page must be loaded, NOT the catalog list
    await expect(page.locator('.operator-detail-page')).toBeVisible()
    await expect(page.locator('.operators-page')).toHaveCount(0)
    await expect(page.locator('.ak-page-header__title')).toContainText("Kal'tsit")
    await expect(page.locator('.ak-page-header__code')).toContainText('B003')

    // 2. Russian direct visit
    await page.goto('/ru/operators/char_003_kalts')

    await expect(page.locator('.operator-detail-page')).toBeVisible()
    await expect(page.locator('.operators-page')).toHaveCount(0)
    await expect(page.locator('.ak-page-header__title')).toContainText("Kal'tsit")
    await expect(page.locator('.ak-page-header__code')).toContainText('B003')
  })
})
