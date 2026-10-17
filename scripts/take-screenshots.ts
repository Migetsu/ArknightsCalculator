import { existsSync, mkdirSync } from 'node:fs'
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

async function clearStorage(page: Page): Promise<void> {
  await page.evaluate(async () => {
    localStorage.clear()
    await new Promise<void>((resolve) => {
      const req = window.indexedDB.open('arkcalc', 1)
      req.onupgradeneeded = () => {
        const db = req.result
        if (!db.objectStoreNames.contains('depot')) {
          db.createObjectStore('depot')
        }
      }
      req.onsuccess = () => {
        const db = req.result
        if (!db.objectStoreNames.contains('depot')) {
          db.close()
          resolve()
          return
        }
        const tx = db.transaction('depot', 'readwrite')
        tx.objectStore('depot').clear()
        tx.oncomplete = () => {
          db.close()
          resolve()
        }
        tx.onerror = () => {
          db.close()
          resolve()
        }
      }
      req.onerror = () => resolve()
    })
  })
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
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true })
  }

  const spawnedServer = await ensureAgentServer()
  const browser = await chromium.launch()

  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    })
    const page = await context.newPage()

    // 01. Dashboard empty (1440x900)
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' })
    await clearStorage(page)
    await page.reload({ waitUntil: 'domcontentloaded' })
    await saveShot(page, '01-dashboard-empty-1440.png')

    // 02. Dashboard demo (1440x900 & 360x800)
    await seedStorage(page, DEMO_PLANNER_STORAGE, DEMO_DEPOT_STORAGE, 'global')
    await page.reload({ waitUntil: 'domcontentloaded' })
    await waitForPageReady(page)
    const demoBtn = page.locator('.dashboard-page__btn-outline').first()
    if (await demoBtn.isVisible()) {
      await demoBtn.click()
    }
    await saveShot(page, '02-dashboard-demo-1440.png')

    await page.setViewportSize({ width: 360, height: 800 })
    await saveShot(page, '02-dashboard-demo-360.png')

    // 03. Operators catalog with Mon3tr visible (1440x900 & 360x800)
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(`${BASE_URL}/operators?q=Mon3tr`, { waitUntil: 'domcontentloaded' })
    await waitForPageReady(page)
    await page.evaluate(() => window.scrollTo(0, 220))
    await saveShot(page, '03-operators-1440.png')

    await page.setViewportSize({ width: 360, height: 800 })
    await page.evaluate(() => window.scrollTo(0, 320))
    await saveShot(page, '03-operators-360.png')

    // 04. Operator detail char_003_kalts (1440x900 & 360x800)
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(`${BASE_URL}/operators/char_003_kalts?tab=modules`, {
      waitUntil: 'domcontentloaded',
    })
    await waitForPageReady(page)
    await page.evaluate(() => window.scrollTo(0, 260))
    await saveShot(page, '04-operator-detail-1440.png')

    await page.setViewportSize({ width: 360, height: 800 })
    await page.evaluate(() => window.scrollTo(0, 420))
    await saveShot(page, '04-operator-detail-360.png')

    // 05. Planner Goals tab with AkModuleType X/Y/Delta badges visible (1440x900 & 360x800)
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(`${BASE_URL}/planner`, { waitUntil: 'domcontentloaded' })
    await waitForPageReady(page)
    const moduleBadge1440 = page.locator('.ak-module-type').first()
    if (await moduleBadge1440.isVisible()) {
      await moduleBadge1440.scrollIntoViewIfNeeded()
    }
    await saveShot(page, '05-planner-goals-1440.png')

    await page.setViewportSize({ width: 360, height: 800 })
    await waitForPageReady(page)
    const moduleSection = page.locator('.ak-module-type').first()
    if (await moduleSection.isVisible()) {
      await moduleSection.scrollIntoViewIfNeeded()
    }
    await saveShot(page, '05-planner-goals-360.png')

    // 06. Planner Materials tab in Crafting included mode (1440x900)
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(`${BASE_URL}/planner`, { waitUntil: 'domcontentloaded' })
    await waitForPageReady(page)
    const materialsTab = page.getByRole('tab', { name: /Materials/i }).first()
    await materialsTab.click()
    await saveShot(page, '06-planner-materials-1440.png')

    // 07. Planner Roadmap tab with visible module step (1440x900)
    const roadmapTab = page.getByRole('tab', { name: /Roadmap/i }).first()
    await roadmapTab.click()
    await waitForPageReady(page)
    const roadmapModuleBadge = page.locator('.ak-module-type').first()
    if (await roadmapModuleBadge.isVisible()) {
      await roadmapModuleBadge.scrollIntoViewIfNeeded()
    }
    await saveShot(page, '07-planner-roadmap-1440.png')

    // 08. Depot with populated items and filter (1440x900 & 360x800)
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(`${BASE_URL}/depot`, { waitUntil: 'domcontentloaded' })
    await waitForPageReady(page)
    const neededCheck = page.locator('input[type="checkbox"]').first()
    if (await neededCheck.isVisible()) {
      await neededCheck.check()
    }
    await saveShot(page, '08-depot-1440.png')

    await page.setViewportSize({ width: 360, height: 800 })
    await saveShot(page, '08-depot-360.png')

    // 09. Farming on CN and US servers showing CE-6, LS-6, and materials (1440x900 & 360x800)
    await page.setViewportSize({ width: 1440, height: 900 })
    await seedStorage(page, DEMO_PLANNER_STORAGE, DEMO_DEPOT_STORAGE, 'cn')
    await page.goto(`${BASE_URL}/farming`, { waitUntil: 'domcontentloaded' })
    await waitForPageReady(page)
    const cnBtn = page.locator('.ak-segmented__btn').filter({ hasText: /^CN$/i }).first()
    if (await cnBtn.isVisible()) {
      await cnBtn.click()
    }
    await saveShot(page, '09-farming-cn-1440.png')

    await page.setViewportSize({ width: 360, height: 800 })
    await saveShot(page, '09-farming-cn-360.png')

    await page.setViewportSize({ width: 1440, height: 900 })
    const usBtn = page
      .locator('.ak-segmented__btn')
      .filter({ hasText: /Global/i })
      .first()
    if (await usBtn.isVisible()) {
      await usBtn.click()
    }
    await saveShot(page, '09-farming-us-1440.png')

    // 10. Recruit (1440x900)
    await page.goto(`${BASE_URL}/recruit`, { waitUntil: 'domcontentloaded' })
    await saveShot(page, '10-recruit-1440.png')

    // 11. Gacha (1440x900)
    await page.goto(`${BASE_URL}/gacha`, { waitUntil: 'domcontentloaded' })
    await saveShot(page, '11-gacha-1440.png')

    // 12. Settings (1440x900)
    await page.goto(`${BASE_URL}/settings`, { waitUntil: 'domcontentloaded' })
    await saveShot(page, '12-settings-1440.png')

    // 13. Sync Account Modal (1440x900)
    const syncBtn = page
      .getByRole('button', { name: /Sync account/i })
      .or(page.locator('.settings-page__sync-btn'))
      .first()
    await syncBtn.click()
    await saveShot(page, '13-sync-modal-1440.png')

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
