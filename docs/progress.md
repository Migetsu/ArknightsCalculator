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

## In progress

- None (Testing infrastructure and CI setup completed).

## Next

- Configure `@nuxtjs/i18n` with en/ru locales.
- Create design tokens and Arknights SCSS theme.
- Configure Supabase client integration and state management.

## Known issues

- None.
