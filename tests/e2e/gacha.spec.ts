import { test, expect } from './fixtures'

test.describe('Gacha Page (GCH-02)', () => {
  test('SSR response does not include unneeded descriptions or heavy datasets in payload', async ({
    request,
  }) => {
    const res = await request.get('/gacha')
    expect(res.ok()).toBe(true)
    const html = await res.text()

    // SSR payload checks
    const match = html.match(
      /<script type="application\/json"[^>]*id="__NUXT_DATA__"[^>]*>(.*?)<\/script>/s,
    )
    expect(match).toBeTruthy()
    const payload = match![1]!

    // Verify payload is well within budget (<= 60 KB)
    expect(payload.length).toBeLessThan(60_000)

    // Verify banner-arts list is not serialized in SSR payload
    expect(payload).not.toContain('ATTAIN_24_0_3')
  })

  test('loads gacha page, displays banners, verifies lifecycle badges and selector', async ({
    page,
  }) => {
    await page.goto('/gacha')
    await page.waitForLoadState('domcontentloaded')

    // Page header
    await expect(page.locator('.ak-page-header__title')).toBeVisible()

    // Active Global banner exists
    const currentEnCard = page.locator('.gacha-page__current-en .gacha-banner')
    await expect(currentEnCard).toBeVisible()
    await expect(currentEnCard.locator('.gacha-banner__countdown-badge--active')).toBeVisible()

    // Upcoming banners exist (11 banners)
    const upcomingCards = page.locator('.gacha-page__upcoming .gacha-banner')
    await expect(upcomingCards).toHaveCount(11)

    // Upcoming banner lifecycle status: no ENDED badge on upcoming banners (33e.1 fix verification)
    const endedBadges = page.locator('.gacha-page__upcoming .gacha-banner__countdown-badge--ended')
    await expect(endedBadges).toHaveCount(0)

    // First upcoming banner has NEXT ON GLOBAL
    const firstUpcoming = upcomingCards.first()
    await expect(firstUpcoming.locator('.gacha-banner__countdown-badge--next')).toBeVisible()

    // Click upcoming banner to select it in calculator and load detail
    await firstUpcoming.locator('.gacha-banner__card').click()
    await expect(firstUpcoming).toHaveClass(/gacha-banner--selected/)

    // Calculator is visible
    await expect(page.locator('.gacha-calc')).toBeVisible()
  })

  test('calculates rolls and milestones in calculator via stepper inputs', async ({ page }) => {
    await page.goto('/gacha')
    await page.waitForLoadState('domcontentloaded')

    const orundumInput = page.getByRole('spinbutton', { name: 'Orundum' })
    await expect(orundumInput).toBeVisible()
    await orundumInput.fill('6000')

    // 6000 orundum = 10 rolls
    await expect(page.locator('.gacha-calc__stat-value--rolls')).toHaveText('10')
  })

  test('synchronizes target banner selection, permits inputs, and toggles F2P/Monthly forecast mode', async ({
    page,
  }) => {
    await page.goto('/gacha')
    await page.waitForLoadState('domcontentloaded')

    // Verify forecast card is rendered inside calculator
    const forecastCard = page.locator('.gacha-forecast-card')
    await expect(forecastCard).toBeVisible()

    const bannerSelect = page.locator('#gacha-forecast-banner')
    await expect(bannerSelect).toBeVisible()

    // Single & Ten-roll permit inputs inside calculator
    const singleInput = page.getByRole('spinbutton', { name: 'Single Permits' })
    const tenInput = page.getByRole('spinbutton', { name: 'Ten-roll Permits' })
    await expect(singleInput).toBeVisible()
    await expect(tenInput).toBeVisible()

    // Enter permits: 2 Single (2 rolls) + 1 Ten-roll (10 rolls) = 12 rolls
    await singleInput.fill('2')
    await tenInput.fill('1')
    await expect(page.locator('.gacha-calc__stat-value--rolls')).toHaveText('12')

    // Permits notice is displayed
    await expect(page.locator('.gacha-calc__permits-notice')).toBeVisible()
    await expect(page.locator('.gacha-calc__permits-notice')).toContainText('12 free pull(s)')

    // Click upcoming banner card to switch active & forecast banner
    const secondUpcoming = page.locator('.gacha-page__upcoming .gacha-banner').nth(1)
    await secondUpcoming.locator('.gacha-banner__card').click()
    await expect(secondUpcoming).toHaveClass(/gacha-banner--selected/)

    // Toggle F2P vs Monthly Card mode
    const f2pRadio = page.locator('input[value="f2p"]')
    const monthlyRadio = page.locator('input[value="monthly_card"]')
    await expect(f2pRadio).toBeChecked()

    const initialStat = await page.locator('.gacha-forecast-card__stat-value').innerText()
    const initialNum = parseInt(initialStat.replace(/\D+/g, ''), 10)

    await monthlyRadio.check()
    await expect(monthlyRadio).toBeChecked()

    const monthlyStat = await page.locator('.gacha-forecast-card__stat-value').innerText()
    const monthlyNum = parseInt(monthlyStat.replace(/\D+/g, ''), 10)
    expect(monthlyNum).toBeGreaterThanOrEqual(initialNum)
  })
})
