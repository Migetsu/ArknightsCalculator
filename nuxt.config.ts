// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2026-10-11',
  future: {
    compatibilityVersion: 4,
  },
  modules: ['@nuxt/eslint', '@pinia/nuxt', '@vueuse/nuxt', '@nuxt/icon', '@nuxt/image'],
  typescript: {
    strict: true,
  },
})
