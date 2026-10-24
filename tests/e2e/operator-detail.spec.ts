import { expect, test } from './fixtures'

test.describe('Operator Detail (/operators/[id])', () => {
  test('renders 6* operator with module, changes level & updates stats and URL', async ({
    page,
  }) => {
    // 1. Open SilverAsh detail page
    await page.goto('/operators/char_172_svrash')
    await expect(page.locator('h1')).toContainText('SilverAsh')

    // Verify initial stats grid contains HP
    const statsPanel = page.locator('.ak-operator-stats-panel')
    await expect(statsPanel).toBeVisible()

    // 2. Change level input to 45
    const levelInput = page.locator('#op-level-input')
    await levelInput.fill('45')
    await levelInput.dispatchEvent('change')

    // URL should reflect level=45
    await expect(page).toHaveURL(/level=45/)

    // 3. Switch tabs with keyboard
    const skillsTab = page.locator('#tab-skills')
    await skillsTab.click()
    await expect(page.locator('.ak-operator-skills-panel')).toBeVisible()
    await expect(page).toHaveURL(/tab=skills/)

    // 4. Test keyboard Tab navigation and Escape/Arrow keys on tabs
    await skillsTab.press('ArrowRight')
    await expect(page.locator('.ak-operator-talents-panel')).toBeVisible()
    await expect(page).toHaveURL(/tab=talents/)
  })

  test('renders operator skins from the per-operator data endpoint', async ({ page }) => {
    await page.goto('/operators/char_172_svrash?tab=skins')
    await expect(page.locator('.ak-operator-skins-panel')).toBeVisible()
    await expect(page.locator('.ak-operator-skins-panel__card')).toHaveCount(5)

    // The full 1.6 MB skins dataset stays server-side; the API returns one operator.
    const response = await page.request.get('/api/skins/char_172_svrash')
    expect(response.status()).toBe(200)
    const skins = (await response.json()) as Array<{ charId: string }>
    expect(skins).toHaveLength(5)
    expect(skins.every((skin) => skin.charId === 'char_172_svrash')).toBe(true)

    const unknown = await page.request.get('/api/skins/char_999_unknown')
    expect(unknown.status()).toBe(200)
    expect(await unknown.json()).toEqual([])
  })

  test('renders 1* operator without Elite 2 (Lancet-2)', async ({ page }) => {
    await page.goto('/operators/char_285_medic2')
    await expect(page.locator('h1')).toContainText('Lancet-2')

    // Elite selector should only have E0
    const eliteButtons = page.locator('.ak-operator-stats-panel .ak-segmented__btn:has-text("E")')
    await expect(eliteButtons).toHaveCount(1)
    await expect(eliteButtons.first()).toContainText('E0')
  })

  test('does not show CN-exclusive warning banner per server model', async ({ page }) => {
    // char_1015_aglna2 previously had CN-exclusive alert
    await page.goto('/operators/char_1015_aglna2')
    await expect(page.locator('h1')).toBeVisible()
    const cnAlert = page.locator('.ak-operator-detail-page__cn-alert')
    await expect(cnAlert).not.toBeVisible()
  })

  test('first screen density: hero, stats bar, and tabs are visible without scroll on 1440x900 and 1920x1080', async ({
    page,
  }) => {
    const desktopViewports = [
      { width: 1440, height: 900 },
      { width: 1920, height: 1080 },
    ]

    for (const vp of desktopViewports) {
      await page.setViewportSize(vp)
      await page.goto('/operators/char_172_svrash')
      await page.waitForLoadState('networkidle')

      const hero = page.locator('.ak-operator-hero__stage')
      const statsBar = page.locator('.ak-operator-hero__stats-bar')
      const tabsList = page.locator('.ak-tabs__list')

      await expect(hero).toBeVisible()
      await expect(statsBar).toBeVisible()
      await expect(tabsList).toBeVisible()

      // Measure bottom position of the tabs row relative to viewport height
      const tabsBounding = await tabsList.boundingBox()
      expect(tabsBounding).not.toBeNull()
      const bottom = tabsBounding!.y + tabsBounding!.height
      expect(bottom).toBeLessThanOrEqual(vp.height)
    }
  })

  test('mobile 360px layout displays art on top and header info below', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 })
    await page.goto('/operators/char_172_svrash')
    await page.waitForLoadState('networkidle')

    const artWrapper = page.locator('.ak-operator-hero__art-wrapper')
    const headerInfo = page.locator('.ak-operator-hero__header-info')

    await expect(artWrapper).toBeVisible()
    await expect(headerInfo).toBeVisible()

    const artBox = await artWrapper.boundingBox()
    const headerBox = await headerInfo.boundingBox()

    expect(artBox).not.toBeNull()
    expect(headerBox).not.toBeNull()
    // Art is above header info in mobile vertical flow
    expect(artBox!.y).toBeLessThan(headerBox!.y)
  })

  test('synchronizes elite promotion with hero character art stage', async ({ page }) => {
    await page.goto('/operators/char_172_svrash')
    await page.waitForLoadState('networkidle')

    // Initial state: Elite 2, E2 art active
    const stageBtnE2 = page.locator('.ak-operator-hero__stage-btn:has-text("E2")')
    await expect(stageBtnE2).toHaveClass(/ak-operator-hero__stage-btn--active/)

    // Click E0 in Elite segmented control
    const btnE0 = page.locator('.ak-operator-stats-panel .ak-segmented__btn:has-text("E0")')
    await btnE0.click()

    // Hero art stage should synchronize to E0/E1
    const stageBtnE0 = page.locator('.ak-operator-hero__stage-btn:has-text("E0")')
    await expect(stageBtnE0).toHaveClass(/ak-operator-hero__stage-btn--active/)

    // Click E2 in Elite segmented control
    const btnE2 = page.locator('.ak-operator-stats-panel .ak-segmented__btn:has-text("E2")')
    await btnE2.click()
    await expect(stageBtnE2).toHaveClass(/ak-operator-hero__stage-btn--active/)
  })

  test('restores view and parameters from shared URL link', async ({ page }) => {
    await page.goto('/operators/char_172_svrash?tab=skills&elite=2&level=50&trust=80&pot=3')
    await expect(page.locator('.ak-operator-skills-panel')).toBeVisible()

    // Switch to stats tab to verify restored state
    await page.locator('#tab-stats').click()
    await expect(page.locator('.ak-operator-stats-panel')).toBeVisible()
    const levelInput = page.locator('#op-level-input')
    await expect(levelInput).toHaveValue('50')
  })

  test('renders tactical 404 state when operator id is invalid', async ({ page }) => {
    await page.goto('/operators/non_existent_operator_xyz')
    await expect(page.locator('.ak-empty-state')).toBeVisible()
    await expect(page.locator('.ak-empty-state__title')).toContainText('NOT FOUND')
  })

  test('passes responsive layout sanity across viewports', async ({ page }) => {
    const viewports = [
      { width: 360, height: 640 },
      { width: 768, height: 1024 },
      { width: 1440, height: 900 },
    ]

    for (const vp of viewports) {
      await page.setViewportSize(vp)
      await page.goto('/operators/char_172_svrash')
      await page.waitForLoadState('networkidle')

      // Check no horizontal scroll
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth)
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth)
    }
  })

  test('measures transferred resources and verifies other operators are not bundled', async ({
    page,
  }) => {
    test.slow()
    const loadedScripts: string[] = []
    let totalScriptBytes = 0

    page.on('response', async (res) => {
      if (res.request().resourceType() === 'script') {
        loadedScripts.push(res.url())
        try {
          const body = await res.body()
          totalScriptBytes += body.length
        } catch {
          // ignore closed / unbuffered responses
        }
      }
    })

    await page.goto('/operators/char_172_svrash')
    await page.waitForLoadState('networkidle')

    // SilverAsh is loaded, check that other unrelated operator IDs do not appear in network requests
    const leakedOtherOps = loadedScripts.filter(
      (url) => url.includes('char_002_amiya') || url.includes('char_103_kalts'),
    )
    expect(leakedOtherOps).toEqual([])
    expect(totalScriptBytes).toBeGreaterThan(0)
  })

  test('clicking recruit tag link in dossier tab navigates to recruitment calculator', async ({
    page,
  }) => {
    await page.goto('/operators/char_002_amiya?tab=info')
    await page.waitForLoadState('domcontentloaded')

    const dpsTagLink = page.locator('.ak-operator-info-panel__tag-link', { hasText: 'DPS' })
    await expect(dpsTagLink).toBeVisible()
    await expect(dpsTagLink).toHaveAttribute('href', '/recruit?tags=DPS')

    await dpsTagLink.click()
    await page.waitForLoadState('domcontentloaded')

    await expect(page).toHaveURL(/\/recruit\?tags=DPS/)
    await expect(page.locator('.recruit-page__counter-value')).toContainText('1 / 5')
    const activeDpsBtn = page.locator('.recruit-page__tag-btn--active', { hasText: 'DPS' })
    await expect(activeDpsBtn).toBeVisible()
  })

  test('mobile art viewer opens full-screen, scales artwork within bounds, and closes on canvas click', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/operators/char_172_svrash')
    await page.waitForLoadState('domcontentloaded')

    const artBtn = page.locator('.ak-operator-hero__art-container')
    await expect(artBtn).toBeVisible()
    await artBtn.click()

    const viewer = page.locator('.ak-art-viewer')
    await expect(viewer).toBeVisible()

    const artImg = page.locator('.ak-art-viewer__art-img')
    await expect(artImg).toBeVisible()

    const imgBox = await artImg.boundingBox()
    expect(imgBox).not.toBeNull()
    expect(imgBox!.width).toBeLessThanOrEqual(375)
    expect(imgBox!.height).toBeLessThanOrEqual(812)

    // Body scroll must be locked
    const overflow = await page.evaluate(() => document.body.style.overflow)
    expect(overflow).toBe('hidden')

    // Tapping on canvas outside the artwork closes the viewer
    await page.mouse.click(20, 80)
    await expect(viewer).not.toBeVisible()

    // Body scroll restored
    const restoredOverflow = await page.evaluate(() => document.body.style.overflow)
    expect(restoredOverflow).toBe('')
  })

  test('groups operator talents by title with progression stage list without duplicate talent cards', async ({
    page,
  }) => {
    // Open Angelina the Dream Deliverer (char_1015_aglna2) with 2 talents
    await page.goto('/operators/char_1015_aglna2?tab=talents')
    await expect(page.locator('.ak-operator-talents-panel')).toBeVisible()

    // Exactly 2 talent cards (one per talent slot), not 4 duplicated cards
    const talentCards = page.locator('.ak-operator-talents-panel__talent-card')
    await expect(talentCards).toHaveCount(2)

    // The first talent card has the title "Floating Above the Earth" once
    const firstCard = talentCards.first()
    await expect(firstCard.locator('.ak-operator-talents-panel__name')).toContainText(
      'Floating Above the Earth',
    )
    await expect(firstCard.locator('.ak-operator-talents-panel__name')).toHaveCount(1)

    // The first talent has progression stages listed underneath
    const stages = firstCard.locator('.ak-operator-talents-panel__stage-row')
    await expect(stages).toHaveCount(4)
  })
})
