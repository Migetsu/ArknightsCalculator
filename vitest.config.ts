import { defineVitestConfig } from '@nuxt/test-utils/config'

export default defineVitestConfig({
  test: {
    include: ['tests/unit/**/*.{test,spec}.ts'],
    environment: 'node',
    environmentMatchGlobs: [
      ['tests/unit/components/**', 'nuxt'],
      ['tests/unit/pages/**', 'nuxt'],
      ['tests/unit/composables/**', 'nuxt'],
    ],
    environmentOptions: {
      nuxt: {
        domEnvironment: 'happy-dom',
      },
    },
  },
})
