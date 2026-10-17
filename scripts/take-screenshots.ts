import { existsSync, mkdirSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawn, type ChildProcess } from 'node:child_process'
import { chromium, type Page } from '@playwright/test'

const BASE_URL = process.env.SCREENSHOT_BASE_URL || 'http://localhost:3001'
const OUTPUT_DIR = resolve(process.cwd(), 'screenshots')

async function isServerListening(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(2500) })
    return res.ok || res.status < 500
  } catch {
    return false
  }
}

async function ensureAgentServer(): Promise<ChildProcess | null> {
  if (await isServerListening(BASE_URL)) {
    console.log(`[screenshots] Reusing existing agent server at ${BASE_URL}`)
    return null
  }

  console.log(`[screenshots] Starting agent server at ${BASE_URL}...`)
  const child = spawn(process.execPath, ['scripts/dev-agent.mjs'], {
    cwd: process.cwd(),
    stdio: 'ignore',
    env: {
      ...process.env,
      NUXT_BUILD_DIR: '.nuxt-agent',
    },
  })

  for (let i = 0; i < 90; i++) {
    if (await isServerListening(BASE_URL)) {
      console.log(`[screenshots] Agent server ready at ${BASE_URL}`)
      return child
    }
    await new Promise((r) => setTimeout(r, 1000))
  }

  child.kill()
  throw new Error(`Timed out waiting for agent server at ${BASE_URL}`)
}

async function waitForPageReady(page: Page): Promise<void> {
  await page.waitForLoadState('domcontentloaded')
  try {
    await page.waitForLoadState('networkidle', { timeout: 8000 })
  } catch {
    // Allow continuing if long-polling or dev HMR keeps connection open
  }
  await page.evaluate(async () => {
    if (document.fonts?.ready) {
      await document.fonts.ready
    }
    const imgs = Array.from(document.querySelectorAll('img'))
    await Promise.all(
      imgs.map((img) => {
        if (img.complete) return Promise.resolve()
        return new Promise<void>((res) => {
          const timer = setTimeout(res, 3000)
          img.addEventListener(
            'load',
            () => {
              clearTimeout(timer)
              res()
            },
            { once: true },
          )
          img.addEventListener(
            'error',
            () => {
              clearTimeout(timer)
              res()
            },
            { once: true },
          )
        })
      }),
    )
  })
  await page.waitForTimeout(350)
}

async function saveShot(page: Page, filename: string, fullPage = false): Promise<void> {
  await waitForPageReady(page)
  const filePath = resolve(OUTPUT_DIR, filename)
  await page.screenshot({ path: filePath, fullPage })
  console.log(`[screenshots] Saved ${filename}`)
}

const DEMO_PLANNER_STORAGE = {
  schemaVersion: 1,
  updatedAt: '2026-10-17T12:00:00.000Z',
  plans: [
    {
      id: 'plan_kaltsit_demo',
      operatorId: 'char_003_kalts',
      current: {
        elite: 0,
        level: 1,
        skillLevel: 1,
        skills: { skchr_kalts_1: 0, skchr_kalts_2: 0, skchr_kalts_3: 0 },
        modules: { uniequip_002_kalts: 0, uniequip_003_kalts: 0, uniequip_004_kalts: 0 },
      },
      target: {
        elite: 2,
        level: 90,
        skillLevel: 7,
        skills: { skchr_kalts_1: 3, skchr_kalts_2: 3, skchr_kalts_3: 3 },
        modules: { uniequip_002_kalts: 3, uniequip_003_kalts: 0, uniequip_004_kalts: 0 },
      },
      priority: 1,
      note: 'Main Medic + Mon3tr true damage carry',
      createdAt: '2026-10-17T12:00:00.000Z',
      updatedAt: '2026-10-17T12:00:00.000Z',
    },
    {
      id: 'plan_svrash_demo',
      operatorId: 'char_172_svrash',
      current: {
        elite: 1,
        level: 80,
        skillLevel: 7,
        skills: { skchr_svrash_1: 0, skchr_svrash_2: 0, skchr_svrash_3: 0 },
        modules: { uniequip_002_svrash: 0, uniequip_003_svrash: 0 },
      },
      target: {
        elite: 2,
        level: 90,
        skillLevel: 7,
        skills: { skchr_svrash_1: 0, skchr_svrash_2: 0, skchr_svrash_3: 3 },
        modules: { uniequip_002_svrash: 3, uniequip_003_svrash: 0 },
      },
      priority: 2,
      note: 'Truesilver Slash M3',
      createdAt: '2026-10-17T12:00:00.000Z',
      updatedAt: '2026-10-17T12:00:00.000Z',
    },
  ],
}

const DEMO_DEPOT_STORAGE = {
  schemaVersion: 1,
  updatedAt: '2026-10-17T12:00:00.000Z',
  currencies: {
    lmd: 450000,
    orundum: 73200,
    originitePrime: 45,
  },
  items: {
    '30135': 2,
    '30125': 3,
    '30115': 2,
    '30145': 1,
    '30014': 4,
    '30064': 3,
    '30074': 5,
    '30013': 18,
    '30043': 14,
    '30053': 12,
    '30012': 45,
    '3303': 28,
    '3302': 36,
    '2004': 80,
    '2003': 45,
    mod_unlock_token: 8,
  },
}

async function seedStorage(
  page: Page,
  plannerData: unknown,
  depotData: unknown,
  server: 'cn' | 'global' = 'global',
): Promise<void> {
  await page.evaluate(
    async ({ p, d, srv }) => {
      localStorage.setItem('arkcalc_drop_data_server', srv)
      localStorage.setItem('arkcalc_farming_allow_crafting', 'true')
      await new Promise<void>((resolve, reject) => {
        const req = window.indexedDB.open('arkcalc', 1)
        req.onupgradeneeded = () => {
          const db = req.result
          if (!db.objectStoreNames.contains('depot')) {
            db.createObjectStore('depot')
          }
        }
        req.onsuccess = () => {
          const db = req.result
          const tx = db.transaction('depot', 'readwrite')
          const store = tx.objectStore('depot')
          store.put(p, 'arkcalc_planner')
          store.put(d, 'arkcalc_depot')
          tx.oncomplete = () => {
            db.close()
            resolve()
          }
          tx.onerror = () => {
            db.close()
            reject(tx.error ?? new Error('Failed to write IndexedDB'))
          }
        }
        req.onerror = () => reject(req.error ?? new Error('Failed to open IndexedDB'))
      })
    },
    { p: plannerData, d: depotData, srv: server },
  )
}

async function main(): Promise<void> {
  if (existsSync(OUTPUT_DIR)) {
    rmSync(OUTPUT_DIR, { recursive: true, force: true })
  }
  mkdirSync(OUTPUT_DIR, { recursive: true })

  const spawnedServer = await ensureAgentServer()
  const browser = await chromium.launch()

  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    })
    const page = await context.newPage()

    // Seed planner and depot with Kal'tsit demo data
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' })
    await seedStorage(page, DEMO_PLANNER_STORAGE, DEMO_DEPOT_STORAGE, 'global')

    // 01. Kal'tsit header (1440x900) - shows Single-target Medic without MEDIC/MEDIC duplication
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(`${BASE_URL}/operators/char_003_kalts`, { waitUntil: 'domcontentloaded' })
    await waitForPageReady(page)
    await saveShot(page, '01-operator-kaltsit-header-1440.png')

    // 02. Depot mobile (360x800) - shows 450000 LMD input without truncation
    await page.setViewportSize({ width: 360, height: 800 })
    await page.goto(`${BASE_URL}/depot`, { waitUntil: 'domcontentloaded' })
    await waitForPageReady(page)
    await saveShot(page, '02-depot-mobile-360.png')

    // 03. Farming mobile (360x800) - shows compact Direct drops only segmented control without overflow
    await page.goto(`${BASE_URL}/farming`, { waitUntil: 'domcontentloaded' })
    await waitForPageReady(page)
    await saveShot(page, '03-farming-mobile-360.png')

    // 04. Gacha mobile calculator (360x800) - shows compact stepper row
    await page.goto(`${BASE_URL}/gacha`, { waitUntil: 'domcontentloaded' })
    await waitForPageReady(page)
    await saveShot(page, '04-gacha-mobile-360.png')

    // 05. Gacha desktop filters (1440x900) - shows readable active filter button
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(`${BASE_URL}/gacha`, { waitUntil: 'domcontentloaded' })
    await waitForPageReady(page)
    const bannersSection = page
      .locator('.gacha-page__banners-section, .gacha-page__filters')
      .first()
    if (await bannersSection.isVisible()) {
      await bannersSection.scrollIntoViewIfNeeded()
      await page.waitForTimeout(200)
    }
    await saveShot(page, '05-gacha-filters-1440.png')

    // 06. Sync Account modal on mobile (360x800) - compact email and verification code
    await page.setViewportSize({ width: 360, height: 800 })
    await page.goto(`${BASE_URL}/settings`, { waitUntil: 'domcontentloaded' })
    await waitForPageReady(page)
    const syncBtn = page
      .getByRole('button', { name: /Sync account/i })
      .or(page.locator('.settings-page__sync-btn'))
      .first()
    if (await syncBtn.isVisible()) {
      await syncBtn.click()
      await page.waitForSelector('.ak-modal', { state: 'visible' })
      await page.waitForTimeout(300)
    }
    await saveShot(page, '06-sync-modal-mobile-360.png')

    // 07. Recruit desktop (1440x900) - select Top Operator and DPS tags
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(`${BASE_URL}/recruit`, { waitUntil: 'domcontentloaded' })
    await waitForPageReady(page)
    const topOpBtn = page.locator('.recruit-page__tag-btn', { hasText: 'Top Operator' })
    if (await topOpBtn.isVisible()) {
      await topOpBtn.click()
    }
    const dpsBtn = page.locator('.recruit-page__tag-btn', { hasText: 'DPS' })
    if (await dpsBtn.isVisible()) {
      await dpsBtn.click()
    }
    await page.waitForTimeout(300)
    await saveShot(page, '07-recruit-desktop-1440.png')

    // 08. Recruit mobile (360x800) - responsive layout without horizontal scroll
    await page.setViewportSize({ width: 360, height: 800 })
    await page.goto(`${BASE_URL}/recruit`, { waitUntil: 'domcontentloaded' })
    await waitForPageReady(page)
    const topOpBtnMobile = page.locator('.recruit-page__tag-btn', { hasText: 'Top Operator' })
    if (await topOpBtnMobile.isVisible()) {
      await topOpBtnMobile.click()
    }
    const dpsBtnMobile = page.locator('.recruit-page__tag-btn', { hasText: 'DPS' })
    if (await dpsBtnMobile.isVisible()) {
      await dpsBtnMobile.click()
    }
    await page.waitForTimeout(300)
    await saveShot(page, '08-recruit-mobile-360.png')

    await context.close()
  } finally {
    await browser.close()
    if (spawnedServer) {
      spawnedServer.kill()
    }
  }
}

main().catch((err) => {
  console.error('[screenshots] Fatal error:', err)
  process.exit(1)
})
