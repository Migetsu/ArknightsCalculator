import { test } from './fixtures'
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

      if (vp.name === '1440' || vp.name === '360') {
        await page.goto('/depot')
        await page.waitForLoadState('domcontentloaded')
        await page.locator('.ak-depot__currencies').waitFor({ state: 'visible' })
        await page.screenshot({
          path: `docs/screenshots/depot-${vp.name}.png`,
          fullPage: false,
        })
      }
    })
  }
})
