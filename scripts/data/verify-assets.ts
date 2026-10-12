import fs from 'node:fs/promises'
import path from 'node:path'
import type { OperatorSummary } from '../../shared/schemas/operator'
import { resolveAsset } from '../../shared/utils/resolveAsset'

interface VerificationCheckResult {
  url: string
  status: number
  ok: boolean
  contentType: string | null
  bytes: number
  durationMs: number
  error?: string
}

interface OperatorVerificationResult {
  id: string
  name: string
  rarity: number
  primary: VerificationCheckResult
  secondary: VerificationCheckResult
}

interface VerificationSummary {
  timestamp: string
  sampleSize: number
  primaryCdn: {
    name: string
    successCount: number
    successRate: number
    averageLatencyMs: number
  }
  secondaryCdn: {
    name: string
    successCount: number
    successRate: number
    averageLatencyMs: number
  }
  failedPrimary: Array<{ id: string; name: string; status: number; error?: string }>
  failedSecondary: Array<{ id: string; name: string; status: number; error?: string }>
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function verifyUrl(url: string, timeoutMs = 10000): Promise<VerificationCheckResult> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  const startTime = Date.now()

  try {
    const res = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'User-Agent': 'ArknightsCalculator-AssetVerifier/1.0',
        Accept: 'image/webp,image/png,image/*,*/*;q=0.8',
      },
    })

    const contentType = res.headers.get('content-type')
    const buffer = await res.arrayBuffer()
    const durationMs = Date.now() - startTime

    const isImage = contentType?.toLowerCase().includes('image/') ?? false
    const hasBytes = buffer.byteLength > 0
    const ok = res.status === 200 && isImage && hasBytes

    return {
      url,
      status: res.status,
      ok,
      contentType,
      bytes: buffer.byteLength,
      durationMs,
      error: !ok
        ? `Status ${res.status}, Type: ${contentType ?? 'none'}, Size: ${buffer.byteLength}B`
        : undefined,
    }
  } catch (err: unknown) {
    const durationMs = Date.now() - startTime
    const message = err instanceof Error ? err.message : String(err)
    return {
      url,
      status: 0,
      ok: false,
      contentType: null,
      bytes: 0,
      durationMs,
      error: message,
    }
  } finally {
    clearTimeout(timer)
  }
}

async function main(): Promise<void> {
  console.log('=== Arknights Live Asset Verification (GET Check) ===\n')

  const indexPath = path.resolve(process.cwd(), 'data/operators-index.json')
  const rawIndex = await fs.readFile(indexPath, 'utf-8')
  const allOperators = JSON.parse(rawIndex) as OperatorSummary[]

  // Mandatory target operators
  const MUST_HAVE_IDS = new Set([
    'char_002_amiya', // Amiya (Caster)
    'char_1001_amiya2', // Amiya (Guard)
    'char_1037_amiya3', // Amiya (Medic)
    'char_394_hadiya', // Hadiya (CN)
    'char_366_acdrop', // Acdrop (CN)
  ])

  // Select balanced sample of 60 operators covering 1★-6★ rarities
  const sample: OperatorSummary[] = []
  const addedIds = new Set<string>()

  // 1. Add must-have operators first
  for (const id of MUST_HAVE_IDS) {
    const op = allOperators.find((o) => o.id === id)
    if (op) {
      sample.push(op)
      addedIds.add(op.id)
    }
  }

  // 2. Add all 1★ robots
  for (const op of allOperators) {
    if (op.rarity === 1 && !addedIds.has(op.id)) {
      sample.push(op)
      addedIds.add(op.id)
    }
  }

  // 3. Add all 2★ starters
  for (const op of allOperators) {
    if (op.rarity === 2 && !addedIds.has(op.id)) {
      sample.push(op)
      addedIds.add(op.id)
    }
  }

  // 4. Quotas for 3★, 4★, 5★, 6★ to reach exactly 60
  const desiredPerRarity: Record<number, number> = {
    3: 10,
    4: 11,
    5: 11,
    6: 12,
  }

  const currentCountPerRarity: Record<number, number> = { 3: 0, 4: 0, 5: 0, 6: 0 }
  for (const op of sample) {
    if (currentCountPerRarity[op.rarity] !== undefined) {
      currentCountPerRarity[op.rarity]++
    }
  }

  for (const op of allOperators) {
    if (sample.length >= 60) break
    const rarity = op.rarity
    const desired = desiredPerRarity[rarity] ?? 0
    const current = currentCountPerRarity[rarity] ?? 0

    if (desired > 0 && current < desired && !addedIds.has(op.id)) {
      sample.push(op)
      addedIds.add(op.id)
      currentCountPerRarity[rarity] = (currentCountPerRarity[rarity] ?? 0) + 1
    }
  }

  console.log(`Prepared verification sample of ${sample.length} operators:`)
  const rarityBreakdown = sample.reduce<Record<number, number>>((acc, op) => {
    acc[op.rarity] = (acc[op.rarity] ?? 0) + 1
    return acc
  }, {})
  console.log(
    `Rarity distribution: 1★:${rarityBreakdown[1] ?? 0}, 2★:${rarityBreakdown[2] ?? 0}, 3★:${rarityBreakdown[3] ?? 0}, 4★:${rarityBreakdown[4] ?? 0}, 5★:${rarityBreakdown[5] ?? 0}, 6★:${rarityBreakdown[6] ?? 0}\n`,
  )

  const results: OperatorVerificationResult[] = []

  // Check in batches of 4 with a 100ms pause to respect CDN concurrency limits
  const BATCH_SIZE = 4
  const BATCH_DELAY_MS = 100

  for (let i = 0; i < sample.length; i += BATCH_SIZE) {
    const batch = sample.slice(i, i + BATCH_SIZE)
    const batchResults = await Promise.all(
      batch.map(async (op) => {
        const candidates = resolveAsset('avatar', op.id)
        const primaryUrl = candidates[0] ?? ''
        const secondaryUrl = candidates[1] ?? ''

        const [primaryCheck, secondaryCheck] = await Promise.all([
          verifyUrl(primaryUrl),
          verifyUrl(secondaryUrl),
        ])

        return {
          id: op.id,
          name: op.name.en,
          rarity: op.rarity,
          primary: primaryCheck,
          secondary: secondaryCheck,
        }
      }),
    )

    results.push(...batchResults)
    process.stdout.write(`Verified ${results.length}/${sample.length} operators...\r`)

    if (i + BATCH_SIZE < sample.length) {
      await sleep(BATCH_DELAY_MS)
    }
  }

  console.log('\n\n=== VERIFICATION RESULTS ===\n')

  const primarySuccesses = results.filter((r) => r.primary.ok)
  const secondarySuccesses = results.filter((r) => r.secondary.ok)

  const primaryAvgLatency = Math.round(
    results.reduce((sum, r) => sum + r.primary.durationMs, 0) / results.length,
  )
  const secondaryAvgLatency = Math.round(
    results.reduce((sum, r) => sum + r.secondary.durationMs, 0) / results.length,
  )

  const primaryRate = (primarySuccesses.length / results.length) * 100
  const secondaryRate = (secondarySuccesses.length / results.length) * 100

  console.log(
    `Primary CDN (jsDelivr):  ${primarySuccesses.length}/${results.length} (${primaryRate.toFixed(1)}%) | Avg Latency: ${primaryAvgLatency}ms`,
  )
  console.log(
    `Secondary CDN (Statically): ${secondarySuccesses.length}/${results.length} (${secondaryRate.toFixed(1)}%) | Avg Latency: ${secondaryAvgLatency}ms`,
  )

  const failedPrimary = results
    .filter((r) => !r.primary.ok)
    .map((r) => ({ id: r.id, name: r.name, status: r.primary.status, error: r.primary.error }))

  const failedSecondary = results
    .filter((r) => !r.secondary.ok)
    .map((r) => ({
      id: r.id,
      name: r.name,
      status: r.secondary.status,
      error: r.secondary.error,
    }))

  if (failedPrimary.length > 0) {
    console.log('\n[!] Primary CDN Failures:')
    for (const f of failedPrimary) {
      console.log(` - ${f.id} (${f.name}): ${f.error ?? 'Unknown error'}`)
    }
  } else {
    console.log('\n[OK] Primary CDN delivered 100% of tested avatar images with HTTP 200!')
  }

  if (failedSecondary.length > 0) {
    console.log(`\nSecondary CDN had ${failedSecondary.length} non-200 responses.`)
  }

  const summary: VerificationSummary = {
    timestamp: new Date().toISOString(),
    sampleSize: results.length,
    primaryCdn: {
      name: 'jsDelivr',
      successCount: primarySuccesses.length,
      successRate: Number(primaryRate.toFixed(1)),
      averageLatencyMs: primaryAvgLatency,
    },
    secondaryCdn: {
      name: 'Statically',
      successCount: secondarySuccesses.length,
      successRate: Number(secondaryRate.toFixed(1)),
      averageLatencyMs: secondaryAvgLatency,
    },
    failedPrimary,
    failedSecondary,
  }

  const reportPath = path.resolve(process.cwd(), 'data/asset-verification-report.json')
  await fs.writeFile(reportPath, JSON.stringify(summary, null, 2), 'utf-8')
  console.log(`\nReport saved to: ${reportPath}`)
}

main().catch((err) => {
  console.error('Fatal error during asset verification:', err)
  process.exit(1)
})
