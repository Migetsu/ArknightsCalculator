# PWA and installability

RhodesLab is a Progressive Web App built with `@vite-pwa/nuxt`.

## What is configured

- `@vite-pwa/nuxt` in `nuxt.config.ts`, `registerType: 'autoUpdate'`.
- Web manifest: name/short name, `start_url: /`, `scope: /`, `display: standalone`,
  dark background/theme, 192/512/maskable icons.
- A Workbox service worker with app-shell navigation fallback and asset precaching.
- Icons in `public/icons/`: `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`,
  `apple-touch-icon.png`, `favicon-32.png`; source marks in `public/logo.svg`,
  `public/logo-mark.svg` and `public/favicon.svg`.
- `app/components/ui/AkInstallApp.vue` shows an **Install app** button when the browser
  fires `beforeinstallprompt`; on iOS it shows the Share → Add to Home Screen hint.

## Browser support

| Browser                                     | Install                                  |
| ------------------------------------------- | ---------------------------------------- |
| Chrome / Edge / Chromium (desktop, Android) | Install prompt or address-bar install    |
| Safari iOS/iPadOS                           | Share → Add to Home Screen (no prompt)   |
| Firefox desktop                             | No PWA installation; site works normally |

HTTPS is required, except on `localhost`. Vercel provides HTTPS. The production preview can
be checked locally with `node .output/server/index.mjs` on port 3001.

## Verification

- Chrome CDP `Page.getInstallabilityErrors` returns an empty list on the production build.
- Service worker is `activated`; `/manifest.webmanifest` and `/sw.js` return 200.
- Head tags include `manifest`, SVG/PNG favicons, `apple-touch-icon`, `theme-color`,
  `apple-mobile-web-app-*`.

The production domain is `https://rhodeslab.vercel.app`; the old
`https://arkcalc.vercel.app` redirects (308) to it. `start_url` and `scope` are relative,
so the PWA keeps working after the domain move.
