import { test } from './fixtures'
import type { Response } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

const VIEWPORTS = [
  { name: '360', width: 360, height: 640 },
  { name: '768', width: 768, height: 1024 },
  { name: '1440', width: 1440, height: 900 },
  { name: '1920', width: 1920, height: 1080 },
]

test.describe('Operators Design Visual Audit & Screenshots', () => {
  test.beforeAll(() => {
    const dir = path.resolve('docs/screenshots')
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
  })

  for (const vp of VIEWPORTS) {
    test(`captures /operators and /operators/char_172_svrash on ${vp.name}px (en & ru)`, async ({
      page,
    }) => {
      test.slow()
      await page.setViewportSize({ width: vp.width, height: vp.height })

      // 1. /operators (en)
      await page.goto('/operators')
      await page.waitForLoadState('networkidle')
      await page.screenshot({
        path: `docs/screenshots/operators-${vp.name}-en.png`,
        fullPage: false,
      })

      // 2. /operators (ru)
      await page.goto('/ru/operators')
      await page.waitForLoadState('networkidle')
      await page.screenshot({
        path: `docs/screenshots/operators-${vp.name}-ru.png`,
        fullPage: false,
      })

      // 3. /operators/char_172_svrash (en)
      await page.goto('/operators/char_172_svrash')
      await page.waitForLoadState('networkidle')
      await page.screenshot({
        path: `docs/screenshots/operator-detail-${vp.name}-en.png`,
        fullPage: false,
      })

      // 4. /operators/char_172_svrash (ru)
      await page.goto('/ru/operators/char_172_svrash')
      await page.waitForLoadState('networkidle')
      await page.screenshot({
        path: `docs/screenshots/operator-detail-${vp.name}-ru.png`,
        fullPage: false,
      })
    })
  }

  test('measures mobile Slow 4G performance metrics for /operators and detail page', async ({
    page,
    context,
  }) => {
    test.setTimeout(90000)
    await page.setViewportSize({ width: 360, height: 640 })

    const cdp = await context.newCDPSession(page)
    // Emulate Slow 4G (latency 150ms, download 1.6Mbps, upload 750Kbps)
    await cdp.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: 150,
      downloadThroughput: (1.6 * 1024 * 1024) / 8,
      uploadThroughput: (750 * 1024) / 8,
    })
    // Emulate 4x CPU slowdown
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })

    const measurePage = async (url: string) => {
      let scriptBytes = 0
      const onResponse = async (res: Response) => {
        if (res.request().resourceType() === 'script') {
          try {
            const buffer = await res.body()
            scriptBytes += buffer.length
          } catch {
            // ignore
          }
        }
      }
      page.on('response', onResponse)

      await page.goto(url)
      await page.waitForLoadState('load')
      await page.waitForTimeout(2000)

      const metrics = await page.evaluate(async () => {
        let lcp = 0
        let tbt = 0

        const perf = window.performance
        const entries = perf.getEntriesByType('largest-contentful-paint')
        if (entries.length > 0) {
          const lastEntry = entries[entries.length - 1] as PerformanceEntry | undefined
          lcp = lastEntry?.startTime ?? 0
        }

        const longTasks = perf.getEntriesByType('longtask')
        for (const task of longTasks) {
          const duration = task.duration
          if (duration > 50) {
            tbt += duration - 50
          }
        }

        return {
          lcp: Math.round(lcp),
          tbt: Math.round(tbt),
        }
      })

      page.off('response', onResponse)

      return {
        url,
        lcpMs: metrics.lcp,
        tbtMs: metrics.tbt,
        scriptKb: Math.round(scriptBytes / 1024),
      }
    }

    const catalogMetrics = await measurePage('/operators')
    const detailMetrics = await measurePage('/operators/char_172_svrash')

    const report = {
      timestamp: new Date().toISOString(),
      network: 'Slow 4G (1.6 Mbps, 150ms RTT)',
      cpuThrottling: '4x slowdown',
      pages: [catalogMetrics, detailMetrics],
    }

    fs.writeFileSync('docs/metrics-operators.json', JSON.stringify(report, null, 2), 'utf-8')
    console.log('Mobile Slow 4G Metrics Report:', JSON.stringify(report, null, 2))
  })
})
