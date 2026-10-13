import fs from 'node:fs/promises'
import path from 'node:path'
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

interface AssetVerificationItem {
  kind: 'item' | 'skill' | 'equip'
  id: string
  name: string
  subinfo?: string
  primary: VerificationCheckResult
  secondary: VerificationCheckResult
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
  console.log('=== Verifying 60 Items, 60 Skills, 60 Modules (Live GET Audit) ===\n')

  // 1. Collect 60 items
  const itemsRaw = await fs.readFile(path.resolve(process.cwd(), 'data/items.json'), 'utf-8')
  const allItems = JSON.parse(itemsRaw) as Array<{
    id: string
    name: { en: string; zh: string }
    iconId?: string
    rarity: number
    type: string
  }>

  // Sample diversified items (T1-T5 materials, chips, EXP, currencies, vouchers, tokens)
  const selectedItems: Array<{ id: string; iconId?: string; name: string; subinfo: string }> = []
  const itemSeen = new Set<string>()

  // Essential materials
  const coreItemIds = [
    '30011', '30012', '30013', '30014', // Rocks T1-T4
    '30021', '30022', '30023', '30024', // Sugar T1-T4
    '30031', '30032', '30033', '30034', // Polyester T1-T4
    '30041', '30042', '30043', '30044', // Oriron T1-T4
    '30051', '30052', '30053', '30054', // Ketone T1-T4
    '30061', '30062', '30063', '30064', // Device T1-T4
    '30073', '30074', // Loxic Kohl, White Horse Kohl
    '30083', '30084', // Manganese Ore, Trihydrate
    '30093', '30094', // Grindstone, Pentahydrate
    '30103', '30104', // RMA70-12, RMA70-24
    '31013', '31014', // Coagulating Gel, Polymerized Gel
    '31023', '31024', // Incandescent Alloy, Block
    '31033', '31034', // Crystalline Component, Circuit
    '31043', '31044', // Refined Solvent, Semi-Synthetic
    '31053', '31054', // Cutting Fluid, Compound
    '30115', '30125', '30135', '30145', '30155', // T5 Tier-5 crafted mats
    '4001', '4002', '4003', '4006', // LMD, Orundum, OP, Purchase Cert
    '2001', '2002', '2003', '2004', // EXP Cards 1-4
    '3301', '3302', '3303', // Skill books 1-3
    'mod_unlock_token', 'mod_update_token_1', 'mod_update_token_2', // Module materials
    '7001', '7003', '7004', // Recruitment / Gacha tickets
  ]

  for (const cid of coreItemIds) {
    const it = allItems.find((i) => i.id === cid)
    if (it && !itemSeen.has(it.id)) {
      itemSeen.add(it.id)
      selectedItems.push({
        id: it.id,
        iconId: it.iconId,
        name: it.name.en,
        subinfo: `Rarity ${it.rarity} ${it.type}`,
      })
    }
  }

  // Fill up to 60 items if needed
  for (const it of allItems) {
    if (selectedItems.length >= 60) break
    if (!itemSeen.has(it.id) && it.iconId) {
      itemSeen.add(it.id)
      selectedItems.push({
        id: it.id,
        iconId: it.iconId,
        name: it.name.en,
        subinfo: `Rarity ${it.rarity} ${it.type}`,
      })
    }
  }

  console.log(`Collected ${selectedItems.length} items.`)

  // 2. Collect 60 skills & 60 modules from operators
  const opDir = path.resolve(process.cwd(), 'data/operators')
  const opFiles = await fs.readdir(opDir)

  const selectedSkills: Array<{ id: string; iconId?: string; name: string; subinfo: string }> = []
  const skillSeen = new Set<string>()

  const selectedModules: Array<{ id: string; name: string; subinfo: string }> = []
  const moduleSeen = new Set<string>()

  for (const file of opFiles) {
    if (!file.endsWith('.json')) continue
    const opContent = await fs.readFile(path.join(opDir, file), 'utf-8')
    const op = JSON.parse(opContent) as {
      name: { en: string }
      skills?: Array<{ skillId: string; iconId?: string | null; levels: Array<{ name: { en: string } }> }>
      modules?: Array<{ id: string; name: { en: string }; type: string }>
    }

    if (op.skills) {
      for (const sk of op.skills) {
        if (selectedSkills.length < 60 && !skillSeen.has(sk.skillId)) {
          skillSeen.add(sk.skillId)
          const skName = sk.levels[0]?.name.en ?? sk.skillId
          selectedSkills.push({
            id: sk.skillId,
            iconId: sk.iconId ?? undefined,
            name: `${op.name.en} - ${skName}`,
            subinfo: `Op: ${op.name.en}`,
          })
        }
      }
    }

    if (op.modules) {
      for (const mod of op.modules) {
        if (selectedModules.length < 60 && !moduleSeen.has(mod.id)) {
          moduleSeen.add(mod.id)
          selectedModules.push({
            id: mod.id,
            name: `${op.name.en} - ${mod.name.en}`,
            subinfo: `Type: ${mod.type}`,
          })
        }
      }
    }

    if (selectedSkills.length >= 60 && selectedModules.length >= 60) {
      break
    }
  }

  console.log(`Collected ${selectedSkills.length} skills.`)
  console.log(`Collected ${selectedModules.length} modules.`)

  // 3. Execute live GET checks
  const results: AssetVerificationItem[] = []

  async function checkAsset(
    kind: 'item' | 'skill' | 'equip',
    id: string,
    name: string,
    subinfo: string,
    options?: { iconId?: string },
  ): Promise<AssetVerificationItem> {
    const candidates = resolveAsset(kind, id, options)
    const primaryUrl = candidates[0] ?? ''
    const secondaryUrl = candidates[1] ?? ''

    let [primaryRes, secondaryRes] = await Promise.all([
      verifyUrl(primaryUrl),
      verifyUrl(secondaryUrl),
    ])

    // If initial candidate fails but fallback candidates exist (e.g. default.png for unreleased modules), follow fallback
    if (!primaryRes.ok && candidates[2]) {
      const fbRes = await verifyUrl(candidates[2])
      if (fbRes.ok) {
        primaryRes = fbRes
      }
    }
    if (!secondaryRes.ok && candidates[3]) {
      const fbRes = await verifyUrl(candidates[3])
      if (fbRes.ok) {
        secondaryRes = fbRes
      }
    }

    return {
      kind,
      id,
      name,
      subinfo,
      primary: primaryRes,
      secondary: secondaryRes,
    }
  }

  console.log('\n--- Checking 60 Items ---')
  for (let i = 0; i < selectedItems.length; i++) {
    const it = selectedItems[i]!
    const res = await checkAsset('item', it.id, it.name, it.subinfo, { iconId: it.iconId })
    results.push(res)
    process.stdout.write(res.primary.ok ? '.' : 'F')
  }

  console.log('\n--- Checking 60 Skills ---')
  for (let i = 0; i < selectedSkills.length; i++) {
    const sk = selectedSkills[i]!
    const res = await checkAsset('skill', sk.id, sk.name, sk.subinfo, { iconId: sk.iconId })
    results.push(res)
    process.stdout.write(res.primary.ok ? '.' : 'F')
  }

  console.log('\n--- Checking 60 Modules ---')
  for (let i = 0; i < selectedModules.length; i++) {
    const mod = selectedModules[i]!
    const res = await checkAsset('equip', mod.id, mod.name, mod.subinfo)
    results.push(res)
    process.stdout.write(res.primary.ok ? '.' : 'F')
  }

  console.log('\n\n=== Verification Results ===')

  for (const kind of ['item', 'skill', 'equip'] as const) {
    const group = results.filter((r) => r.kind === kind)
    const primaryOk = group.filter((r) => r.primary.ok).length
    const secondaryOk = group.filter((r) => r.secondary.ok).length
    const primaryLat =
      group.reduce((acc, r) => acc + r.primary.durationMs, 0) / (group.length || 1)
    const secondaryLat =
      group.reduce((acc, r) => acc + r.secondary.durationMs, 0) / (group.length || 1)

    console.log(`\n[${kind.toUpperCase()} - Sample Size: ${group.length}]`)
    console.log(
      `Primary CDN (jsDelivr):   ${primaryOk} / ${group.length} (${((primaryOk / group.length) * 100).toFixed(1)}%) - Avg: ${primaryLat.toFixed(0)}ms`,
    )
    console.log(
      `Secondary CDN (Statically): ${secondaryOk} / ${group.length} (${((secondaryOk / group.length) * 100).toFixed(1)}%) - Avg: ${secondaryLat.toFixed(0)}ms`,
    )

    const failedPrimary = group.filter((r) => !r.primary.ok)
    if (failedPrimary.length > 0) {
      console.log(`  Failed Primary sample:`)
      for (const f of failedPrimary.slice(0, 5)) {
        console.log(`    - [${f.id}] ${f.name} => ${f.primary.url} (${f.primary.error})`)
      }
    }
  }

  // Save report
  await fs.writeFile(
    path.resolve(process.cwd(), 'data/new-assets-verification-report.json'),
    JSON.stringify(results, null, 2),
    'utf-8',
  )
  console.log('\nReport written to data/new-assets-verification-report.json')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
