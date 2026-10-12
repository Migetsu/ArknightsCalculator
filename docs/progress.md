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
  - Configured dev server isolation: port 3000 strictly reserved for project owner; automated agent runs on port 3001 using isolated `NUXT_BUILD_DIR=.nuxt-agent` via `npm run dev:agent` (`scripts/dev-agent.mjs`), documented in `AGENTS.md`.
- Fixed i18n linked message compilation crash (Code 10: Invalid linked format) triggered by `@` in translation strings; moved non-translatable values to template props and added AST compilation checks to `scripts/check-i18n.ts` with 12 unit tests.
- Added `i18n/i18n.config.ts` with `missing` translation handler logging missing keys to `console.error`.
- Fixed horizontal layout overflows across 1024px, 360px, and 1920px viewports without masking `overflow-x` on html/body:
  - Applied `minmax(0, 1fr)` to all CSS Grid templates (`&__panels-grid`, `&__stats-grid`).
  - Added responsive breakpoint distribution: 1 column on `< md`, 2 columns on `md`–`xl`, 3 columns on `xl+`.
  - Enforced `min-width: 0`, `flex-shrink: 0`, and `text-overflow: ellipsis` on panels, operator chips, currency bars, and Drawer Doctor profile card.
- Implemented Playwright console/pageerror defense fixture (`tests/e2e/fixtures.ts`) to fail tests on unhandled errors or missing translation keys.
- Implemented UI consistency foundation and central module architecture:
  - Added Section 13 «Единообразие интерфейса» to `AGENTS.md`.
  - Created central typed modules registry `app/config/modules.ts` with `APP_MODULES` (`DSH-00`..`SET-06`), icons, routes, status (`ready` | `soon`), and i18n keys.
  - Refactored `app/layouts/default.vue` navigation drawer to build entirely from `APP_MODULES` without markup duplication.
  - Created layout primitive components in `app/components/ui/`: `AkContainer` (size presets `sm`–`xl`, responsive padding), `AkGrid` (strict `minmax(0, 1fr)` columns, gap presets, responsive presets `panels`/`stats`/`operators`), and `AkPageHeader` (tactical code tag, title, subtitle, watermark, actions slot). Added them to `app/pages/_ui.vue` showcase.
  - Implemented uniform placeholder pages for all registered modules: `planner.vue`, `gacha.vue`, `recruit.vue`, `operators.vue`, `depot.vue`, `settings.vue` with `AkPageHeader`, `AkEmptyState`, and responsive 360px support for loading, error, and empty states.
  - Added unit test suite `tests/unit/config/modules.test.ts` validating uniqueness of id/route/code, regex formatting, lookup helpers, and 100% presence of keys in `en.json` and `ru.json`.
  - Added component tests `AkContainer.test.ts`, `AkGrid.test.ts`, `AkPageHeader.test.ts`. Total 55 unit/component tests passing.
  - Automated `layout-sanity.spec.ts` to traverse all registry routes in EN and RU across 5 viewports (360, 768, 1024, 1440, 1920). Total 86 Playwright E2E tests passing.

- Implemented raw game data sources research, audit documentation, and reproducible fetching pipeline:
  - Audited external repositories and APIs with full findings documented in `docs/data-sources.md`.
  - Identified critical discrepancies: `Kengxxiao/ArknightsGameData` contains only `zh_CN`; Global data is located in `Kengxxiao/ArknightsGameData_YoStar` (`en_US`, `ja_JP`, `ko_KR`). No official Russian localization exists in client data. Active assets are maintained in `yuanyan3060/ArknightsGameResource`.
  - Authored `scripts/data/sources.config.ts` pinning commit SHAs for CN (`17759cc8cdf37388414145d16262a3a06f3ab25e`), EN (`57010cb5b2afea112cae57daa756b58676ba6850`), and assets (`9bf239661e37766fba585806fb9fa67e79bb679e`), with automatic primary (GitHub Raw) and mirror (jsDelivr) resolution.
  - Implemented strict Zod schemas with `.passthrough()` in `scripts/data/schemas/` for all 9 core tables: `character_table`, `skill_table`, `item_table`, `uniequip_table`, `building_data`, `gacha_table`, `stage_table`, `handbook_info_table`, and `char_patch_table`.
  - Built idempotent download script `scripts/data/fetch-raw.ts` (`npm run data:fetch`) with exponential retries, rate-limiting pauses, payload integrity verification, schema validation, and `.cache/raw/` caching.
  - Authored offline mini-fixtures in `tests/fixtures/raw/` and 15 comprehensive unit tests in `tests/unit/data/raw-schemas.test.ts` (0 network calls in tests). Total 70 Vitest unit/component tests passing.

- Implemented typed operator data transformation and normalization pipeline (`feat/data-operators`):
  - Created strict Zod schemas and models in `shared/schemas/operator.ts`: `I18nString`, `OperatorSummary`, `OperatorDetail`, `OperatorSkill`, `OperatorTalent`, `OperatorModule`, `DataMeta`.
  - Implemented pure localized text resolver `resolveI18nString` with fallback chain: `ru` -> `en` -> `zh` and `isMachineTranslation` tracking.
  - Authored deterministic transformation builder `scripts/data/build-operators.ts` (`npm run data:build`):
    - Filter rules: strictly isolates tokens (`token_`, `isToken: true`, `profession: TOKEN`), traps, test characters (`char_500_noone`, `notchar*`), and temporary IS-story dummies without catalog display numbers.
    - Successfully normalizes 434 playable operators (376 Global, 58 CN-only) including Amiya class changes (Guard, Medic).
    - Merges and normalizes localized names, skills, masteries, talents, potentials, and modules (`uniequip_table`).
    - Produces lightweight list index `data/operators-index.json` (197.8 KB uncompressed, ~35 KB gzip), `data/meta.json` (0.3 KB), and 434 individual lazy detail files `data/operators/{id}.json` (18.1 MB total).
  - Added 16 unit tests in `tests/unit/data/build-operators.test.ts` covering filter rules, fallback chains, normalization on fixtures, output determinism, and real generated dataset schema compliance. Total 86 Vitest tests passing.

- Implemented game asset delivery pipeline and resilient visual fallback architecture (`feat/assets`):
  - Authored pure utility `shared/utils/resolveAsset.ts`: returns ordered candidate URLs (primary jsDelivr CDN with pinned commit `9bf239661e37766fba585806fb9fa67e79bb679e`, secondary Statically mirror). Strictly bans direct runtime hotlinking to `prts.wiki` and `raw.githubusercontent.com`.
  - Authored verification script `scripts/data/build-asset-manifest.ts` (`npm run data:assets`) generating `data/asset-manifest.json`: verified 434 operators (431 with available avatars, 3 CN-only variants handled gracefully by fallback).
  - Enhanced `AkAvatar.vue` UI primitive: uses `resolveAsset`, sets explicit `width` and `height` dimensions preventing layout shifts (CLS), sets `loading="lazy"` and `decoding="async"`, cycles through CDN candidates on image error, and cleanly falls back to tactical initials over rarity color background.
  - Configured `@nuxt/image` in `nuxt.config.ts` with `provider: 'none'` and external CDN domains, protecting against Vercel Free Plan image transformation quota exhaustion (0/1,000 monthly usage).
  - Authored comprehensive documentation in `docs/assets.md` covering CDN hierarchy, Vercel quotas, asset registration guide, and intellectual property disclaimer.
  - Added unit test suite `tests/unit/shared/resolveAsset.test.ts` (9 tests) and updated component tests `tests/unit/components/ui/AkAvatar.test.ts` (6 tests). Total 97 Vitest tests passing.

- Implemented Operator Catalog wiki module (`feat/operators-list`):
  - Created `/operators` page with SSR/prerender SEO, Schema.org `ItemList`, and `@nuxtjs/sitemap` integration (excluding dev `/_ui` route).
  - Authored pure filtering, sorting, and URL query serialization utilities in `shared/utils/operatorFilters.ts` with unit tests (20 tests).
  - Authored `AkOperatorCard.vue` UI component featuring rarity stripe, avatar, localized name, class, subclass, stars, and CN-exclusive badge.
  - Authored `AkOperatorFilters.vue` component with fuzzy punctuation-stripped search, class toggles, rarity chips, subclass & faction selects, and Global/CN server switch.
  - Implemented high-performance batch chunking (36 initial items + infinite scroll observer and accessible fallback button) ensuring smooth interaction with 400+ operators.
  - Added live results counter (`aria-live="polite"`), comprehensive keyboard accessibility, and standard loading (skeletons), empty, and error states.
  - Created operator detail page stub (`/operators/[id]`) with `AkPageHeader`, avatar portrait, and metadata grid.
  - Authored component tests (`AkOperatorCard`, `AkOperatorFilters`), unit tests, and Playwright E2E suite (`tests/e2e/operators.spec.ts`) validating search, multi-select, server toggle, URL restoration, empty state, and layout sanity on 5 breakpoints. Total 126 Vitest tests and 93 Playwright tests passing.

- Audited routes, live CDN asset delivery, Amiya class-change mappings, and visual DOM rendering (`fix/audit-batch2`):
  - Route audit: confirmed `pages/operators.vue` stub is removed and routing functions cleanly through `operators/index.vue` and `operators/[id].vue`. Added E2E tests validating direct access to `/operators/{id}` loads operator detail view, not catalog.
  - Live asset verification: authored `scripts/data/verify-assets.ts` (`npm run data:verify-assets`) testing 60 operators (all rarities 1★–6★, 3 Amiya classes, CN operators). Validated 100% success rate on jsDelivr (avg 165ms) and Statically (avg 740ms) using real HTTP GET byte delivery.
  - Amiya class change mapping: audited `yuanyan3060/ArknightsGameResource@9bf239661e37766fba585806fb9fa67e79bb679e` repository tree. Added explicit mappings in `shared/utils/resolveAsset.ts` for Medic Amiya avatar (`char_1037_amiya3_2`) and Guard/Medic portrait variants (`'2'`). Unit tests passing in `tests/unit/shared/resolveAsset.test.ts`.
  - Manifest pipeline: updated `scripts/data/build-asset-manifest.ts` with real HTTP GET validation, concurrency throttling (10 workers), and `source: 'http' | 'tree'`. Re-generated `data/asset-manifest.json` achieving 434/434 (100%) verified avatars.
  - Visual DOM audit: authored `tests/e2e/audit-assets-dom.spec.ts` on port 3001. Confirmed `naturalWidth > 0` for all rendered `<img>` elements, captured responsive screenshots `docs/screenshots/operators-360.png` and `docs/screenshots/operators-1440.png`, and traversed full catalog (376 operators) with 0 fallbacks (`fallbackRatio = 0.0%`).

- Implemented calculation constants, item registry, crafting recipes, module combat stats, and referential integrity validator (`feat/data-constants`):
  - Updated data fetching pipeline: added `gamedata_const.json` and `battle_equip_table.json` (CN & EN) to `sources.config.ts`, `fetch-raw.ts`, and Zod schemas with `.passthrough()`. Added offline test fixtures and unit tests in `tests/unit/data/raw-schemas.test.ts` (17 tests passing, 0 network calls).
  - Implemented `scripts/data/build-constants.ts` producing `data/constants.json` (75.7 KB): rarity caps (`maxLevel`), EXP thresholds (`characterExpMap`), leveling costs (`characterUpgradeCostMap`), elite promotion LMD (`evolveGoldCost`), skill mastery costs (`masteryCost`), EXP cards (`expItems`), and PRTS battle terms (`termDescriptionDict` with 147 terms and i18n descriptions).
  - Implemented `scripts/data/build-items.ts` producing `data/items.json` (244.0 KB, 848 planner items): classified by table properties into types (`material`: 782, `currency`: 37, `chip`: 16, `chip_pack`: 8, `exp_card`: 4, `catalyst`: 1), with `sortId`, `iconId`, and calculation flags (`canDrop`, `canCraft`, `isModuleToken`).
  - Implemented `scripts/data/build-recipes.ts` producing `data/recipes.json` (100.3 KB, 74 recipes: 66 workshop formulas + 8 factory dualchip formulas) with `extraOutcome` drop chances and costs.
  - Dependency graph and cycle analysis: synthesis material promotion, skill books, building materials, and factory dualchips form a strict DAG with 0 cycles. Workshop chip conversions contain exactly 8 pairwise cycles (3:2 reciprocal conversion between class pairs) verified by tests in `tests/unit/data/recipes.test.ts`.
  - Enriched operator details in `scripts/data/build-operators.ts`: integrated module combat progression (`battle_equip_table`) including stage attribute blackboards, trait/talent candidates, and unlock/upgrade costs. Evaluated 434 operators: 388 have modules (891 total module entries, 503 advanced combat modules, 388 base mission entries).
  - Documented dataset specifications and schemas in `docs/data-formats.md`.
  - Built referential integrity validator `scripts/data/validate-data.ts` (`npm run data:validate`) and integrated it into `.github/workflows/ci.yml`: verified 22,426 item references, 956 skill references, and 891 module references across all 434 operators and recipes with 0 violations.

- Removed language switcher from navigation header (`refactor/remove-nav-lang-switcher`):
  - Removed `<LayoutLanguageSwitcher />` from `app/layouts/default.vue` header actions. English remains the active default locale (`en`).
  - Preserved `LanguageSwitcher.vue` component and unit tests for subsequent integration into the Settings page (`/settings`).
  - Updated E2E tests (`tests/e2e/i18n.spec.ts`) asserting language switcher absence in header and validating direct localized routing (`/ru`).

- Implemented server availability flags, recipe kinds, and pure stats calculation core (`feat/stats-core`):
  - Server availability flags: added `servers: ('cn' | 'global')[]` to `GameItem` and `OperatorModule`. Identified 92 CN-only items (756 Global) and 168 CN-only modules (723 Global). Updated schemas, data builders, and validator.
  - Recipe classification: added `kind: 'synthesis' | 'conversion' | 'manufacture'` to `CraftRecipe`. Validated strict DAG on non-conversion formulas and verified exact 8 reciprocal chip cycles on conversion formulas.
  - Operator Stats Core: created pure calculation engine in `shared/utils/stats/` (`calculateStats.ts`, `types.ts`). Implemented linear interpolation across keyframes, trust scaling (0–100%), potential ranks (1–6), module combat stat bonuses (stages 1–3), and breakdown by sources.
  - Benchmark validation: pinned 5 benchmark operators (SilverAsh, Eyjafjalla, Kal'tsit, Myrtle, Texas) in unit tests matching PRTS / Terra Wiki data.
  - Documented engine and mathematical equations in `docs/stats.md`.

## In progress

- None.

## Next

- Develop leveling EXP & promotion material requirements calculator core in `shared/`.
- Build depot inventory models and craft decomposition tree core in `shared/`.
- Build full operator detail page (`/operators/[id]`).
- Move language switcher to settings page when implementing module `SET-06`.

## Known issues

- None.
