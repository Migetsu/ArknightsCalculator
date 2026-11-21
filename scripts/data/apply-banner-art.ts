import { promises as fs } from 'node:fs'
import path from 'node:path'
import { getBannerArtCandidates } from '../../shared/utils/gacha'

interface BannerEntry {
  id: string
  server?: 'cn' | 'en'
  pairedBannerId?: string | null
  hasArt?: boolean
  artId?: string | null
  bannerArt?: string | null
}

export interface BannersDatasetLike {
  cnBanners: BannerEntry[]
  enBanners: BannerEntry[]
}

/**
 * Recomputes `hasArt`/`artId` from the published art list without rebuilding the
 * whole banner dataset (which needs the raw game tables). Used after the asset
 * workflow publishes newly generated or wiki-sourced banner art.
 *
 * Returns the number of banners whose art fields changed.
 */
export function applyBannerArt(
  dataset: BannersDatasetLike,
  artIds: readonly string[],
): number {
  const available = new Set(artIds)
  let changed = 0

  for (const list of [dataset.cnBanners, dataset.enBanners]) {
    for (const banner of list) {
      const matched =
        getBannerArtCandidates(banner.id, banner.server, banner.pairedBannerId).find((id) =>
          available.has(id),
        ) ?? null
      const hasArt = Boolean(matched)

      if (
        banner.hasArt !== hasArt ||
        (banner.artId ?? null) !== matched ||
        (banner.bannerArt ?? null) !== matched
      ) {
        banner.hasArt = hasArt
        if (matched) {
          banner.artId = matched
          banner.bannerArt = matched
        } else {
          delete banner.artId
          delete banner.bannerArt
        }
        changed++
      }
    }
  }

  return changed
}

async function main(): Promise<void> {
  const bannersPath = path.resolve(process.cwd(), 'data/banners.json')
  const artsPath = path.resolve(process.cwd(), 'data/banner-arts.json')

  const dataset = JSON.parse(await fs.readFile(bannersPath, 'utf-8')) as BannersDatasetLike
  const artIds = JSON.parse(await fs.readFile(artsPath, 'utf-8')) as string[]
  if (!Array.isArray(artIds)) throw new Error('data/banner-arts.json must be an array of ids')

  const changed = applyBannerArt(dataset, artIds)
  if (changed === 0) {
    console.log('Banner art flags are already current.')
    return
  }

  await fs.writeFile(bannersPath, `${JSON.stringify(dataset, null, 2)}\n`)
  console.log(`Updated art flags on ${changed} banners.`)
}

if (process.argv[1]?.includes('apply-banner-art')) {
  main().catch((err) => {
    console.error('Fatal error in apply-banner-art:', err)
    process.exit(1)
  })
}
