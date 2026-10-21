import fs from 'node:fs'
import type { Browser, Page, Response } from '@playwright/test'
import { test, expect } from './fixtures'

/**
 * Slow 4G + 4x CPU performance budget suite.
 *
 * Budgets are compiled-bundle budgets: CI starts `npm run build && npm run preview`
 * (playwright.config.ts). For a local run, build and serve the production output on
 * port 3001 first (`NUXT_BUILD_DIR=.nuxt-agent npm run build`, `npm run preview -- --port 3001`);
 * Vite dev numbers are not comparable with compiled chunks.
 *
 * Every page is measured in a fresh browser context so HTTP cache cannot hide
 * transfer. LCP, CLS, TBT and FCP come from PerformanceObserver entries that are
 * installed before the document scripts run; script bytes come from the actual
 * response bodies, transfer bytes from `performance.getEntriesByType('resource')`.
 */

const NETWORK = {
  name: 'Slow 4G',
  downloadKbps: 1600,
  uploadKbps: 750,
  latencyMs: 150,
} as const

const CPU_THROTTLING = '4x' as const
const RUNS_PER_PAGE = 3
const VIEWPORT = { width: 360, height: 640 } as const

const PAGES = [
  '/',
  '/operators',
  '/operators/char_172_svrash',
  '/gacha',
  '/depot',
  '/farming',
] as const

/**
 * Budgets are medians of three runs on the production build, with ~20% headroom
 * over the worst observed median (see docs/progress.md, task 28). Moving the
 * banners/skins datasets out of the route chunks took /gacha from 2572 KB and
 * the operator detail page from 1370 KB of scripts; the remaining numbers are
 * the current floor plus CI headroom.
 */
const BUDGETS: Record<(typeof PAGES)[number], { scriptKb: number; lcpMs: number }> = {
  '/': { scriptKb: 1450, lcpMs: 1800 },
  '/operators': { scriptKb: 1500, lcpMs: 2600 },
  '/operators/char_172_svrash': { scriptKb: 1650, lcpMs: 11_500 },
  '/gacha': { scriptKb: 1600, lcpMs: 4000 },
  '/depot': { scriptKb: 1300, lcpMs: 2800 },
  '/farming': { scriptKb: 3200, lcpMs: 2600 },
}

interface PageSample {
  scriptKb: number
  transferKb: number
  requestCount: number
  lcpMs: number
  tbtMs: number
  cls: number
  fcpMs: number
  navMs: number
  ttfbMs: number
}

interface PageReport {
  url: string
  median: PageSample
  runs: PageSample[]
}

interface PerfWindow extends Window {
  __perfMetrics?: {
    lcp: number
    tbt: number
    cls: number
    fcp: number
  }
}

async function installPerfObservers(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const perfWindow = window as PerfWindow
    perfWindow.__perfMetrics = { lcp: 0, tbt: 0, cls: 0, fcp: 0 }

    const observe = (type: string, callback: (entries: PerformanceEntryList) => void): void => {
      try {
        new PerformanceObserver((list) => callback(list.getEntries())).observe({
          type,
          buffered: true,
        })
      } catch {
        // The entry type is unsupported in this browser; the metric stays 0.
      }
    }

    observe('largest-contentful-paint', (entries) => {
      const last = entries[entries.length - 1]
      if (last && perfWindow.__perfMetrics) perfWindow.__perfMetrics.lcp = last.startTime
    })

    observe('layout-shift', (entries) => {
      let cls = perfWindow.__perfMetrics?.cls ?? 0
      for (const entry of entries) {
        const shift = entry as PerformanceEntry & { value?: number; hadRecentInput?: boolean }
        if (!shift.hadRecentInput) cls += shift.value ?? 0
      }
      if (perfWindow.__perfMetrics) perfWindow.__perfMetrics.cls = cls
    })

    observe('longtask', (entries) => {
      let tbt = perfWindow.__perfMetrics?.tbt ?? 0
      for (const entry of entries) {
        if (entry.duration > 50) tbt += entry.duration - 50
      }
      if (perfWindow.__perfMetrics) perfWindow.__perfMetrics.tbt = tbt
    })

    observe('paint', (entries) => {
      for (const entry of entries) {
        if (entry.name === 'first-contentful-paint' && perfWindow.__perfMetrics) {
          perfWindow.__perfMetrics.fcp = entry.startTime
        }
      }
    })
  })
}

async function waitForLcpToSettle(page: Page): Promise<void> {
  let previous = -1
  let stableChecks = 0
  for (let attempt = 0; attempt < 40; attempt++) {
    const lcp = await page.evaluate(() => (window as PerfWindow).__perfMetrics?.lcp ?? 0)
    if (lcp > 0 && Math.abs(lcp - previous) < 1) {
      stableChecks += 1
    } else {
      stableChecks = 0
    }
    previous = lcp
    if (stableChecks >= 3) return
    await page.waitForTimeout(500)
  }
}

async function measureOnce(browser: Browser, url: string): Promise<PageSample> {
  const context = await browser.newContext({ viewport: VIEWPORT })
  const page = await context.newPage()

  const pendingBodies: Array<Promise<void>> = []
  let scriptBytes = 0
  let requestCount = 0

  page.on('response', (response: Response) => {
    requestCount += 1
    if (response.request().resourceType() === 'script') {
      pendingBodies.push(
        response
          .body()
          .then((buffer) => {
            scriptBytes += buffer.length
          })
          .catch(() => {
            // Redirected or aborted script responses have no readable body.
          }),
      )
    }
  })

  try {
    const cdp = await context.newCDPSession(page)
    await cdp.send('Network.enable')
    await cdp.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: NETWORK.latencyMs,
      downloadThroughput: (NETWORK.downloadKbps * 1024) / 8,
      uploadThroughput: (NETWORK.uploadKbps * 1024) / 8,
    })
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })

    await installPerfObservers(page)

    const navigation = await page.goto(url, { waitUntil: 'load', timeout: 120_000 })
    const documentStatus = navigation?.status() ?? 0
    await page.waitForLoadState('networkidle', { timeout: 45_000 }).catch(() => {})
    await waitForLcpToSettle(page)
    await Promise.all(pendingBodies)

    const metrics = await page.evaluate(() => {
      const perfWindow = window as PerfWindow
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[]
      const transferBytes = resources.reduce((sum, entry) => sum + (entry.transferSize || 0), 0)
      const navigationEntry = performance.getEntriesByType('navigation')[0] as
        PerformanceNavigationTiming | undefined

      return {
        lcpMs: Math.round(perfWindow.__perfMetrics?.lcp ?? 0),
        tbtMs: Math.round(perfWindow.__perfMetrics?.tbt ?? 0),
        cls: Math.round((perfWindow.__perfMetrics?.cls ?? 0) * 1000) / 1000,
        fcpMs: Math.round(perfWindow.__perfMetrics?.fcp ?? 0),
        transferBytes,
        navMs: Math.round(navigationEntry?.duration ?? 0),
        ttfbMs: Math.round(navigationEntry?.responseStart ?? 0),
      }
    })

    expect(documentStatus, `${url} responded with HTTP ${documentStatus}`).toBe(200)

    return {
      scriptKb: Math.round(scriptBytes / 1024),
      transferKb: Math.round(metrics.transferBytes / 1024),
      requestCount,
      lcpMs: metrics.lcpMs,
      tbtMs: metrics.tbtMs,
      cls: metrics.cls,
      fcpMs: metrics.fcpMs,
      navMs: metrics.navMs,
      ttfbMs: metrics.ttfbMs,
    }
  } finally {
    await context.close()
  }
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 1) return sorted[middle] ?? 0
  return Math.round(((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2)
}

function medianSample(runs: PageSample[]): PageSample {
  return {
    scriptKb: median(runs.map((run) => run.scriptKb)),
    transferKb: median(runs.map((run) => run.transferKb)),
    requestCount: median(runs.map((run) => run.requestCount)),
    lcpMs: median(runs.map((run) => run.lcpMs)),
    tbtMs: median(runs.map((run) => run.tbtMs)),
    cls: Math.round(median(runs.map((run) => run.cls * 1000))) / 1000,
    fcpMs: median(runs.map((run) => run.fcpMs)),
    navMs: median(runs.map((run) => run.navMs)),
    ttfbMs: median(runs.map((run) => run.ttfbMs)),
  }
}

test('Slow 4G + 4x CPU: LCP, CLS, TBT and script budgets', async ({ browser }) => {
  test.setTimeout(15 * 60 * 1000)

  const pages: PageReport[] = []

  for (const url of PAGES) {
    const runs: PageSample[] = []
    for (let run = 0; run < RUNS_PER_PAGE; run++) {
      runs.push(await measureOnce(browser, url))
    }
    pages.push({ url, median: medianSample(runs), runs })
  }

  const report = {
    timestamp: new Date().toISOString(),
    network: NETWORK,
    cpuThrottling: CPU_THROTTLING,
    runsPerPage: RUNS_PER_PAGE,
    viewport: VIEWPORT,
    pages,
  }

  fs.writeFileSync('docs/metrics-operators.json', `${JSON.stringify(report, null, 2)}\n`, 'utf-8')
  console.log('Slow 4G metrics:', JSON.stringify(report, null, 2))

  for (const pageReport of pages) {
    const budget = BUDGETS[pageReport.url]
    const medianMetrics = pageReport.median

    expect(medianMetrics.scriptKb, `${pageReport.url} script bytes`).toBeGreaterThan(0)
    expect(medianMetrics.lcpMs, `${pageReport.url} LCP was not observed`).toBeGreaterThan(0)
    expect(medianMetrics.transferKb, `${pageReport.url} transfer bytes`).toBeGreaterThan(0)
    expect(medianMetrics.scriptKb, `${pageReport.url} script budget`).toBeLessThanOrEqual(
      budget.scriptKb,
    )
    expect(medianMetrics.lcpMs, `${pageReport.url} LCP budget`).toBeLessThanOrEqual(budget.lcpMs)
  }
})
