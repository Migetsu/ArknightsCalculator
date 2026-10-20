import { defineConfig } from 'vitest/config'
import { defineVitestProject } from '@nuxt/test-utils/config'

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          include: ['tests/unit/{shared,scripts,routes,config,data,schemas}/**/*.{test,spec}.ts'],
          environment: 'node',
          // Vitest requires equal maxWorkers for projects in the same sequence group.
          maxWorkers: 12,
        },
      },
      await defineVitestProject({
        test: {
          name: 'nuxt',
          include: ['tests/unit/{components,pages,composables,stores}/**/*.{test,spec}.ts'],
          // Every Nuxt file boots a full app in beforeAll. With the default worker
          // count, 8 of 50 files exceeded the 10s hook timeout under load. 12 keeps
          // the run green; 4 and 8 stretched it to about 80s, 6 to 33s.
          maxWorkers: 12,
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
