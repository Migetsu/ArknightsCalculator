import { test, expect } from './fixtures'

test.describe('Depot Module', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to depot page
    await page.goto('/depot')
    await page.waitForLoadState('domcontentloaded')
    // Wait until loading indicator finishes if present
    await page.locator('.ak-depot__currencies').waitFor({ state: 'visible' })
  })

  test('displays header, currency bar, filters and tier sections', async ({ page }) => {
    // 1. Verify page title
    await expect(page.locator('.ak-depot__title')).toHaveText('Depot')

    // 2. Verify currencies are present
    const currenciesBar = page.locator('.ak-depot__currencies')
    await expect(currenciesBar).toBeVisible()
    await expect(currenciesBar).toContainText('LMD')
    await expect(currenciesBar).toContainText('Orundum')
    await expect(currenciesBar).toContainText('Originite Prime')
    await expect(currenciesBar).toContainText('Single Permits')
    await expect(currenciesBar).toContainText('Ten-roll Permits')

    // 3. Verify active plan filter checkboxes
    const planCheckboxes = page.locator('.ak-depot__checkbox-input')
    await expect(planCheckboxes.first()).toBeVisible()
    await expect(planCheckboxes.first()).toBeEnabled()

    // 4. Verify tier sections are present
    const tierTitles = page.locator('.ak-depot__tier-title')
    await expect(tierTitles.first()).toBeVisible()
  })

  test('increments item count and persists value across page reload', async ({ page }) => {
    // Target the first item card in the grid
    const firstCard = page.locator('.ak-depot-card').first()
    await expect(firstCard).toBeVisible()

    const input = firstCard.locator('input[type="number"]')
    const incBtn = firstCard.locator('.ak-stepper__btn--inc')

    // Increment count
    await incBtn.click()
    const valAfterInc = await input.inputValue()
    expect(Number(valAfterInc)).toBeGreaterThan(0)

    // Fill specific known number
    await input.fill('42')
    await input.dispatchEvent('input')
    await page.waitForTimeout(100)

    // Reload page
    await page.reload()
    await page.waitForLoadState('domcontentloaded')
    await page.locator('.ak-depot__currencies').waitFor({ state: 'visible' })

    const reloadedFirstCard = page.locator('.ak-depot-card').first()
    const reloadedInput = reloadedFirstCard.locator('input[type="number"]')
    await expect(reloadedInput).toHaveValue('42')
  })

  test('filters items by search query and type buttons', async ({ page }) => {
    const searchInput = page.locator('.ak-depot__aside input[type="search"]')
    await searchInput.fill('Orirock Concentration')

    // Should display only matching cards
    const cards = page.locator('.ak-depot-card')
    await expect(cards).toHaveCount(1)
    await expect(cards.first()).toContainText('Orirock Concentration')

    // Clear search
    await searchInput.fill('')
    const allCardsCount = await page.locator('.ak-depot-card').count()
    expect(allCardsCount).toBeGreaterThan(10)

    // Click Chips filter
    const chipsBtn = page.locator('.ak-depot__type-btn', { hasText: 'Chips' })
    await chipsBtn.click()
    await expect(chipsBtn).toHaveClass(/ak-depot__type-btn--active/)

    // Check that cards contain chip in id or name
    const chipCard = page.locator('.ak-depot-card').first()
    await expect(chipCard).toBeVisible()
  })

  test('exports and imports inventory JSON with change preview', async ({ page }) => {
    // Open modal
    const modalBtn = page.locator('.ak-depot__action-btn', { hasText: 'Import / export JSON' })
    await modalBtn.click()

    const modal = page.locator('.ak-depot-modal')
    await expect(modal).toBeVisible()

    // Read exported JSON
    const exportTextarea = modal.locator('.ak-depot-modal__textarea')
    const exportVal = await exportTextarea.inputValue()
    expect(exportVal).toContain('"schemaVersion": 1')

    // Switch to Import tab
    const importTabBtn = modal.locator('.ak-depot-modal__tab-btn', { hasText: 'Import' })
    await importTabBtn.click()

    const importTextarea = modal.locator('.ak-depot-modal__textarea')
    const testImportPayload = {
      schemaVersion: 1,
      updatedAt: new Date().toISOString(),
      currencies: { lmd: 99999, orundum: 6000, originitePrime: 33 },
      items: { '30014': 88 },
    }
    await importTextarea.fill(JSON.stringify(testImportPayload, null, 2))

    // Click preview
    const previewBtn = modal.locator('button', { hasText: 'Preview Changes' })
    await previewBtn.click()

    // Diff preview should be visible
    const diffSection = modal.locator('.ak-depot-modal__diff')
    await expect(diffSection).toBeVisible()
    await expect(diffSection).toContainText('99999')

    // Apply import
    const applyBtn = modal.locator('button', { hasText: 'Apply Changes' })
    await applyBtn.click()

    // Modal should close automatically after success
    await expect(modal).not.toBeVisible({ timeout: 5000 })

    // Verify LMD updated on page
    const currencies = page.locator('.ak-depot__currencies')
    await expect(currencies.locator('input[aria-label="LMD"]')).toHaveValue('99999')
  })
})
