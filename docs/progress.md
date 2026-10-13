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
  - Dark HUD color palette (`#0c0d10`, `#14161a`, `#1a1d22`), accents (Cyan `#00e5ff`, Amber `#ff9800`, Green `#00e676`, Red `#ff1744`), and 1в…вЂ“6в… operator rarity palette.
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
  - Added responsive breakpoint distribution: 1 column on `< md`, 2 columns on `md`вЂ“`xl`, 3 columns on `xl+`.
  - Enforced `min-width: 0`, `flex-shrink: 0`, and `text-overflow: ellipsis` on panels, operator chips, currency bars, and Drawer Doctor profile card.
- Implemented Playwright console/pageerror defense fixture (`tests/e2e/fixtures.ts`) to fail tests on unhandled errors or missing translation keys.
- Implemented UI consistency foundation and central module architecture:
  - Added Section 13 В«Р•РґРёРЅРѕРѕР±СЂР°Р·РёРµ РёРЅС‚РµСЂС„РµР№СЃР°В» to `AGENTS.md`.
  - Created central typed modules registry `app/config/modules.ts` with `APP_MODULES` (`DSH-00`..`SET-06`), icons, routes, status (`ready` | `soon`), and i18n keys.
  - Refactored `app/layouts/default.vue` navigation drawer to build entirely from `APP_MODULES` without markup duplication.
  - Created layout primitive components in `app/components/ui/`: `AkContainer` (size presets `sm`вЂ“`xl`, responsive padding), `AkGrid` (strict `minmax(0, 1fr)` columns, gap presets, responsive presets `panels`/`stats`/`operators`), and `AkPageHeader` (tactical code tag, title, subtitle, watermark, actions slot). Added them to `app/pages/_ui.vue` showcase.
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
  - Live asset verification: authored `scripts/data/verify-assets.ts` (`npm run data:verify-assets`) testing 60 operators (all rarities 1в…вЂ“6в…, 3 Amiya classes, CN operators). Validated 100% success rate on jsDelivr (avg 165ms) and Statically (avg 740ms) using real HTTP GET byte delivery.
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
  - Operator Stats Core: created pure calculation engine in `shared/utils/stats/` (`calculateStats.ts`, `types.ts`). Implemented linear interpolation across keyframes, trust scaling (0вЂ“100%), potential ranks (1вЂ“6), module combat stat bonuses (stages 1вЂ“3), and breakdown by sources.
  - Benchmark validation: pinned 5 benchmark operators (SilverAsh, Eyjafjalla, Kal'tsit, Myrtle, Texas) in unit tests matching PRTS / Terra Wiki data.
  - Documented engine and mathematical equations in `docs/stats.md`.

### 2026-10-13: Server model change and data freshness audit (`chore/data-freshness-audit`)

- Removed the server switcher and "CN only" badges from the operators catalog and module panel; the catalog lists all operators and ignores `?server=`. `servers` fields in data are untouched.
- Settings: "Default server" replaced by "Drop data server" (CN / Global, default CN, `arkcalc_drop_data_server`); affects only future farming pages (Penguin Stats US/CN).
- Freshness audit (no data changes): EN repo is ~47.7 weeks behind (last commit 2025-11-13), CN repo ~0.7 weeks. 35 of 411 Global operators lack EN text. Details in `docs/data-sources.md` ("Freshness audit").
- Deviation recorded in `docs/design/DEVIATIONS.md` (no server switcher).

## In progress

- Implemented rich text parser, blackboard interpolation, and accessible AkRichText component (`feat/rich-text`):
  - Audited full game dataset across 29,324 active descriptions in `data/operators/*.json` via `scripts/data/scan-rich-text.ts`. Documented all 5 highlight tags (`ba.vup`, `ba.rem`, `ba.talpu`, `ba.kw`, `ba.vdown`), 60 unique battle term tags (100% matched against `constants.json`), and placeholder formats in `docs/rich-text.md`.
  - Authored pure, zero-HTML parser `shared/utils/richText/` with typed AST schema (`RichTextNode`, `text`, `break`, `highlight`, `term`):
    - Blackboard interpolation (`resolveBlackboardValue`) with formatters (`0%`, `0.0%`, `0`, `0.0`, default raw).
    - Resilient parser handling unclosed tags, nested markup, unknown tags/keys (graceful fallback with console warning), and literal angle brackets (`<Substitute>`, `<ж›їиє«>`).
  - Authored accessible UI component `AkRichText.vue` (`app/components/ui/AkRichText.vue`) rendering AST nodes without `v-html`:
    - Themed highlights with Arknights tactical colors (Cyan, Red, Amber, Green, Gold).
    - Accessible popover for terms: `role="button"`, `tabindex="0"`, `aria-expanded`, keyboard support (`Enter`, `Space`, `Escape`), touch/click toggle, and outside click dismiss.
  - Added rich text showcase section to `app/pages/_ui.vue` demonstrating skill interpolations, tactical terms, and nested highlights.
- Audited operator stats calculation benchmarks, boundary validation, and attack speed interval scaling (`chore/stats-audit`):
  - Audited benchmarks for SilverAsh, Eyjafjalla, Kal'tsit, Myrtle, and Texas against live reference databases (PRTS Wiki and Fandom Arknights Wiki) on 2026-10-12 with cited URLs and verified breakdowns.
  - Documented trust scaling to favorKeyFrames (0-100% attribute bonuses) and elite promotion limits by operator rarity (1в…-2в… max E0, 3в… max E1, 4в…-6в… max E2).
  - Enforced strict validation: out-of-range levels or unavailable elite promotions throw explicit descriptive errors instead of silent clamping.
  - Implemented Attack Speed (ASPD) modifier parsing from potentials (`ASPD +X`, `Attack Speed +X`, `ж”»е‡»йЂџеє¦+X`) and modules (`stStats.attack_speed`), calculating effective attack interval `(baseAttackTime * 100) / (100 + totalAttackSpeed)`.
  - Added unit test cases for 1в… and 3в… phase boundaries, level validation, ASPD modifiers, and effective attack intervals.
  - Updated `docs/stats.md` with complete audit table, URL citations, and formulas.

- Implemented comprehensive operator detail page and lazy per-operator chunk architecture (`feat/operator-detail`):
  - Isomorphic lazy operator loader `useOperatorDetail` via dynamic imports (`data/operators/${id}.json`) and Nuxt `useAsyncData`, ensuring 0 KB bundle bloat for unvisited operators.
  - Full operator page `/operators/[id]` with SSR/prerender SEO, Schema.org `Person` entity metadata, and all 434 operator paths in EN (`/operators/[id]`) and RU (`/ru/operators/[id]`) included in sitemap.
  - UI components built strictly with BEM kebab-case without Nuxt UI:
    - `AkOperatorPortrait`: responsive artwork frame with E0/E1 vs E2 variant switching and multi-CDN fallback.
    - `AkOperatorStatsPanel`: interactive controls (elite capped by rarity, level slider/input, trust 0-100%, potentials 1-6, module stages 1-3), full stats table with calculated HP/ATK/DEF/RES/Cost/Block/ASPD and breakdown badges.
    - `AkOperatorSkillsPanel`: interactive levels 1-7 and Masteries M1-M3, SP recovery badges, duration telemetry, and descriptions rendered via `AkRichText` with blackboard interpolation.
    - `AkOperatorTalentsPanel`: talent candidate progression with elite/potential unlock condition badges and descriptions via `AkRichText`.
    - `AkOperatorModulesPanel`: stages 1-3 selector, trait/talent stat and text upgrades via `AkRichText`, and material unlock costs with `AkAvatar`.
    - `AkOperatorInfoPanel`: tactical personnel dossier grid (illustrator, VA, code, faction, tags, lore assignment & profile notes).
  - Bidirectional URL query synchronization (`tab`, `elite`, `level`, `trust`, `pot`, `mod`, `stage`), allowing direct bookmarking and link sharing without reloading.
  - Amber banner notification for CN-exclusive operators (`servers: ['cn']`).
  - Tactical empty state 404 with back-to-catalog button for unknown IDs.
  - Fixed client hydration timing via lifecycle hooks in `app/plugins/hydration.client.ts`.
  - Implemented full Arknights PRTS Terminal HUD dark theme overhaul across all pages and components (`feat/arknights-design-overhaul`):
  - Refactored core styling and design tokens (`_tokens.scss`, `_mixins.scss`, `_reset.scss`):
    - Dark tactical PRTS palette: deep base (`#08090c`), surface (`#101217`), elevated panels (`#16181f`), card background (`#12141a`), high-contrast borders (`#262b35`), muted text (`#758092`).
    - Neon tactical accents with subtle glow effects: Cyan (`#00f0ff`), Amber (`#f39000`), Green (`#00e676`), Red (`#ff2a4d`), Gold (`#ffd54f`).
    - Authentic Rhodes Island styling mixins: `@mixin hazard-stripes`, `@mixin neon-glow`, `@mixin tech-scrollbar`, cut-corner Chamfer clips on buttons, chips, panels, modals, and avatar badges.
    - Vector HUD grid and radial dark vignette background in pure CSS.
  - Complete tactical overhaul of base UI primitives in `app/components/ui/` (no Nuxt UI):
    - `AkButton`: Chamfer cut-corners (4px/6px), tactile active response, `warning` amber variant, glowing hover border.
    - `AkPanel`: Corner reticle brackets `::before`/`::after` (`[ + ]`), custom colored indicator lines (`lineColor`), technical header tags.
    - `AkBadge`: 4px cut-corner polygon, glowing dot indicators (`dot` prop).
    - `AkTabs`: Rhodes Island personnel dossier tab design with Chamfer cut-corner tab heads and neon indicator lines.
    - `AkInput`: Cut-corner technical input box with neon cyan focus ring and prefix/suffix slots.
    - `AkPageHeader`: PRTS terminal page header with technical mark `в–  `, code tags, watermarks, and neon cyan 64px indicator bar.
    - `AkStat`: Digital instrument tile with gradient surface, cut corner, and glowing technical monospace metrics.
    - `AkAlert`: Hazard-striped tactical status box with Chamfer clip and badge slot.
    - `AkProgress`: High-tech segmented progress bar with neon track glow.
    - `AkEmptyState`: PRTS targeting reticle icon with crosshair indicators and technical monospace subtitles.
    - `AkModal`: Tactical window overlay with Chamfer clip, header strip, and keyboard accessibility.
    - `AkDrawer`: Tactical navigation drawer with PRTS kernel status badge and cut-corner menu items.
  - Redesigned shell and layout (`app/layouts/default.vue`):
    - Top 2px neon cyan indicator rail, PRTS logo badge, online Doctor status chip (`SYS // OK`).
    - Redesigned `SyncAccountModal` with Chamfer-clipped region selector buttons and warning banners.
  - Overhauled all application pages and views:
    - Dashboard (`app/pages/index.vue`): PRTS telemetry header, cut-corner banner cards, countdown tiles with glowing amber digits, and tactical currency bars.
    - Operators catalog (`app/pages/operators/index.vue`): Chamfer-clipped filter panel, cut-corner class/rarity chips, tactical operator cards with rarity stars and cut-corner frames, animated skeleton placeholders.
    - Operator detail (`app/pages/operators/[id].vue` and all panels): cut-corner portrait frame with E0/E2 switcher, Chamfer-clipped stats/skill/talent/module cards, rich text tags styled with tactical neon highlights.
    - Feature stubs (`depot.vue`, `gacha.vue`, `planner.vue`, `recruit.vue`, `settings.vue`): Chamfer-clipped 12px panels with pulsing PRTS radar loaders.
    - Design showcase (`app/pages/_ui.vue`): updated with warning button variant and all refreshed components.
  - Verified 100% test passing: 171 Vitest unit tests, 104 Playwright E2E tests, zero ESLint/Stylelint warnings, and clean production build.

- Audited operator detail page and removed test-only runtime artifact (`chore/audit-detail-page`):
  - Verified benchmarks for all 5 reference operators (SilverAsh, Eyjafjalla, Kal'tsit, Myrtle, Texas) via live web requests in the current session against Fandom, Gamewith, and PRTS Wiki databases with 100% agreement.
  - Measured mobile performance profile on `/operators/char_172_svrash` (FCP 168ms, LCP 1080ms, TBT 0ms) and `/operators/char_151_myrtle` (FCP 168ms, LCP 168ms, TBT 0ms).
  - Removed `app/plugins/hydration.client.ts` which injected a test-only `data-hydrated="true"` DOM attribute; migrated test waiting logic in `tests/e2e/fixtures.ts` to standard public DOM readiness checks (`#__nuxt` selector and `domcontentloaded` state).
  - Created `docs/known-issues.md` to track non-blocking deferred items per `AGENTS.md`.

- Component-level stats audit and chunk telemetry audit (`chore/audit-fixes`):
  - Completed component-by-component live audit for all 5 reference operators (SilverAsh, Eyjafjalla, Kal'tsit, Myrtle, Texas) against `arknights.wiki.gg` and `prts.wiki` (checked 2026-10-12): base stats on level/phase, Trust 100%, Potentials 1вЂ“6, and Module Stage 3.
  - Documented full component breakdown table in `docs/stats.md`, showing how the calculation engine dynamically sums verified parts into total stats.
  - Clarified subclass module abbreviations (`uniequip_table.json` and `battle_equip_table.json`): `SOL` (Soldier/Pioneer Vanguard, e.g. Texas `SOL-Y`), `BEA` (Bearer/Standard Bearer, e.g. Myrtle `BEA-X`), `LOR` (Lord Guard, e.g. SilverAsh `LOR-X`), `CCR` (Core Caster, e.g. Eyjafjalla `CCR-X`/`CCR-Y`), `PHY` (Physician Medic, e.g. Kal'tsit `PHY-X`).
  - Audited operator chunk transfer and bundle telemetry: client-side chunks (`BpdH-CFf.js` for SilverAsh, `D7HbWlUc.js` for Myrtle, `BNpv6iik.js` for Logos) compress to 6вЂ“13 KB over the wire via Vite tree-shaking, compared to 40вЂ“88 KB raw JSON.
  - Verified simulated mobile network profile (Fast 3G/Slow 4G + CPU 4x): FCP ~1.9s, DomContentLoaded ~2.1s on warm navigation, 0 script leaks.

- Leveling EXP & promotion material requirements planner core (`feat/planner-core`):
  - Created pure TypeScript planner core in `shared/utils/planner/`:
    - `types.ts`: typed models & Zod schemas (`OperatorState`, `CostCategoryBreakdown`, `CalculatedCost`, `ExpCardPlan`).
    - `calculateCost.ts`: computes exact required LMD, EXP, and items across Elite promotions (with in-game level reset to 1), common skill ranks (1-7), skill masteries (M1-M3), and module stages (0-3).
    - `planExpCards.ts`: optimal battle record card converter (Strategic, Tactical, Frontline, Drill) with `min_cards` greedy algorithm and `min_waste` bounded search.
    - `sumCosts.ts`: aggregated cost calculator for combining multi-operator rosters.
  - Documented complete architecture, formulas, and verified benchmarks in `docs/planner.md`.
  - Added 15 comprehensive unit tests in `tests/unit/shared/planner/planner.test.ts` verifying boundary validation, zero cost on identical states, arithmetic benchmarks (e.g. 6* SilverAsh E0L1->E2L90 = 1,111,400 EXP and 1,334,796 LMD), monotonicity, and additivity.

- Design Foundation: Ember Editorial direction C implementation (`feat/design-foundation`):
  - Self-hosted typography via `@nuxt/fonts`: configured `Unbounded` (500, 800) and `Golos Text` (400, 600) with full Latin & Cyrillic character subsets, font-display swap, removing Exo 2, Inter, and JetBrains Mono.
  - Replaced design tokens (`_tokens.scss`) with authentic Ember Editorial palette:
    - Page background `#0e0a09` with radial glow `radial-gradient(ellipse at 80% 0, #2a1510 0, #0e0a09 55%)`.
    - Surface `#17110f` (`.pn`), deep input/cell surface `#0e0a09`, borders (`rgba(232,221,211,.08)`, `.12`, `.18`).
    - Primary Ember accent `#ff6a3d`, Ember light `#ff8a5c`, Amber `#ff9d2b` (6в…, warnings), Success `#8fd19e`, Gold accent text `#ffd9a8`.
    - Flat 0вЂ“2px shapes, removed legacy `clip-path` (chamfer/cut-corner) and skew transforms.
  - Rewrote UI primitives in `app/components/ui/` to match HTML mockups:
    - `AkButton`: variants `primary` (Ember fill with dark text), `outline`, `gold-outline`, `danger`, `ghost`.
    - `AkPanel`: clean `.pn` surface without reticle corners.
    - `AkBadge`: flat border badges with rarity colors.
    - `AkStat`: 32px `Unbounded` 800 value + uppercase `Golos Text` label.
    - `AkTabs`: `buttons` (Ember active fill) and `underline` variants with full WAI-ARIA keyboard support.
    - `AkInput`: deep background `#0e0a09` with subtle border and gold focus outline.
    - `AkProgress`: Ember progress bar without borders.
    - `AkAlert`: Amber warning background and borders per DESIGN.md.
    - `AkEmptyState`: dashed border state per DESIGN.md.
    - `AkModal`: 4px Ember left accent bar with clean dialog panel and focus trap.
    - `AkDrawer`: dark panel with accessible navigation.
  - Added new design system components:
    - `AkChip`: toggleable tag buttons (active Ember `#ff6a3d`).
    - `AkSegmented`: segmented control buttons (language, server switchers).
    - `AkStepper`: numeric stepper with `в€’` and `+` buttons, hidden native spinners, keyboard `ArrowUp`/`ArrowDown` support, and accessible focus.
  - Updated showcase page `app/pages/_ui.vue` with all primitives and live interactive demonstrations.
  - Added unit test suites for `AkChip`, `AkSegmented`, `AkStepper` (30 test files, 198 Vitest tests passing).
  - Validated zero horizontal scroll across all breakpoints (360px up to 1920px) on EN and RU across all routes (72/72 passing).
  - Captured responsive Playwright screenshots on 360px and 1440px viewports (`test-results/ui-showcase-360.png`, `test-results/ui-showcase-1440.png`).
  - All 104 Playwright E2E tests, Stylelint, ESLint, TypeScript, i18n checks passing.

- Design System Icons & Asset Verification (`feat/design-icons`):
  - Pre-step:
    - Realigned rarity tokens strictly to `docs/design/DESIGN.md`: 6в… `#ff9d2b`, 5в… `#ffd54f`, 4в… `#9b6bd6`, 3в… `#6fa3e0`, 2в… `#7fc48a`, 1в… `#8a8a8a`. Ember `#ff6a3d` reserved exclusively for primary action, active state, selected chips, sliders, and progress.
    - Replaced cyan `#2bd4b8` with design mockup tokens.
    - Created `docs/design/DEVIATIONS.md` documenting differences between HTML mockups and project tokens.
    - Added `docs/screenshots/*` to `.gitignore` and removed screenshots from git tracking.
    - Documented all components using temporary no-op mixins in `docs/known-issues.md`.
  - Icon components & asset resolution:
    - Updated `AkAvatar`: supported sizes 44, 48, 52, 56, 64, 84px with 3px rarity underline, initials fallback, and explicit dimensions preventing CLS.
    - Implemented `AkItemIcon`: tier borders (T1вЂ“T5), count badge, fallback state, and custom sizes.
    - Implemented `AkSkillIcon`: circular 48px badge with gold border, skill rank (1вЂ“7) or mastery badge (M1вЂ“M3), and fallback state.
    - Implemented `AkModuleIcon`: diamond shape with ember border, module stage badge (1вЂ“3), and fallback state.
    - Extended `resolveAsset` to support `item` (with `iconId`), `skill` (with `iconId` and `skill_icon_` prefix), and `equip` (mapped to Aceship Arknight-Images repository with initial badge mapping).
    - Executed live CDN audit of 61 items, 60 skills, and 60 modules via `scripts/data/verify-new-assets.ts`: 100.0% availability on both jsDelivr and Statically CDNs; recorded in `data/new-assets-verification-report.json` and documented in `docs/assets.md`.
    - Added comprehensive unit test suites: `AkAvatar.test.ts` (7 tests), `AkItemIcon.test.ts` (7 tests), `AkSkillIcon.test.ts` (5 tests), `AkModuleIcon.test.ts` (5 tests), and updated `resolveAsset.test.ts` (12 tests) вЂ” 33 files, 218 Vitest tests passing.
    - Updated `app/pages/_ui.vue` showcase with live interactive demonstrations of avatar sizes, items, skills, and modules.

- Design System Shell & Navigation Foundation (`feat/design-shell`):
  - Pre-step:
    - Item tiers T1вЂ“T5: added dedicated SCSS tokens in `_tokens.scss` (`T1 #8a8a8a, T2 #7fc48a, T3 #6fa3e0, T4 #a97be0, T5 #e0b44a`) per `docs/design/DESIGN.md`, decoupled from operator rarity tokens; connected to `AkItemIcon`.
    - Icons: aligned `AkSkillIcon` (2px solid `#ffd9a8` border) and `AkModuleIcon` (48px diamond, solid `#ff6a3d` border) with `planner.html` mockups.
    - Executed full repository git-tree audit across all 848 items, 900 skills, and 891 modules via `scripts/data/build-asset-manifest.ts`:
      - Items: 848/848 (100.0%, 0 missing on `yuanyan3060/ArknightsGameResource`).
      - Skills: 900/900 (100.0%, 0 missing on `yuanyan3060/ArknightsGameResource`).
      - Modules: connected fallback upstream repository `fexli/ArknightsResource` to cover 259 modules added after Aceship commit 01.05.2024, achieving 891/891 (100.0%) total coverage.
      - Saved manifest to `data/asset-manifest.json` (`source: 'tree'`) and updated `docs/assets.md`.
  - Application Shell & Settings (`feat/design-shell`):
    - `AkHeader`: logo `ARKCALC`, desktop horizontal navigation from `app/config/modules.ts`, dedicated right link to `Settings`, mobile drawer with focus trap, removed language switcher from header.
    - Layout: updated `app/layouts/default.vue` to use `AkHeader` and Ember Editorial radial gradient background with footer disclaimer.
    - Settings page (`/settings`, module `SET-06`, status `ready`):
      - Language switcher: English / Р СѓСЃСЃРєРёР№ with cookie and URL persistence.
      - Default server: Global / CN selector persisted via `useSettingsStore` (`useLocalStorage('arkcalc_default_server', 'global')`) influencing operator catalog defaults.
      - Account & Local Data: UI stubs for account sync, export JSON backup, import backup, and reset local data.
      - Game data version: dynamic telemetry display from `data/meta.json` (commit hash, build date, total/global/CN operator counts).
      - About: project disclaimer and link to open-source repository.
    - `SyncAccountModal`: styled according to `sync-modal.html` with 4px left Ember accent bar, unofficial login advisory alert, tabbed navigation (Yostar email code / Import JSON / Demo data), server selector buttons (EN/JP/KR/CN), and 6-digit verification code input.
    - Dashboard page (`/`): styled according to `dashboard.html` with hero banner (`radial-gradient`), 4 metric cards (`PULLS`, `SPARK`, `ACTIVE PLANS`, `SERVER`), and two columns (`Next headhunting` with countdown timer, `Your plans` with empty state).
    - Testing & Quality:
      - Added unit tests: `tests/unit/stores/settings.test.ts`, `tests/unit/components/ui/AkHeader.test.ts`, `tests/unit/pages/settings.test.ts`. Total 35 test files, 223 Vitest tests passing.
      - Updated E2E tests: `tests/e2e/i18n.spec.ts` (language change verified via `/settings`), `tests/e2e/layout-sanity.spec.ts` (all 14 routes and 5 viewports passing, 0 horizontal overflow), `tests/e2e/responsive.spec.ts`, `tests/e2e/smoke.spec.ts`. All 105 Playwright tests passing.
      - Verified `lint`, `stylelint`, `format:check`, `typecheck`, `i18n:check`, `data:validate`, `test`, `test:e2e`, and `build`.

- Operators Catalog & Detail Page Redesign (`feat/design-operators`):
  - Pre-step (`fix: header nav and registry per design spec`):
    - Added Farming module (`FRM-07`, `/farming`, status `soon`) in `app/config/modules.ts` with strict mockup order: Home, Operators, Planner, Depot, Farming, Recruit, Gacha, Settings.
    - Added short i18n keys `nav.home`, `nav.operators`, `nav.planner`, `nav.depot`, `nav.farming`, `nav.recruit`, `nav.gacha`, `nav.settings` in `en.json` and `ru.json`.
    - Removed "Coming soon" badge from desktop header (dimmed link color); badge preserved in mobile drawer and farming stub page.
    - Header right group: aligned `Settings` link and `Sync` button in one line (`height: 36px`, `gap: 16px`, `align-items: center`), zero text shift on active/hover. Verified with Playwright screenshots on 1440px, 1024px, and 360px drawer.
    - Upstream assets: pinned git tree commit SHAs for all 3 resource repositories in `scripts/data/sources.config.ts`, documented in `docs/assets.md` with dates and licenses, created asset mirroring tool `scripts/data/mirror-assets.ts`.
  - Operator Catalog (`/operators`):
    - Redesigned card `AkOperatorCard.vue` based on `operators.html`: 250px vertical portrait art (`resolveAsset('portrait')` with avatar fallback), rarity radial gradient, bold operator name, code badge, and 3px bottom rarity color line.
    - Added mockup-spec dashed "Show more" tile in operator grid (`AkGrid`), infinite scroll sentinel, and reactive count.
    - Redesigned `AkOperatorFilters.vue`: `AkChip` class chips, rarity filter, search field, server toggle (`Global` / `CN All`), and sort selector.
    - Responsive states: loading skeletons, empty state, and error alert.
  - Operator Detail Page (`/operators/[id]`):
    - Redesigned according to `operator-detail.html`:
      - Hero section: warm radial gradient background, Back to list button, tactical uppercase meta string (`6в… GUARD / LORD / KARLAN`), large operator heading (up to 68px clamp), and full portrait with E0/E1 vs E2 variant selector.
      - Key stats section: overlapping top card with large `Unbounded 800` figures for HP, ATK (ember highlight), DEF, and RES calculated reactively via calculation core.
      - Interactive tabs (`AkTabs`): Stats, Skills, Talents, Modules, Info.
      - Panel integration: `AkOperatorSkillsPanel.vue` (using `AkSkillIcon` and `AkItemIcon`), `AkOperatorModulesPanel.vue` (using `AkModuleIcon` and `AkItemIcon`), `AkOperatorTalentsPanel.vue`, `AkOperatorInfoPanel.vue`, `AkOperatorStatsPanel.vue` with sliders/steppers.
      - CN exclusive banner notice for CN-only operators.
  - Mixin Cleanup:
    - Permanently eliminated obsolete no-op mixins (`cut-corner`, `focus-ring-clipped`, `hazard-stripes`, `neon-glow`) from `_mixins.scss` and all component usages.
  - Performance & Visual Audit:
    - Captured Playwright screenshots across 16 combinations (360, 768, 1440, 1920 viewports in EN and RU) for both `/operators` and `/operators/char_172_svrash` in `docs/screenshots/`.
    - Slow 4G + 4x CPU slowdown metrics recorded in `docs/metrics-operators.json`:
      - `/operators`: LCP 0ms, TBT 0ms, script size 3.39 MB.
      - `/operators/char_172_svrash`: LCP 0ms, TBT 0ms, script size 6.16 MB.
  - Quality verification:
    - 226 Vitest unit tests passing (100%).
    - 123 Playwright E2E tests passing (100%).
    - `lint`, `stylelint`, `format:check`, `typecheck`, `i18n:check`, `data:validate`, `build` all clean (0 errors).

### 2026-10-13: Server model change and data freshness audit (`chore/data-freshness-audit`)

- Removed the server switcher and "CN only" badges from the operators catalog and module panel; the catalog lists all operators and ignores `?server=`. `servers` fields in data are untouched.
- Settings: "Default server" replaced by "Drop data server" (CN / Global, default CN, `arkcalc_drop_data_server`); affects only future farming pages (Penguin Stats US/CN).
- Freshness audit (no data changes): EN repo is ~47.7 weeks behind (last commit 2025-11-13), CN repo ~0.7 weeks. 35 of 411 Global operators lack EN text. Details in `docs/data-sources.md` ("Freshness audit").
- Deviation recorded in `docs/design/DEVIATIONS.md` (no server switcher).

## In progress

- None.

## Next

- Module `PLN-02`: Operator planner store & target state persistence via Pinia.
- Module `DEP-01`: Depot inventory management & craft tree decomposition core.

## Known issues

- Tracked in `docs/known-issues.md`.
