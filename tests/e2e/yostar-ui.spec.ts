import { test, expect } from './fixtures'

const SESSION_KEY = 'arkcalc_yostar_session'

const mockLoginResponse = {
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
  syncedAt: '2026-10-24T12:00:00.000Z',
  session: {
    uid: 'test-user-uid',
    token: 'test-session-token-abc',
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
}

async function openYostarModal(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/')
  const syncBtn = page.locator('.ak-header__sync-btn')
  await expect(syncBtn).toBeVisible()
  await syncBtn.click()

  const modal = page.locator('.sync-modal')
  await expect(modal).toBeVisible()

  // Switch to Yostar tab
  const tabs = modal.locator('.sync-modal__tab')
  await tabs.nth(1).click()
}

test.describe('Yostar UI Session Persistence and Management', () => {
  test('saves session token to localStorage upon successful login', async ({ page }) => {
    await page.route('**/api/yostar/send-code', async (route) => {
      await route.fulfill({ status: 200, json: { ok: true } })
    })
    await page.route('**/api/yostar/login', async (route) => {
      await route.fulfill({ status: 200, json: mockLoginResponse })
    })

    await openYostarModal(page)

    const modal = page.locator('.sync-modal')
    await modal.locator('input[name="yostar-email"]').fill('doctor@rhodes.island')
    await modal.locator('.sync-modal__send-btn').click()
    await expect(modal.locator('.sync-modal__send-btn')).toContainText('CODE SENT')

    await modal.locator('input[name="yostar-code"]').fill('654321')
    const startBtn = page.locator('.sync-modal__footer-actions button').last()
    await expect(startBtn).toBeEnabled()
    await startBtn.click()

    // Auth success should be visible
    const success = modal.locator('.sync-modal__auth-success')
    await expect(success).toBeVisible()
    await expect(success).toContainText('SYNC COMPLETE')

    // Verify localStorage item has been set
    const savedSessionRaw = await page.evaluate(
      (key) => window.localStorage.getItem(key),
      SESSION_KEY,
    )
    expect(savedSessionRaw).toBeTruthy()
    const saved = JSON.parse(savedSessionRaw!)
    expect(saved.uid).toBe('test-user-uid')
    expect(saved.token).toBe('test-session-token-abc')
  })

  test('restores saved session on reload displaying SAVED SESSION banner', async ({ page }) => {
    // Seed valid future session
    const validSession = {
      uid: 'saved-uid-123',
      token: 'saved-token-xyz',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    }
    await page.addInitScript(
      ([key, val]) => {
        window.localStorage.setItem(key, JSON.stringify(val))
      },
      [SESSION_KEY, validSession] as const,
    )

    await openYostarModal(page)

    const modal = page.locator('.sync-modal')
    // Should show SAVED SESSION panel instead of email input
    const banner = modal.locator('.sync-modal__auth-success')
    await expect(banner).toBeVisible()
    await expect(banner).toContainText('SAVED SESSION')
    await expect(modal.locator('input[name="yostar-email"]')).toHaveCount(0)

    // Disconnect button must be available
    await expect(modal.locator('.sync-modal__disconnect-btn')).toBeVisible()
  })

  test('disconnect button clears session from localStorage and reverts to login form', async ({
    page,
  }) => {
    const validSession = {
      uid: 'saved-uid-123',
      token: 'saved-token-xyz',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    }
    await page.addInitScript(
      ([key, val]) => {
        window.localStorage.setItem(key, JSON.stringify(val))
      },
      [SESSION_KEY, validSession] as const,
    )

    await openYostarModal(page)

    const modal = page.locator('.sync-modal')
    const disconnectBtn = modal.locator('.sync-modal__disconnect-btn')
    await expect(disconnectBtn).toBeVisible()

    // Click disconnect
    await disconnectBtn.click()

    // Local storage item must be deleted
    const sessionInStorage = await page.evaluate(
      (key) => window.localStorage.getItem(key),
      SESSION_KEY,
    )
    expect(sessionInStorage).toBeNull()

    // UI should revert to initial email input form
    await expect(modal.locator('input[name="yostar-email"]')).toBeVisible()
    await expect(modal.locator('.sync-modal__auth-success')).toHaveCount(0)
    await expect(disconnectBtn).toHaveCount(0)
  })

  test('cleans up expired session token automatically on startup', async ({ page }) => {
    // Seed expired session (expired 1 day ago)
    const expiredSession = {
      uid: 'expired-uid-999',
      token: 'expired-token-old',
      expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    }
    await page.addInitScript(
      ([key, val]) => {
        window.localStorage.setItem(key, JSON.stringify(val))
      },
      [SESSION_KEY, expiredSession] as const,
    )

    await openYostarModal(page)

    const modal = page.locator('.sync-modal')

    // Since token is expired, useYostarSync should have cleaned it up
    const sessionInStorage = await page.evaluate(
      (key) => window.localStorage.getItem(key),
      SESSION_KEY,
    )
    expect(sessionInStorage).toBeNull()

    // Email input form should be shown, not the saved session banner
    await expect(modal.locator('input[name="yostar-email"]')).toBeVisible()
    await expect(modal.locator('.sync-modal__auth-success')).toHaveCount(0)
  })
})
