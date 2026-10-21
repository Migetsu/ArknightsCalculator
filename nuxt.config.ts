// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2026-10-11',
  devtools: { enabled: false },
  sourcemap: false,
  buildDir: process.env.NUXT_BUILD_DIR ?? '.nuxt',
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
    '@nuxtjs/supabase',
    '@nuxtjs/sitemap',
    'nuxt-schema-org',
    '@vite-pwa/nuxt',
  ],
  supabase: {
    redirect: false,
    url: process.env.SUPABASE_URL || 'http://localhost:54321',
    key: process.env.SUPABASE_KEY || 'dummy-anon-key',
  },
  runtimeConfig: {
    public: {
      // Yostar account sync (docs/yostar-sync.md). Set NUXT_PUBLIC_YOSTAR_SYNC_ENABLED=false
      // to hide the tab and make /api/yostar/* answer 404.
      yostarSyncEnabled: true,
    },
  },
  site: {
    url: 'https://rhodeslab.vercel.app',
    name: 'RhodesLab',
  },
  sitemap: {
    exclude: ['/_ui'],
    urls: async () => {
      const raw = await import('./data/operators-index.json', { with: { type: 'json' } })
      const operators = (raw.default ?? raw) as Array<{ id: string }>
      return operators.map((op) => `/operators/${op.id}`)
    },
  },
  image: {
    // Disable Vercel server-side image transformation to stay within Free tier limit (1,000 transforms/month).
    // External game assets are served directly from fast, edge-cached jsDelivr / Statically CDNs.
    provider: 'none',
    domains: ['cdn.jsdelivr.net', 'cdn.statically.io'],
    format: ['webp', 'png'],
  },
  css: ['~/assets/styles/main.scss'],
  nitro: {
    // `@pinia/nuxt` inlines pinia into the server entry, while page chunks keep
    // importing the external package on Windows; two instances make
    // `getActivePinia()` fail during SSR. Bundling pinia once fixes the split.
    externals: { inline: ['pinia'] },
  },
  vite: {
    cacheDir: process.env.NUXT_BUILD_DIR ? `${process.env.NUXT_BUILD_DIR}/vite` : undefined,
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
      weights: [400, 500, 600, 800],
      styles: ['normal'],
      subsets: ['latin', 'cyrillic'],
    },
    families: [
      {
        name: 'Golos Text',
        provider: 'google',
        weights: [400, 600],
        subsets: ['latin', 'cyrillic'],
      },
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
  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      id: '/',
      name: 'RhodesLab — Arknights Companion',
      short_name: 'RhodesLab',
      description: 'Unofficial Arknights companion: planner, depot, farming, gacha and wiki.',
      lang: 'en',
      start_url: '/',
      scope: '/',
      display: 'standalone',
      orientation: 'any',
      theme_color: '#0b0e11',
      background_color: '#0b0e11',
      categories: ['games', 'utilities'],
      icons: [
        { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        {
          src: '/icons/icon-maskable-512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable',
        },
      ],
    },
    workbox: {
      navigateFallback: '/',
      globPatterns: ['**/*.{js,css,html,png,svg,webp,woff2}'],
      cleanupOutdatedCaches: true,
    },
    client: {
      // Vitest cannot resolve the virtual:pwa-register module; production keeps
      // the Nuxt PWA client plugin and the install prompt.
      registerPlugin: process.env.NODE_ENV !== 'test',
      installPrompt: true,
    },
    devOptions: {
      enabled: false,
    },
  },
  app: {
    head: {
      title: 'RhodesLab — Arknights Companion',
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/icons/favicon-32.png' },
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/icons/apple-touch-icon.png' },
      ],
      meta: [
        { name: 'theme-color', content: '#0b0e11' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
        { name: 'apple-mobile-web-app-title', content: 'RhodesLab' },
      ],
    },
  },
  i18n: {
    vueI18n: './i18n.config.ts',
    defaultLocale: 'en',
    strategy: 'no_prefix',
    baseUrl: 'https://rhodeslab.vercel.app',
    locales: [
      {
        code: 'en',
        name: 'English',
        language: 'en-US',
        file: 'en.json',
      },
    ],
    detectBrowserLanguage: false,
  },
  typescript: {
    strict: true,
  },
})
