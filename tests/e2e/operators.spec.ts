import { test, expect } from './fixtures'

test.describe('Operators Catalog (/operators)', () => {
  test('renders operator catalog with initial grid and counter', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })

    await page.goto('/operators')
    await page.waitForLoadState('networkidle')

    // Verify header and live counter
    await expect(page.locator('.ak-page-header__title')).toContainText('Operator Catalog')
    const counter = page.locator('.operators-page__counter-badge')
    await expect(counter).toBeVisible()
    await expect(counter).toContainText(/showing/i)

    // Verify grid cards exist
    const cards = page.locator('.ak-operator-card')
    const count = await cards.count()
    expect(count).toBeGreaterThan(0)

    // No critical runtime console errors
    expect(consoleErrors.filter((e) => !e.includes('favicon'))).toHaveLength(0)
  })

  test('searches operator by name and updates URL query', async ({ page }) => {
    await page.goto('/operators')
    await page.waitForLoadState('networkidle')

    const searchInput = page.locator('input[type="search"]')
    await searchInput.fill("Kal'tsit")

    // Expect URL query to update
    await expect(page).toHaveURL(/q=Kal('?|%27)tsit/)

    // Expect filtered results
    const card = page.locator('.ak-operator-card', { hasText: "Kal'tsit" })
    await expect(card).toBeVisible()
    await expect(page.locator('.operators-page__counter-badge')).toContainText(/1 of 1/i)
  })

  test('filters by class and rarity (multi-select)', async ({ page }) => {
    await page.goto('/operators')
    await page.waitForLoadState('networkidle')

    // Click Medic class chip
    const medicChip = page.getByRole('button', { name: 'Medic', exact: true })
    await medicChip.click()

    // Click 6★ rarity chip
    const sixStarChip = page.locator('.ak-operator-filters__chip--rarity-6')
    await sixStarChip.click()

    // Expect URL to have both parameters
    await expect(page).toHaveURL(/class=MEDIC/)
    await expect(page).toHaveURL(/rarity=6/)

    // All displayed cards must be 6 stars
    const cards = page.locator('.ak-operator-card')
    const count = await cards.count()
    expect(count).toBeGreaterThan(0)

    for (let i = 0; i < count; i++) {
      await expect(cards.nth(i).locator('.ak-operator-card__rarity')).toContainText('★★★★★★')
      await expect(cards.nth(i).locator('.ak-operator-card__class-label')).toContainText('Medic')
    }
  })

  test('switches server between Global and CN (revealing CN-exclusive operators)', async ({
    page,
  }) => {
    await page.goto('/operators')
    await page.waitForLoadState('networkidle')

    // Search for CN-exclusive operator Closure
    const searchInput = page.locator('input[type="search"]')
    await searchInput.fill('Closure')

    // Under Global server, this operator should not be displayed
    await expect(page.locator('.operators-page__empty-state')).toBeVisible()

    // Switch to CN server
    const cnServerBtn = page.locator('.ak-operator-filters__server-btn', { hasText: 'CN All' })
    await cnServerBtn.click()

    await expect(page).toHaveURL(/server=cn/)

    // Now Closure must appear with CN badge
    const card = page.locator('.ak-operator-card', { hasText: 'Closure' })
    await expect(card).toBeVisible()
    await expect(card.locator('.ak-operator-card__cn-badge')).toHaveText('CN')
  })

  test('restores filter state from shared URL link', async ({ page }) => {
    // Navigate directly with pre-filled query params
    await page.goto('/operators?q=chen&class=WARRIOR&rarity=6')
    await page.waitForLoadState('networkidle')

    // Check search input value
    const searchInput = page.locator('input[type="search"]')
    await expect(searchInput).toHaveValue('chen')

    // Check class chip is active
    const warriorChip = page.getByRole('button', { name: 'Guard', exact: true })
    await expect(warriorChip).toHaveClass(/--active/)

    // Check 6★ chip is active
    const sixStarChip = page.locator('.ak-operator-filters__chip--rarity-6')
    await expect(sixStarChip).toHaveClass(/--active/)

    // Result card must be Ch'en
    const card = page.locator('.ak-operator-card')
    await expect(card).toHaveCount(1)
    await expect(card).toContainText("Ch'en")
  })

  test('handles empty state and reset button', async ({ page }) => {
    await page.goto('/operators')
    await page.waitForLoadState('networkidle')

    const searchInput = page.locator('input[type="search"]')
    await searchInput.fill('nonexistent_operator_zero_match')

    const emptyBox = page.locator('.operators-page__empty-state')
    await expect(emptyBox).toBeVisible()
    await expect(emptyBox).toContainText('NO OPERATORS FOUND')

    // Click reset button in empty state
    const resetBtn = emptyBox.locator('button', { hasText: 'Reset Filter Parameters' })
    await resetBtn.click()

    // Results return
    await expect(page.locator('.ak-operator-card').first()).toBeVisible()
    await expect(searchInput).toHaveValue('')
  })

  test('navigates to operator detail page stub on card click', async ({ page }) => {
    await page.goto('/operators')
    await page.waitForLoadState('networkidle')

    // Search Kal'tsit
    const searchInput = page.locator('input[type="search"]')
    await searchInput.fill("Kal'tsit")

    const card = page.locator('.ak-operator-card', { hasText: "Kal'tsit" })
    await card.click()

    // Navigate to /operators/char_003_kalts
    await expect(page).toHaveURL(/\/operators\/char_003_kalts$/)
    await expect(page.locator('.ak-page-header__title')).toContainText("Kal'tsit")
    await expect(page.locator('.ak-page-header__code')).toContainText('B003')

    // Back to catalog button works
    const backBtn = page.locator('a', { hasText: 'Back to Operator Catalog' })
    await backBtn.click()
    await expect(page).toHaveURL(/\/operators$/)
  })
})
