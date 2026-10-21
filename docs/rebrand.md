# Rebrand: RhodesLab

The public brand is **RhodesLab** (unofficial Arknights companion). `ARKCALC` / `ArkCalc`
is retired from user-facing copy.

## What changed

- Header wordmark `RHODESLAB`, new cut-corner **R** mark (`public/logo-mark.svg`).
- Page titles, dashboard copy, UI showcase watermark and gacha watermark.
- `package.json` name `rhodeslab` (lockfile root updated).
- README/NOTICE title, PWA manifest name and app icons.
- `site.name` and `common.appName` / layout/home titles.
- Backup filename `rhodeslab-backup-YYYY-MM-DD.json`.

## Deliberately kept

- **Storage keys** `arkcalc_*` are unchanged so existing depot/planner/roster data survives.
- The export key `arkcalcVersion` is kept for import compatibility.
- `Migetsu/arkcalc-assets` remains the real asset repository URL.
- `https://arkcalc.vercel.app` is kept as a **308 redirect** to
  `https://rhodeslab.vercel.app`; `site.url` and `i18n.baseUrl` now use the new domain.

## Domain migration checklist (done 2026-10-21)

1. Added `rhodeslab.vercel.app` in Vercel and set it as primary.
2. Added `arkcalc.vercel.app` as a 308 redirect.
3. Updated `nuxt.config.ts` `site.url` and `i18n.baseUrl`; schema.org URLs in
   `app/pages/operators/index.vue`.
4. Updated Supabase Auth Site URL and redirect allow-list.
5. Remaining manual: Google Search Console change-of-address and sitemap submission.
6. Re-run the PWA installability check after the deploy; `start_url`/`scope` are relative.
