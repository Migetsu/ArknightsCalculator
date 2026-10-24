import { defineConfig } from 'vitest/config'
import { defineVitestProject } from '@nuxt/test-utils/config'
import { availableParallelism } from 'node:os'
import { fileURLToPath } from 'node:url'

// Cap simultaneous Nuxt environment boots on many-core machines, but never above
// the default worker count of a small CI runner (4 cores => 3 workers there).
const maxWorkers = Math.min(12, Math.max(1, availableParallelism() - 1))

export default defineConfig({
  resolve: {
    alias: {
      '~~': fileURLToPath(new URL('./', import.meta.url)),
      '~': fileURLToPath(new URL('./app', import.meta.url)),
      '#shared': fileURLToPath(new URL('./shared', import.meta.url)),
    },
  },
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          include: ['tests/unit/{shared,scripts,routes,config,data,schemas}/**/*.{test,spec}.ts'],
          environment: 'node',
          // Vitest requires equal maxWorkers for projects in the same sequence group.
          maxWorkers,
        },
      },
      await defineVitestProject({
        test: {
          name: 'nuxt',
          include: ['tests/unit/{components,pages,composables,stores}/**/*.{test,spec}.ts'],
          // Every Nuxt file boots a full app in beforeAll. With the default worker
          // count, 8 of 50 files exceeded the 10s hook timeout under load on a
          // 16-core machine. Capping at 12 keeps it green; 4 and 8 stretched the
          // run to about 80s, 6 to 33s.
          maxWorkers,
          // Setup takes 4.3s idle and over 10s under load, so the 10s default is too
          // tight. 30s doubles that budget.
          hookTimeout: 30_000,
          environmentOptions: {
            nuxt: {
              domEnvironment: 'happy-dom',
            },
          },
        },
      }),
    ],
  },
})
