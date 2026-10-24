import { defineNuxtModule } from '@nuxt/kit'
import { resolve } from 'node:path'
import { OPERATOR_DATA_DATASETS } from '../../shared/utils/operatorData'
import { buildDataAssetBuckets } from './build-buckets'

/**
 * Exposes the operator detail and handbook datasets to Nitro as aggregated
 * server assets (`assets:operators`, `assets:handbook`).
 *
 * Source of truth remains `data/operators/*.json` and `data/handbook/*.json`.
 * The module only writes build-scoped bucket files into the Nuxt build
 * directory; `data/` and `npm run data:validate` are untouched.
 */
export default defineNuxtModule({
  meta: {
    name: 'server-data-assets',
  },
  setup(_options, nuxt) {
    const dataDir = resolve(nuxt.options.rootDir, 'data')
    // Nuxt clears the build directory after `nitro:config`, so generated assets
    // must live outside it to survive until Nitro bundles server assets.
    const outDir = resolve(nuxt.options.rootDir, '.cache/server-data-assets')

    nuxt.hook('nitro:config', async (nitroConfig) => {
      await buildDataAssetBuckets({ dataDir, outDir })

      nitroConfig.serverAssets ||= []
      for (const dataset of OPERATOR_DATA_DATASETS) {
        nitroConfig.serverAssets.push({
          baseName: dataset.name,
          dir: resolve(outDir, dataset.name),
          pattern: '*.json',
        })
      }

      // The skins dataset is one flat file. It is never part of the client
      // bundle; `/api/skins/[id]` filters it down to a single operator.
      nitroConfig.serverAssets.push({
        baseName: 'skins',
        dir: dataDir,
        pattern: 'skins.json',
      })

      // /gacha consumes a projection of the banners dataset through
      // `/api/gacha/banners`; the 2 MB source file stays server-side.
      nitroConfig.serverAssets.push({
        baseName: 'gacha',
        dir: dataDir,
        pattern: 'banners.json',
      })

      // Items catalog for /api/items/[id] on-demand lookup and farming metadata.
      nitroConfig.serverAssets.push({
        baseName: 'items',
        dir: dataDir,
        pattern: 'items.json',
      })

      // Stages dataset for /api/farming/data server-side filtering.
      nitroConfig.serverAssets.push({
        baseName: 'stages',
        dir: dataDir,
        pattern: 'stages.json',
      })

      // Penguin drop matrices for /api/farming/data.
      nitroConfig.serverAssets.push({
        baseName: 'penguin',
        dir: resolve(dataDir, 'penguin'),
        pattern: '*.json',
      })
    })
  },
})
