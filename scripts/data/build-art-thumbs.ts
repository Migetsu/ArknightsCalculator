import { promises as fs } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { resolveAsset } from '../../shared/utils/resolveAsset'
import type { OperatorSummary } from '../../shared/schemas/operator'

const BATCH_SIZE = 10
const MAX_RETRIES = 3

async function fetchWithRetry(url: string, retries = MAX_RETRIES): Promise<Buffer | null> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url)
      if (res.ok) {
        const arrayBuf = await res.arrayBuffer()
        return Buffer.from(arrayBuf)
      }
      if (res.status === 404) return null
    } catch (_err) {
      if (attempt === retries) return null
      await new Promise((resolve) => setTimeout(resolve, 500 * attempt))
    }
  }
  return null
}

async function processOperator(
  op: OperatorSummary,
  outputDir: string,
): Promise<{ id: string; status: 'created' | 'cached' | 'failed'; sizeKb?: number }> {
  const targetPath = path.join(outputDir, `${op.id}.webp`)

  try {
    const stat = await fs.stat(targetPath)
    if (stat.size > 0) {
      return { id: op.id, status: 'cached', sizeKb: +(stat.size / 1024).toFixed(1) }
    }
  } catch {
    // File does not exist, proceed to generate
  }

  // Obtain CDN candidates for full art (without thumbnail option)
  const candidates = resolveAsset('art', op.id)
  let rawBuffer: Buffer | null = null

  for (const candidate of candidates) {
    if (candidate.startsWith('http')) {
      rawBuffer = await fetchWithRetry(candidate)
      if (rawBuffer) break
    }
  }

  if (!rawBuffer) {
    return { id: op.id, status: 'failed' }
  }

  try {
    const webpBuffer = await sharp(rawBuffer)
      .resize({ width: 480, withoutEnlargement: true })
      .webp({ quality: 80, effort: 6 })
      .toBuffer()

    await fs.writeFile(targetPath, webpBuffer)
    return { id: op.id, status: 'created', sizeKb: +(webpBuffer.length / 1024).toFixed(1) }
  } catch (err) {
    console.warn(`[WARN] Failed to process ${op.id}:`, err)
    return { id: op.id, status: 'failed' }
  }
}

async function main(): Promise<void> {
  console.log('=== Arknights Character Art Thumbnail Generator (WebP 480px, q=80) ===\n')

  const indexPath = path.resolve(process.cwd(), 'data/operators-index.json')
  const outputDir = path.resolve(process.cwd(), 'public/art/thumbs')

  await fs.mkdir(outputDir, { recursive: true })

  const rawIndex = await fs.readFile(indexPath, 'utf-8')
  const operators = JSON.parse(rawIndex) as OperatorSummary[]

  console.log(`Loaded ${operators.length} operators. Generating thumbnails into ${outputDir}...\n`)

  let createdCount = 0
  let cachedCount = 0
  let failedCount = 0
  const sizes: number[] = []

  for (let i = 0; i < operators.length; i += BATCH_SIZE) {
    const batch = operators.slice(i, i + BATCH_SIZE)
    const results = await Promise.all(batch.map((op) => processOperator(op, outputDir)))

    for (const res of results) {
      if (res.status === 'created') {
        createdCount++
        if (res.sizeKb) sizes.push(res.sizeKb)
      } else if (res.status === 'cached') {
        cachedCount++
        if (res.sizeKb) sizes.push(res.sizeKb)
      } else {
        failedCount++
      }
    }

    const processed = Math.min(i + BATCH_SIZE, operators.length)
    process.stdout.write(`\rProgress: ${processed}/${operators.length} operators...`)
  }

  console.log('\n\n=== SUMMARY REPORT ===')
  console.log(`Total operators: ${operators.length}`)
  console.log(`Newly generated: ${createdCount}`)
  console.log(`Cached/existing: ${cachedCount}`)
  console.log(`Failed:          ${failedCount}`)

  if (sizes.length > 0) {
    const totalSizeKb = sizes.reduce((a, b) => a + b, 0)
    const avgSizeKb = (totalSizeKb / sizes.length).toFixed(1)
    const totalMb = (totalSizeKb / 1024).toFixed(2)
    console.log(`Average thumbnail size: ${avgSizeKb} KB (target: < 60-80 KB)`)
    console.log(`Total thumbnails size:  ${totalMb} MB`)
  }
}

main().catch((err) => {
  console.error('Fatal error generating character thumbnails:', err)
  process.exit(1)
})
