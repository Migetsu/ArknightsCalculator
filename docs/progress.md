# Project Progress

## Done

- Initialized Nuxt 4 scaffold with TypeScript.
- Configured directory layout: `app/`, `server/`, `shared/`, `data/`, `scripts/`, `tests/unit/`, `tests/e2e/`, `docs/`.
- Configured strict TypeScript in `tsconfig.json` (`strict: true`, `noUncheckedIndexedAccess: true`).
- Connected core modules: `@pinia/nuxt`, `@vueuse/nuxt`, `@nuxt/icon`, `@nuxt/image`, SCSS (`sass`).
- Created `.env.example` with Supabase configuration keys.
- Added minimal layout (`app/layouts/default.vue`) and stub home page (`app/pages/index.vue`).
- Created initial documentation (`docs/architecture.md`, `docs/progress.md`).
- Configured ESLint (flat config via `@nuxt/eslint`) with strict rules (`no-explicit-any`, `no-unused-vars`, `explicit-module-boundary-types`).
- Configured Prettier (`.prettierrc`) integrated with ESLint without conflicts (`eslint-config-prettier`).
- Configured Stylelint (`stylelint-config-standard-scss` + `postcss-html`) enforcing BEM kebab-case class selectors, banning tag selectors and IDs with reset overrides.
- Configured Husky + lint-staged (pre-commit fix & format) and commitlint (`@commitlint/config-conventional` for commit messages).
- Configured npm scripts: `lint`, `lint:fix`, `typecheck`, `format`.
- Pinned Node.js version via `.nvmrc` and `engines` field in `package.json` (Node 22 LTS).
- Configured Vitest + `@nuxt/test-utils` (isolated `node` environment for `shared/`, `nuxt` environment for components).
- Created pure function `shared/utils/clamp.ts` with comprehensive reference unit test in `tests/unit/shared/utils/clamp.test.ts`.
- Configured Playwright (Chromium) with webServer integration and smoke test in `tests/e2e/smoke.spec.ts`.
- Added npm scripts: `test`, `test:watch`, `test:e2e`.
- Configured GitHub Actions CI workflow (`.github/workflows/ci.yml`) for `push` and `pull_request` (quality checks + separate E2E job).
- Added Testing section to `docs/architecture.md`.
- Migrated Vitest configuration to projects (`unit` with Node environment, `nuxt` with happy-dom and `@nuxt/test-utils`).
- Configured Playwright CI webServer to use production build & preview (`npm run build && npm run preview`).
- Integrated `@nuxtjs/i18n` with English (default, prefix-less) and Russian (`/ru` prefix) with cookie detection and persistence.
- Implemented accessible BEM `LanguageSwitcher` component with URL routing and cookie persistence.
- Localized default layout (header, footer disclaimer) and home page using `t('...')` without hardcoded strings.
- Implemented `scripts/check-i18n.ts` and `npm run i18n:check` to enforce locale key parity, covered by unit tests and CI workflow.
- Added E2E tests for language switching, URL prefixing, and preference persistence on reload.
- Improved `LanguageSwitcher` link accessibility: standard links with `lang`, `hreflang`, and `aria-current="true"`.
- Connected `@nuxt/fonts` for self-hosted typography (`Exo 2`, `Inter`, `JetBrains Mono`) with guaranteed Latin and Cyrillic character coverage, font-display swap, and fallback stacks.
- Built SCSS architecture with BEM kebab-case structure: `_tokens.scss` (dark tactical Arknights palette, metrics, z-indexes, breakpoints), `_mixins.scss` (mobile-first `mq`, `cut-corner`, `focus-ring`, `reduced-motion`, `text-truncate`), `_reset.scss` (CSS reset and prefers-reduced-motion overrides), and `main.scss`.
- Created accessible UI primitives in `app/components/ui/` without Nuxt UI: `AkButton` (variants, sizes, loading, cut-corner), `AkPanel` (tactical cut corners, header slot), `AkTabs` (WAI-ARIA keyboard navigation ArrowLeft/Right/Home/End), `AkInput` (label, error states), `AkIcon` (icon wrapper).
- Implemented responsive shell in `app/layouts/default.vue`: sticky header with PRTS branding, desktop navigation, accessible mobile drawer with focus trap/restore, Escape key support, body scroll lock, and localized footer disclaimer.
- Created dev-only design system showcase page (`app/pages/_ui.vue`), excluded from production build and sitemap via `pages:extend` hook.
- Added unit and component tests (`AkButton.test.ts`, `AkTabs.test.ts`, `dev-only-routes.test.ts`) and Playwright responsive E2E tests (360px mobile drawer, 1440px desktop, screenshot generation).
- Implemented Rhodes Island Terminal HUD design system (Design V2) based on reference aesthetics (`docs/design-refs/`):
  - Dark HUD color palette (`#0c0d10`, `#14161a`, `#1a1d22`), accents (Cyan `#00e5ff`, Amber `#ff9800`, Green `#00e676`, Red `#ff1744`), and 1★–6★ operator rarity palette.
  - Vector background grid and radial vignette via CSS (`_reset.scss`, 0 KB external assets).
  - Clipped focus ring mixin (`@mixin focus-ring-clipped`) ensuring high-contrast accessible keyboard focus across cut corners.
  - Tactical UI component set without Nuxt UI: `AkPanel`, `AkButton` (with secondary variant and hover sweep), `AkBadge`, `AkStat`, `AkAlert` (responsive mobile stacking), `AkModal` (focus trap, Escape, accessible backdrop, Teleport), `AkDrawer` (tactical HUD drawer with modules DSH-00..SET-06), `AkAvatar` (colored rarity underline and initials fallback), `AkEmptyState`, `AkProgress` (segmented HUD progress bar), `AkInput`, `AkTabs`.
  - Typed demo dashboard data in `shared/data/demo-dashboard.ts`.
  - Interactive `SyncAccountModal` with Yostar email verification, JSON backup import, demo loader, and zero-storage account security advisory.
  - Responsive Dashboard overview page (`app/pages/index.vue`): PRTS tactical status, header Doctor card, account standby alert, 4 stats tiles, Gacha Radar panel with live countdown timer and rate-up operators, Gacha Treasury panel with spark progress, and Promotion Targets panel with tactical empty state.
  - Dev-only component showcase at `app/pages/_ui.vue` (excluded in production).
  - Full localization in `en.json` and `ru.json` with 100% key parity verified by `npm run i18n:check`.
  - Responsive Playwright screenshots captured at 360px, 768px, and 1440px viewports in `test-results/`.
  - All quality gates passing: 39 unit/component tests in Vitest and 14 Playwright E2E tests in CI mode.

## In progress

- None (Design V2 implementation completed).

## Next

- Configure Supabase client integration and state management for synchronized accounts.
- Develop calculation core for operators, material requirements, and craft trees in `shared/`.
- Build operator catalog and planner modules.

## Known issues

- None.
