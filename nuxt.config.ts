// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2026-10-11',
  future: {
    compatibilityVersion: 4,
  },
  modules: [
    '@nuxt/eslint',
    '@nuxt/fonts',
    '@pinia/nuxt',
    '@vueuse/nuxt',
    '@nuxt/icon',
    '@nuxt/image',
    '@nuxtjs/i18n',
  ],
  css: ['~/assets/styles/main.scss'],
  vite: {
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: '@use "~/assets/styles/mixins" as *;\n',
        },
      },
    },
  },
  fonts: {
    defaults: {
      weights: [400, 500, 600, 700],
      styles: ['normal'],
      subsets: ['latin', 'cyrillic'],
    },
    families: [
      { name: 'Exo 2', provider: 'google', subsets: ['latin', 'cyrillic'] },
      { name: 'Inter', provider: 'google', subsets: ['latin', 'cyrillic'] },
      { name: 'JetBrains Mono', provider: 'google', subsets: ['latin', 'cyrillic'] },
    ],
  },
  hooks: {
    'pages:extend'(pages) {
      if (process.env.NODE_ENV === 'production') {
        const uiIndex = pages.findIndex((page) => page.name === '_ui' || page.path.includes('/_ui'))
        if (uiIndex !== -1) {
          pages.splice(uiIndex, 1)
        }
      }
    },
  },
  i18n: {
    defaultLocale: 'en',
    strategy: 'prefix_except_default',
    baseUrl: 'https://arkcalc.vercel.app',
    locales: [
      {
        code: 'en',
        name: 'English',
        language: 'en-US',
        file: 'en.json',
      },
      {
        code: 'ru',
        name: 'Русский',
        language: 'ru-RU',
        file: 'ru.json',
      },
    ],
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'i18n_redirected',
      redirectOn: 'root',
      alwaysRedirect: false,
      fallbackLocale: 'en',
    },
  },
  typescript: {
    strict: true,
  },
})
