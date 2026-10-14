import fs from 'node:fs'
import type { Response } from '@playwright/test'
import { test, expect } from './fixtures'

test.describe('Performance Under Network & CPU Throttling', () => {
  test('measures mobile Slow 4G + 4x CPU slowdown performance metrics', async ({
    page,
    context,
  }) => {
    test.setTimeout(120000)
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

      const startNav = Date.now()
      await page.goto(url)
      await page.waitForLoadState('load')
      await page.waitForTimeout(2000)
      const navDurationMs = Date.now() - startNav

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
        navDurationMs,
        lcpMs: metrics.lcp,
        tbtMs: metrics.tbt,
        scriptKb: Math.round(scriptBytes / 1024),
      }
    }

    const catalogMetrics = await measurePage('/operators')
    const detailMetrics = await measurePage('/operators/char_172_svrash')
    const depotMetrics = await measurePage('/depot')

    const report = {
      timestamp: new Date().toISOString(),
      network: 'Slow 4G (1.6 Mbps, 150ms RTT)',
      cpuThrottling: '4x slowdown',
      pages: [catalogMetrics, detailMetrics, depotMetrics],
    }

    fs.writeFileSync('docs/metrics-operators.json', JSON.stringify(report, null, 2), 'utf-8')
    console.log('Mobile Slow 4G Metrics Report:', JSON.stringify(report, null, 2))

    // Assert that pages loaded successfully under emulation
    expect(catalogMetrics.scriptKb).toBeGreaterThan(0)
    expect(detailMetrics.scriptKb).toBeGreaterThan(0)
    expect(depotMetrics.scriptKb).toBeGreaterThan(0)
  })
})
