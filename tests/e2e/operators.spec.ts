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
    await expect(page.locator('.ak-operator-card').first()).toBeVisible()

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
    await expect(page.locator('.ak-operator-card').first()).toBeVisible()

    const searchInput = page.locator('input[type="search"]')
    await expect(searchInput).toBeVisible()
    await expect(async () => {
      await searchInput.fill('Myrtle')
      await expect(page.locator('.ak-operator-card', { hasText: 'Myrtle' })).toBeVisible({
        timeout: 1000,
      })
    }).toPass({ timeout: 5000 })

    // Expect URL query to update
    await expect(page).toHaveURL(/q=Myrtle/i)

    // Expect filtered results
    const card = page.locator('.ak-operator-card', { hasText: 'Myrtle' })
    await expect(card).toBeVisible()
    await expect(page.locator('.operators-page__counter-badge')).toContainText(/1 of 1/i)
  })

  test('filters by class and rarity (multi-select)', async ({ page }) => {
    await page.goto('/operators')
    await expect(page.locator('.ak-operator-card').first()).toBeVisible()

    // Click Medic class chip
    const medicChip = page.getByRole('button', { name: 'Medic', exact: true })
    await expect(async () => {
      await medicChip.click()
      await expect(page).toHaveURL(/class=MEDIC/, { timeout: 1000 })
    }).toPass({ timeout: 5000 })

    // Click 6★ rarity chip
    const sixStarChip = page.locator('.ak-operator-filters__chip--rarity-6')
    await expect(async () => {
      await sixStarChip.click()
      await expect(page).toHaveURL(/rarity=6/, { timeout: 1000 })
    }).toPass({ timeout: 5000 })

    // All displayed cards must be 6 stars
    const cards = page.locator('.ak-operator-card')
    const count = await cards.count()
    expect(count).toBeGreaterThan(0)

    for (let i = 0; i < count; i++) {
      await expect(cards.nth(i).locator('.ak-operator-card__rarity')).toContainText('★★★★★★')
      await expect(cards.nth(i).locator('.ak-operator-card__class-label')).toContainText('Medic')
    }
  })

  test('has no server switcher, shows all operators without CN badges, ignores ?server=', async ({
    page,
  }) => {
    await page.goto('/operators?server=global')
    await expect(page.locator('.ak-operator-card').first()).toBeVisible()

    await expect(page.locator('.ak-operator-filters__server-btn')).toHaveCount(0)
    await expect(page.locator('.ak-operator-card__cn-badge')).toHaveCount(0)

    // CN-exclusive operator must be listed regardless of the query param
    const searchInput = page.locator('input[type="search"]')
    await searchInput.fill('Closure')
    await expect(page.locator('.ak-operator-card', { hasText: 'Closure' })).toBeVisible()
  })

  test('restores filter state from shared URL link', async ({ page }) => {
    // Navigate directly with pre-filled query params
    await page.goto('/operators?q=chen&class=WARRIOR&rarity=6')

    // Check search input value
    const searchInput = page.locator('input[type="search"]')
    await expect(searchInput).toHaveValue('chen')

    // Check class chip is active
    const warriorChip = page.getByRole('button', { name: 'Guard', exact: true })
    await expect(warriorChip).toHaveClass(/--active/)

    // Check 6★ chip is active
    const sixStarChip = page.locator('.ak-operator-filters__chip--rarity-6')
    await expect(sixStarChip).toHaveClass(/--active/)

    // Result cards: Ch'en and Ch'en the Dawnstreak in CN unified catalog
    const cards = page.locator('.ak-operator-card')
    await expect(cards).toHaveCount(2)
    await expect(cards.first()).toContainText("Ch'en")
  })

  test('handles empty state and reset button', async ({ page }) => {
    await page.goto('/operators')
    await expect(page.locator('.ak-operator-card').first()).toBeVisible()

    const searchInput = page.locator('input[type="search"]')
    await expect(async () => {
      await searchInput.fill('nonexistent_operator_zero_match')
      await expect(page.locator('.operators-page__empty-state')).toBeVisible({ timeout: 1000 })
    }).toPass({ timeout: 5000 })

    const emptyBox = page.locator('.operators-page__empty-state')
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
    await expect(page.locator('.ak-operator-card').first()).toBeVisible()

    // Search Kal'tsit
    const searchInput = page.locator('input[type="search"]')
    await expect(async () => {
      await searchInput.fill("Kal'tsit")
      await expect(page.locator('.ak-operator-card[href$="/char_003_kalts"]')).toBeVisible({
        timeout: 1000,
      })
    }).toPass({ timeout: 5000 })

    const card = page.locator('.ak-operator-card[href$="/char_003_kalts"]')
    await card.click()

    // Navigate to /operators/char_003_kalts
    await expect(page).toHaveURL(/\/operators\/char_003_kalts$/, { timeout: 15000 })
    await expect(page.locator('.ak-page-header__title')).toContainText("Kal'tsit")
    await expect(page.locator('.ak-page-header__code')).toContainText('B003')

    // Back to catalog button works
    const backBtn = page.locator('a', { hasText: 'Back to Operator Catalog' })
    await backBtn.click()
    await expect(page).toHaveURL(/\/operators$/)
  })
})
