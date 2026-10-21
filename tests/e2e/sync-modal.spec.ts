import { test, expect } from './fixtures'

/**
 * Yostar tab of the account sync modal.
 *
 * Every `/api/yostar/*` call is intercepted: no request reaches the real Yostar
 * SDK, no verification code is ever requested and no credentials are used.
 */

const loginPayload = {
  ok: true,
  doctor: { name: 'Doctor', level: 108, server: 'en' },
  operators: [
    {
      charId: 'char_003_kalts',
      elite: 2,
      level: 90,
      skillLevel: 7,
      potential: 4,
      favor: 150,
      skills: { skchr_kalts_2: 3 },
      modules: { uniequip_002_kalts: 3 },
    },
  ],
  depot: {
    currencies: { lmd: 120000, orundum: 600, originitePrime: 3 },
    items: { '30115': 4, '30012': 7 },
  },
  unknownOperatorIds: [],
  unknownItemCount: 0,
  skippedEntries: 0,
  syncedAt: '2026-10-21T10:00:00.000Z',
}

const session = {
  uid: 'channel-uid',
  token: 'yostar-account-token',
  expiresAt: '2026-11-20T10:00:00.000Z',
}

const SESSION_KEY = 'arkcalc_yostar_session'

/** Pre-loads a stored token, the way a previous successful sync would. */
async function seedStoredSession(page: import('@playwright/test').Page): Promise<void> {
  await page.addInitScript(([key, value]) => window.localStorage.setItem(key, value), [
    SESSION_KEY,
    JSON.stringify(session),
  ] as const)
}

async function openYostarTab(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/')
  const syncBtn = page.locator('.ak-header__sync-btn')
  await expect(syncBtn).toBeVisible()
  await syncBtn.click()

  const modal = page.locator('.sync-modal')
  await expect(modal).toBeVisible()

  const tabs = modal.locator('.sync-modal__tab')
  await tabs.nth(1).click()
  await expect(
    modal.locator('.sync-modal__regions, .sync-modal__disconnect-btn').first(),
  ).toBeVisible()
}

test.describe('Yostar sync modal', () => {
  test('walks send-code and login with the proxy mocked', async ({ page }) => {
    let sendCodeCalls = 0
    await page.route('**/api/yostar/send-code', async (route) => {
      sendCodeCalls += 1
      await new Promise((resolve) => setTimeout(resolve, 350))
      await route.fulfill({ status: 200, json: { ok: true } })
    })
    await page.route('**/api/yostar/login', async (route) => {
      await route.fulfill({ status: 200, json: { ...loginPayload, session } })
    })

    await openYostarTab(page)

    const modal = page.locator('.sync-modal')
    const startBtn = page.locator('.sync-modal__footer-actions button').last()
    await expect(startBtn).toBeDisabled()

    // Only the Global realm is selectable.
    await expect(modal.locator('.sync-modal__reg-btn').nth(0)).toBeEnabled()
    await expect(modal.locator('.sync-modal__reg-btn').nth(1)).toBeDisabled()

    await modal.locator('input[name="yostar-email"]').fill('test@example.com')
    await modal.locator('.sync-modal__send-btn').click()
    await expect(modal.locator('.sync-modal__send-btn')).toContainText('SENDING')
    await expect(modal.locator('.sync-modal__send-btn')).toContainText('CODE SENT')
    expect(sendCodeCalls).toBe(1)

    await modal.locator('input[name="yostar-code"]').fill('123456')
    await expect(startBtn).toBeEnabled()
    await startBtn.click()

    const success = modal.locator('.sync-modal__auth-success')
    await expect(success).toBeVisible()
    await expect(success).toContainText('SYNC COMPLETE')
    await expect(success).toContainText('1 operators')
    await expect(success).toContainText('2 depot items')

    // Imported depot is visible on the depot page.
    await page.locator('.sync-modal__footer-actions button').last().click()
    await page.goto('/depot')
    await expect(page.locator('.ak-depot__currencies')).toBeVisible()
    await expect(page.locator('.ak-depot__currency-item input[aria-label="LMD"]')).toHaveValue(
      '120000',
    )
    await expect(page.locator('.ak-depot__currency-item input[aria-label="Orundum"]')).toHaveValue(
      '600',
    )

    // The token is kept on the device, not in Supabase: reopening the modal
    // offers a re-sync instead of the e-mail form.
    await page.goto('/')
    await page.locator('.ak-header__sync-btn').click()
    await page.locator('.sync-modal__tab').nth(1).click()
    const panel = page.locator('.sync-modal__auth-success')
    await expect(panel).toContainText('SAVED SESSION')
    await expect(page.locator('.sync-modal__footer-actions button').last()).toContainText(
      'SYNC NOW',
    )
    expect(await page.evaluate((key) => window.localStorage.getItem(key), SESSION_KEY)).toContain(
      'yostar-account-token',
    )
  })

  test('re-syncs from the stored token and forgets it on 401', async ({ page }) => {
    await seedStoredSession(page)

    let syncCalls = 0
    await page.route('**/api/yostar/sync', async (route) => {
      syncCalls += 1
      if (syncCalls === 1) {
        await route.fulfill({ status: 200, json: loginPayload })
        return
      }
      await route.fulfill({ status: 401, json: { ok: false, error: 'invalid_session' } })
    })

    await page.goto('/')
    await page.locator('.ak-header__sync-btn').click()
    await page.locator('.sync-modal__tab').nth(1).click()

    const modal = page.locator('.sync-modal')
    await expect(modal.locator('.sync-modal__auth-success')).toContainText('SAVED SESSION')
    await expect(modal.locator('input[name="yostar-email"]')).toHaveCount(0)

    // First run: the stored token works.
    await page.locator('.sync-modal__footer-actions button').last().click()
    const success = modal.locator('.sync-modal__auth-success')
    await expect(success).toContainText('SYNC COMPLETE')
    expect(syncCalls).toBe(1)

    // Close, reopen, and let the server reject the token: it must be dropped
    // and the code form must come back.
    await page.locator('.sync-modal__footer-actions button').last().click()
    await page.locator('.ak-header__sync-btn').click()
    await page.locator('.sync-modal__tab').nth(1).click()
    await page.locator('.sync-modal__footer-actions button').last().click()

    await expect(modal.locator('.sync-modal__auth-error')).toContainText('session expired')
    await expect(modal.locator('input[name="yostar-email"]')).toBeVisible()
    expect(await page.evaluate((key) => window.localStorage.getItem(key), SESSION_KEY)).toBeNull()
  })

  test('shows a readable error for a rejected code', async ({ page }) => {
    await page.route('**/api/yostar/login', async (route) => {
      await route.fulfill({ status: 400, json: { ok: false, error: 'invalid_code' } })
    })

    await openYostarTab(page)

    const modal = page.locator('.sync-modal')
    await modal.locator('input[name="yostar-email"]').fill('test@example.com')
    await modal.locator('input[name="yostar-code"]').fill('000000')
    await page.locator('.sync-modal__footer-actions button').last().click()

    const alert = modal.locator('.sync-modal__auth-error')
    await expect(alert).toBeVisible()
    await expect(alert).toContainText('verification code is wrong or has expired')
    await expect(modal.locator('.sync-modal__auth-success')).toHaveCount(0)
  })
})

test.describe('Yostar sync modal at 360px', () => {
  test.use({ viewport: { width: 360, height: 800 } })

  test('fits the viewport without horizontal scrolling', async ({ page }) => {
    await openYostarTab(page)

    const modal = page.locator('.sync-modal')
    await expect(modal.locator('input[name="yostar-email"]')).toBeVisible()
    await expect(modal.locator('input[name="yostar-code"]')).toBeVisible()
    await expect(modal.locator('.sync-modal__send-btn')).toBeVisible()

    const overflow = await modal.evaluate((element) => element.scrollWidth - element.clientWidth)
    expect(overflow).toBeLessThanOrEqual(1)

    const pageOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(pageOverflow).toBeLessThanOrEqual(1)
  })
})

test.describe('Yostar sync modal at 1280px', () => {
  test.use({ viewport: { width: 1280, height: 900 } })

  test('keeps the form and footer usable when disabled is off', async ({ page }) => {
    await openYostarTab(page)

    const modal = page.locator('.sync-modal')
    await expect(modal.locator('input[name="yostar-email"]')).toBeVisible()
    await expect(page.locator('.sync-modal__footer-actions')).toBeVisible()

    const overflow = await modal.evaluate((element) => element.scrollWidth - element.clientWidth)
    expect(overflow).toBeLessThanOrEqual(1)
  })
})
