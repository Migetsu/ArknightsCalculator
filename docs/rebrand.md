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
- `https://arkcalc.vercel.app` remains the canonical URL until the owner changes the
  Vercel domain; then update `site.url`, `i18n.baseUrl`, sitemap/canonical, Supabase Auth
  Site URL/Redirect URLs and add a 301 from the old domain.

## Domain migration checklist

1. Add the new domain in Vercel and set it as primary.
2. Keep `arkcalc.vercel.app` as a 301 redirect.
3. Update `nuxt.config.ts` `site.url` and `i18n.baseUrl`.
4. Update Supabase Auth Site URL and redirect allow-list.
5. Update Google Search Console change-of-address and sitemap submission.
6. Re-run the PWA installability check; `start_url`/`scope` are relative.
