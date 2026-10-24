import { test, expect } from './fixtures'

test.describe('Farming Depot Integration Flow', () => {
  test('persists items added on /depot and reflects depot badge on direct /farming navigation', async ({
    page,
  }) => {
    // 1. Navigate to /depot and wait for currencies/items to render
    await page.goto('/depot')
    await page.waitForLoadState('domcontentloaded')
    await page.locator('.ak-depot__currencies').waitFor({ state: 'visible' })

    const testItemIds = ['30012', '30011', '3303']

    for (const itemId of testItemIds) {
      const card = page.locator(`.ak-depot-card[data-item-id="${itemId}"]`)
      await expect(card).toBeVisible()
      await card.scrollIntoViewIfNeeded()

      const input = card.locator('input[type="number"]')
      await input.fill('10')
      await input.dispatchEvent('input')
      await page.waitForTimeout(100)
    }

    // 2. Verify storage persistence (checks localStorage and IndexedDB adapter)
    const storedData = await page.evaluate(async () => {
      const rawLocal = localStorage.getItem('arkcalc_depot')
      if (rawLocal) {
        try {
          return JSON.parse(rawLocal)
        } catch {
          return null
        }
      }
      return new Promise<{ items?: Record<string, number> } | null>((resolve) => {
        const req = window.indexedDB.open('arkcalc', 1)
        req.onsuccess = () => {
          const db = req.result
          if (!db.objectStoreNames.contains('depot')) return resolve(null)
          const tx = db.transaction('depot', 'readonly')
          const store = tx.objectStore('depot')
          const getReq = store.get('arkcalc_depot')
          getReq.onsuccess = () =>
            resolve((getReq.result as { items?: Record<string, number> }) ?? null)
          getReq.onerror = () => resolve(null)
        }
        req.onerror = () => resolve(null)
      })
    })

    expect(storedData).toBeTruthy()
    expect(storedData?.items).toBeDefined()
    for (const itemId of testItemIds) {
      expect(storedData?.items?.[itemId]).toBeGreaterThanOrEqual(10)
    }

    // 3. Navigate directly to /farming (simulating direct link / reload)
    await page.goto('/farming')
    await page.waitForLoadState('domcontentloaded')

    // 4. Verify that either Total Cost > 0 or Empty State is present
    const hasDeficitGrid = await page.locator('.farming-page__cost-card').isVisible()
    const hasEmptyState = await page.locator('.farming-page__empty-box').isVisible()
    expect(hasDeficitGrid || hasEmptyState).toBe(true)

    // 5. In either case, the depot badge must be visible with count >= 3
    const depotBadge = page
      .locator('.ak-badge')
      .filter({ hasText: /Depot: \d+ item types applied/ })
    await expect(depotBadge.first()).toBeVisible()

    const badgeText = await depotBadge.first().textContent()
    const match = badgeText?.match(/Depot:\s*(\d+)\s*item types applied/)
    expect(match).toBeTruthy()
    const count = parseInt(match![1]!, 10)
    expect(count).toBeGreaterThanOrEqual(3)
  })
})
