import { promises as fs } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { resolveAsset, LOW_RARITY_OPERATOR_IDS } from '../../shared/utils/resolveAsset'
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

async function fileExists(filePath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(filePath)
    return stat.size > 0
  } catch {
    return false
  }
}

async function processOperator(
  op: OperatorSummary,
  thumbsDir: string,
  heroDir: string,
): Promise<{
  id: string
  thumbStatus: 'cached' | 'created' | 'failed'
  hero1Status: 'cached' | 'created' | 'failed'
  hero2Status?: 'cached' | 'created' | 'failed'
  thumbSizeKb?: number
  hero1SizeKb?: number
  hero2SizeKb?: number
}> {
  const hasE2 = op.rarity >= 4 && !LOW_RARITY_OPERATOR_IDS.has(op.id)
  const thumbPath = path.join(thumbsDir, `${op.id}.webp`)
  const hero1Path = path.join(heroDir, `${op.id}_1.webp`)
  const hero2Path = path.join(heroDir, `${op.id}_2.webp`)

  let thumbStatus: 'cached' | 'created' | 'failed' = 'failed'
  let hero1Status: 'cached' | 'created' | 'failed' = 'failed'
  let hero2Status: 'cached' | 'created' | 'failed' | undefined = hasE2 ? 'failed' : undefined

  let thumbSizeKb: number | undefined
  let hero1SizeKb: number | undefined
  let hero2SizeKb: number | undefined

  const needThumb = !(await fileExists(thumbPath))
  const needHero1 = !(await fileExists(hero1Path))
  const needHero2 = hasE2 && !(await fileExists(hero2Path))

  if (!needThumb) {
    thumbStatus = 'cached'
    const s = await fs.stat(thumbPath)
    thumbSizeKb = +(s.size / 1024).toFixed(1)
  }
  if (!needHero1) {
    hero1Status = 'cached'
    const s = await fs.stat(hero1Path)
    hero1SizeKb = +(s.size / 1024).toFixed(1)
  }
  if (hasE2 && !needHero2) {
    hero2Status = 'cached'
    const s = await fs.stat(hero2Path)
    hero2SizeKb = +(s.size / 1024).toFixed(1)
  }

  // 1. Process E2 (or base for low rarity) if needed for thumb, hero2, or hero1 (low rarity)
  if (needThumb || needHero2 || (!hasE2 && needHero1)) {
    const e2Candidates = resolveAsset('art', op.id, { variant: hasE2 ? '2' : '1' })
    let e2Raw: Buffer | null = null
    for (const cand of e2Candidates) {
      if (cand.startsWith('http')) {
        e2Raw = await fetchWithRetry(cand)
        if (e2Raw) break
      }
    }

    // Fallback to portrait if character skin artwork is missing (e.g. 1-star robots)
    if (!e2Raw) {
      const portraitCandidates = resolveAsset('portrait', op.id, { variant: '1' })
      for (const cand of portraitCandidates) {
        if (cand.startsWith('http')) {
          e2Raw = await fetchWithRetry(cand)
          if (e2Raw) break
        }
      }
    }

    if (e2Raw) {
      // Create thumbnail 480px
      if (needThumb) {
        try {
          const thumbWebp = await sharp(e2Raw)
            .resize({ width: 480, withoutEnlargement: true })
            .webp({ quality: 80, effort: 4 })
            .toBuffer()
          await fs.writeFile(thumbPath, thumbWebp)
          thumbStatus = 'created'
          thumbSizeKb = +(thumbWebp.length / 1024).toFixed(1)
        } catch (err) {
          console.warn(`[WARN] Failed to write thumb ${op.id}:`, err)
        }
      }

      // Create hero copy 1280px (for E2 if hasE2, or E1 if low rarity)
      if (hasE2 && needHero2) {
        try {
          const heroWebp = await sharp(e2Raw)
            .resize({ width: 1280, withoutEnlargement: true })
            .webp({ quality: 80, effort: 4 })
            .toBuffer()
          await fs.writeFile(hero2Path, heroWebp)
          hero2Status = 'created'
          hero2SizeKb = +(heroWebp.length / 1024).toFixed(1)
        } catch (err) {
          console.warn(`[WARN] Failed to write hero2 ${op.id}:`, err)
        }
      } else if (!hasE2 && needHero1) {
        try {
          const heroWebp = await sharp(e2Raw)
            .resize({ width: 1280, withoutEnlargement: true })
            .webp({ quality: 80, effort: 4 })
            .toBuffer()
          await fs.writeFile(hero1Path, heroWebp)
          hero1Status = 'created'
          hero1SizeKb = +(heroWebp.length / 1024).toFixed(1)
        } catch (err) {
          console.warn(`[WARN] Failed to write hero1 ${op.id}:`, err)
        }
      }
    }
  }

  // 2. Process E0/E1 hero copy (1280px) if operator has E2 and hero1 is missing
  if (hasE2 && needHero1) {
    const e1Candidates = resolveAsset('art', op.id, { variant: '1' })
    let e1Raw: Buffer | null = null
    for (const cand of e1Candidates) {
      if (cand.startsWith('http')) {
        e1Raw = await fetchWithRetry(cand)
        if (e1Raw) break
      }
    }

    if (!e1Raw) {
      const portraitCandidates = resolveAsset('portrait', op.id, { variant: '1' })
      for (const cand of portraitCandidates) {
        if (cand.startsWith('http')) {
          e1Raw = await fetchWithRetry(cand)
          if (e1Raw) break
        }
      }
    }

    if (e1Raw) {
      try {
        const heroWebp = await sharp(e1Raw)
          .resize({ width: 1280, withoutEnlargement: true })
          .webp({ quality: 80, effort: 4 })
          .toBuffer()
        await fs.writeFile(hero1Path, heroWebp)
        hero1Status = 'created'
        hero1SizeKb = +(heroWebp.length / 1024).toFixed(1)
      } catch (err) {
        console.warn(`[WARN] Failed to write hero1 ${op.id}:`, err)
      }
    }
  }

  return {
    id: op.id,
    thumbStatus,
    hero1Status,
    hero2Status,
    thumbSizeKb,
    hero1SizeKb,
    hero2SizeKb,
  }
}

async function main(): Promise<void> {
  console.log('=== Arknights Asset Generator: WebP Thumbs (480px) & Hero (1280px, q=80) ===\n')

  const indexPath = path.resolve(process.cwd(), 'data/operators-index.json')
  const thumbsDir = path.resolve(process.cwd(), 'public/art/thumbs')
  const heroDir = path.resolve(process.cwd(), 'public/art/hero')

  await fs.mkdir(thumbsDir, { recursive: true })
  await fs.mkdir(heroDir, { recursive: true })

  const rawIndex = await fs.readFile(indexPath, 'utf-8')
  const operators = JSON.parse(rawIndex) as OperatorSummary[]

  console.log(`Loaded ${operators.length} operators. Output folders:`)
  console.log(`- Thumbs (480px):  ${thumbsDir}`)
  console.log(`- Hero   (1280px): ${heroDir}\n`)

  const thumbSizes: number[] = []
  const heroSizes: number[] = []

  let createdThumbs = 0
  let createdHeroes = 0

  for (let i = 0; i < operators.length; i += BATCH_SIZE) {
    const batch = operators.slice(i, i + BATCH_SIZE)
    const results = await Promise.all(batch.map((op) => processOperator(op, thumbsDir, heroDir)))

    for (const res of results) {
      if (res.thumbStatus === 'created') createdThumbs++
      if (res.thumbSizeKb) thumbSizes.push(res.thumbSizeKb)

      if (res.hero1Status === 'created') createdHeroes++
      if (res.hero1SizeKb) heroSizes.push(res.hero1SizeKb)

      if (res.hero2Status === 'created') createdHeroes++
      if (res.hero2SizeKb) heroSizes.push(res.hero2SizeKb)
    }

    const processed = Math.min(i + BATCH_SIZE, operators.length)
    process.stdout.write(`\rProgress: ${processed}/${operators.length} operators processed...`)
  }

  console.log('\n\n=== GENERATION SUMMARY ===')
  console.log(`Total operators:     ${operators.length}`)
  console.log(`New thumbs created:  ${createdThumbs}`)
  console.log(`New heroes created:  ${createdHeroes}`)

  if (thumbSizes.length > 0) {
    const avgThumb = (thumbSizes.reduce((a, b) => a + b, 0) / thumbSizes.length).toFixed(1)
    console.log(`Average thumbnail:   ${avgThumb} KB (480px, target: < 80 KB)`)
  }

  if (heroSizes.length > 0) {
    const avgHero = (heroSizes.reduce((a, b) => a + b, 0) / heroSizes.length).toFixed(1)
    const maxHero = Math.max(...heroSizes).toFixed(1)
    const minHero = Math.min(...heroSizes).toFixed(1)
    console.log(`Average hero copy:   ${avgHero} KB (1280px, target: 150-250 KB)`)
    console.log(`Hero range:          ${minHero} KB - ${maxHero} KB`)
  }
}

main().catch((err) => {
  console.error('Fatal error generating character assets:', err)
  process.exit(1)
})
