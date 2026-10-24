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
})
